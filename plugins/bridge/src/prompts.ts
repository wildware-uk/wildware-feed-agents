/**
 * Permission prompts, questions and refusals, on the dashboard as well as the terminal.
 *
 *   feed.mjs prompt   the PermissionRequest hook: asks the owner on the dashboard, and answers
 *                     Claude Code with their decision
 *   feed.mjs refused  the Stop, SubagentStop and PermissionDenied hooks: posts one low-priority
 *                     card listing the tool calls that were refused, collapsing repeats
 *
 * What Claude Code does, checked by running it (2.1.x):
 *
 * - The PermissionRequest hook runs BESIDE the terminal's dialog, not before it. Whichever
 *   answers first wins: a decision from the hook closes the dialog, and an answer at the
 *   terminal lets the tool run while the hook is still waiting. The hook is not killed or
 *   told when the terminal answers; it learns from the transcript, where the call's
 *   tool_result appears once anyone has decided.
 * - No output means no decision: the dialog stays up. So a timeout, a dismissal or any
 *   error here leaves the call to the terminal. Nothing here ever allows on its own.
 * - AskUserQuestion takes its answers from the hook: allow, with `updatedInput` carrying
 *   `answers` keyed by question text, each the chosen label (several joined by ", ").
 * - "Allow always" is the hook echoing the `addRules` suggestions Claude Code offered.
 * - A refusal by a permission rule, by a PreToolUse hook or at the terminal fires no hook
 *   of its own: it shows only as an error tool_result in the transcript, which `refused`
 *   reads at the end of each turn. An auto-mode refusal fires PermissionDenied.
 */
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { origin } from './pair';
import { describeCall, redact, truncate } from './redact';

/** What a hook reads on stdin: the fields this file uses. */
export type HookInput = {
	session_id?: string;
	transcript_path?: string;
	agent_transcript_path?: string;
	cwd?: string;
	hook_event_name?: string;
	tool_name?: string;
	tool_input?: Record<string, unknown>;
	tool_use_id?: string;
	permission_suggestions?: Suggestion[];
	reason?: string;
};

/** One of Claude Code's suggested permission updates. */
export type Suggestion = { type?: string; behavior?: string; destination?: string; rules?: { toolName?: string; ruleContent?: string }[] };

/** Where to ask, and as whom. */
export type Dashboard = { url: string; token: string; agent: string | null };

export type Io = {
	fetch?: typeof globalThis.fetch;
	now?: () => number;
	/** Waits [ms], or less when [signal] aborts. */
	sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
	log?: (line: string) => void;
};

/** How long the owner has to answer on the dashboard before it is left to the terminal. */
export const WAIT_MS = 15 * 60_000;
/** How long the terminal has to answer before the dashboard is asked at all. */
export const GRACE_MS = 5_000;
/** How often the transcript is read for an answer given at the terminal. */
export const WATCH_MS = 1_500;
/** How long one refusals card keeps collecting before the next refusal starts a new one. */
export const CARD_FOR_MS = 30 * 60_000;
/** The most lines a refusals card lists. */
const CARD_LINES = 12;
/** What the hook tells Claude when the owner refused on the dashboard. Also how `refused` knows one. */
export const DENIED_ON_DASHBOARD = 'Your owner refused this on the Wildware Feed dashboard.';

/** Whether prompts go to the dashboard: on unless the `prompts` option (or AGENT_DASHBOARD_PROMPTS) is off. */
export function promptsOn(env: NodeJS.ProcessEnv): boolean {
	const value = env.CLAUDE_PLUGIN_OPTION_PROMPTS?.trim() || env.AGENT_DASHBOARD_PROMPTS?.trim() || 'auto';
	return value.toLowerCase() !== 'off';
}

// ---------- the dashboard ----------

export class DashboardError extends Error {}

/** One MCP tool call over HTTP: its structured result, or a DashboardError that holds no token. */
export async function callTool(d: Dashboard, name: string, args: Record<string, unknown>, io: Io = {}, signal?: AbortSignal): Promise<Record<string, unknown>> {
	let response: Response;
	try {
		response = await (io.fetch ?? globalThis.fetch)(`${origin(d.url)}/mcp`, {
			method: 'POST',
			// The token never follows a redirect.
			redirect: 'error',
			signal,
			headers: { Authorization: `Bearer ${d.token}`, Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' },
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
		});
	} catch (e) {
		if (signal?.aborted) throw e;
		throw new DashboardError(`${name}: the dashboard could not be reached`);
	}
	if (!response.ok) throw new DashboardError(`${name}: the dashboard said ${response.status}`);
	let body: { result?: { structuredContent?: Record<string, unknown>; isError?: boolean; content?: { text?: string }[] }; error?: { message?: string } };
	try {
		body = (await response.json()) ?? {};
	} catch {
		throw new DashboardError(`${name}: the dashboard gave an answer that is not JSON`);
	}
	if (body.error) throw new DashboardError(`${name}: ${body.error.message ?? 'refused'}`);
	const result = body.result ?? {};
	let data = result.structuredContent;
	if (!data) {
		try {
			data = JSON.parse(result.content?.[0]?.text ?? '{}');
		} catch {
			data = {};
		}
	}
	if (result.isError) throw new DashboardError(`${name}: ${typeof data?.message === 'string' ? data.message : 'refused'}`);
	return data ?? {};
}

type RequestState = { state?: string; request_id?: string; response?: { kind?: string; value?: unknown }; answered_by?: { user_id?: unknown; name?: unknown }; author?: unknown; poll_after_ms?: number };

/**
 * Whether [r] is an answer a person gave. Only "answered" is: "timeout", "cancelled" and
 * "withdrawn" mean nobody decided, and an answer recorded as anyone's but a human's is not
 * the owner's.
 */
export function answeredByHuman(r: RequestState): boolean {
	if (r.state !== 'answered' || !r.response) return false;
	if (typeof r.author === 'string' && r.author !== 'human') return false;
	if (r.answered_by && typeof r.answered_by.user_id === 'string' && r.answered_by.user_id.startsWith('agent')) return false;
	return true;
}

/** What request_input is asked. */
export type Ask = { kind: 'buttons' | 'choice' | 'multi_choice'; question: string; detail: string; options: string[]; min?: number };

export type AskOptions = {
	/** True once someone has answered at the terminal: the dashboard's questions are taken down. */
	decided: () => boolean;
	waitMs?: number;
	graceMs?: number;
	channel?: string | null;
};

const defaultSleep = (ms: number, signal?: AbortSignal) =>
	new Promise<void>((done) => {
		if (signal?.aborted) return done();
		const timer = setTimeout(done, ms);
		signal?.addEventListener('abort', () => (clearTimeout(timer), done()), { once: true });
	});

/**
 * Asks every question in [asks] at once and waits for them all. Returns the answers in
 * order, or null when any one of them was not answered by a person in time, or the
 * terminal answered first. Either way nothing it asked is left up on the dashboard.
 */
export async function ask(d: Dashboard, asks: Ask[], options: AskOptions, io: Io = {}): Promise<{ values: unknown[]; by: string | null } | null> {
	const now = io.now ?? Date.now;
	const sleep = io.sleep ?? defaultSleep;
	const waitMs = options.waitMs ?? WAIT_MS;
	const started = now();

	// A prompt answered at the terminal in the first seconds never reaches the phone.
	const graceEnds = started + (options.graceMs ?? GRACE_MS);
	while (now() < graceEnds) {
		if (options.decided()) return null;
		await sleep(Math.min(WATCH_MS, graceEnds - now()));
	}
	if (options.decided()) return null;

	const deadline = now() + waitMs;
	const timeout_s = Math.max(5, Math.min(86_400, Math.ceil(waitMs / 1000)));
	const open: (string | null)[] = asks.map(() => null);
	const results: RequestState[] = [];
	const controller = new AbortController();

	const takeDown = async () => {
		controller.abort();
		for (const id of open) {
			if (!id) continue;
			try {
				await callTool(d, 'withdraw_request', { request_id: id }, io);
			} catch {
				// Already answered, dismissed or timed out: nothing is left up either way.
			}
		}
	};

	try {
		for (const a of asks) {
			const args: Record<string, unknown> = { kind: a.kind, question: a.question, detail: a.detail, options: a.options, timeout_s, priority: 'high' };
			if (a.min !== undefined) args.min = a.min;
			if (options.channel) args.channel = options.channel;
			const r = (await callTool(d, 'request_input', args, io)) as RequestState;
			results.push(r);
			if (r.state === 'pending' && typeof r.request_id === 'string') open[results.length - 1] = r.request_id;
			else if (!answeredByHuman(r)) {
				await takeDown();
				return null;
			}
		}
	} catch (e) {
		io.log?.(e instanceof Error ? e.message : 'request_input failed');
		await takeDown();
		return null;
	}

	const waits = results.map(async (first, i) => {
		let r = first;
		while (r.state === 'pending' && !controller.signal.aborted) {
			const asked = now();
			try {
				r = (await callTool(d, 'await_request', { request_id: open[i] }, io, controller.signal)) as RequestState;
			} catch (e) {
				if (controller.signal.aborted) return r;
				io.log?.(e instanceof Error ? e.message : 'await_request failed');
				// One failed call is not the end of the wait: the dashboard may be restarting.
				await sleep(5_000, controller.signal);
				continue;
			}
			if (r.state === 'pending' && now() - asked < 2_000) await sleep(Math.min(Math.max(r.poll_after_ms ?? 1_000, 500), 10_000), controller.signal);
		}
		if (r.state !== 'pending') open[i] = null;
		results[i] = r;
		// One question not answered by a person ends them all.
		if (!answeredByHuman(r)) controller.abort();
		return r;
	});

	const watcher = (async () => {
		while (!controller.signal.aborted) {
			if (options.decided() || now() >= deadline) return 'stop';
			await sleep(WATCH_MS, controller.signal);
		}
		return 'done';
	})();

	const first = await Promise.race([Promise.all(waits).then(() => 'answered' as const), watcher]);
	if (first === 'stop' || !results.every(answeredByHuman)) {
		await takeDown();
		await Promise.allSettled(waits);
		return null;
	}
	controller.abort();
	const by = results.map((r) => (typeof r.answered_by?.name === 'string' ? r.answered_by.name : null)).find((n) => n) ?? null;
	return { values: results.map((r) => r.response!.value), by };
}

// ---------- the transcript ----------

/** JSON with its keys sorted, so two copies of one tool input compare equal. */
export function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, v]) => v !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
		return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
	}
	return JSON.stringify(value) ?? 'null';
}

/** How much of a transcript's end is read the first time: the call in question is near it. */
const TAIL_BYTES = 4 * 1024 * 1024;

type Block = { type?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; content?: unknown; is_error?: boolean };
type Entry = { type?: string; timestamp?: string; message?: { content?: unknown }; toolUseResult?: unknown };

/** Reads a growing JSONL file from where it was last read, a whole line at a time. */
export class Tail {
	private offset: number | null;
	private partial = '';

	constructor(
		readonly path: string,
		offset: number | null = null
	) {
		this.offset = offset;
	}

	get position(): number {
		return this.offset ?? 0;
	}

	/** The entries written since the last call. The first call starts near the end. */
	read(): Entry[] {
		let size: number;
		try {
			size = statSync(this.path).size;
		} catch {
			return [];
		}
		let skipFirst = false;
		if (this.offset === null || this.offset > size) {
			this.offset = Math.max(0, size - TAIL_BYTES);
			skipFirst = this.offset > 0;
			this.partial = '';
		}
		if (size === this.offset) return [];
		const fd = openSync(this.path, 'r');
		let text: string;
		try {
			const buffer = Buffer.alloc(size - this.offset);
			readSync(fd, buffer, 0, buffer.length, this.offset);
			text = this.partial + buffer.toString('utf8');
		} finally {
			closeSync(fd);
		}
		this.offset = size;
		const lines = text.split('\n');
		this.partial = lines.pop() ?? '';
		if (skipFirst) lines.shift();
		const out: Entry[] = [];
		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				out.push(JSON.parse(line) as Entry);
			} catch {
				// A line cut by a crash; the rest of the file is still good.
			}
		}
		return out;
	}
}

function blocks(entry: Entry): Block[] {
	const content = entry.message?.content;
	return Array.isArray(content) ? (content as Block[]) : [];
}

/** The transcripts a call may be in: the session's, a subagent's given by the hook, and the session's subagents. */
export function transcriptsFor(input: HookInput): string[] {
	const paths = new Set<string>();
	if (input.agent_transcript_path) paths.add(input.agent_transcript_path);
	if (input.transcript_path) {
		paths.add(input.transcript_path);
		const sub = join(input.transcript_path.replace(/\.jsonl$/, ''), 'subagents');
		try {
			for (const f of readdirSync(sub)) if (f.endsWith('.jsonl')) paths.add(join(sub, f));
		} catch {
			// No subagents yet.
		}
	}
	return [...paths];
}

/**
 * Watches the transcripts for the tool call a PermissionRequest is about, and says when it
 * has been decided elsewhere: its tool_result has appeared, so the terminal (or another
 * hook) answered. The call is the newest tool_use with the same tool and the same input
 * that has no result yet.
 */
export class Decided {
	private readonly tails = new Map<string, Tail>();
	private readonly candidates: string[] = [];
	private readonly resolved = new Set<string>();
	private target: string | null = null;
	private checked = false;
	private readonly want: string;

	constructor(
		private readonly input: HookInput,
		private readonly list: () => string[] = () => transcriptsFor(input)
	) {
		this.want = `${input.tool_name}\u0000${canonical(input.tool_input ?? {})}`;
	}

	check(): boolean {
		const late: string[] = [];
		for (const path of this.list()) {
			let tail = this.tails.get(path);
			if (!tail) this.tails.set(path, (tail = new Tail(path)));
			for (const entry of tail.read()) {
				for (const b of blocks(entry)) {
					if (b.type === 'tool_use' && b.id && `${b.name}\u0000${canonical(b.input ?? {})}` === this.want) {
						this.candidates.push(b.id);
						if (this.checked) late.push(b.id);
					}
					if (b.type === 'tool_result' && b.tool_use_id) this.resolved.add(b.tool_use_id);
				}
			}
		}
		this.checked = true;
		if (!this.target) this.target = [...this.candidates].reverse().find((id) => !this.resolved.has(id)) ?? null;
		// Seen for the first time already decided (the transcript lagged, or a subagent's appeared): it is ours.
		if (!this.target && late.some((id) => this.resolved.has(id))) return true;
		return this.target !== null && this.resolved.has(this.target);
	}
}

// ---------- the PermissionRequest hook ----------

function home(path: string | undefined): string {
	if (!path) return '?';
	const h = homedir();
	return h && (path === h || path.startsWith(`${h}/`)) ? `~${path.slice(h.length)}` : path;
}

/** Who is asking: the agent's name, or else the folder it works in. */
function who(d: Dashboard, cwd: string | undefined): string {
	if (d.agent) return `"${d.agent}"`;
	const folder = cwd ? basename(cwd) : '';
	return folder ? `The agent in ${folder}` : 'Your agent';
}

/** [text] cut to [max] characters, keeping its lines. */
function cut(text: string, max: number): string {
	return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

type Decision = { hookSpecificOutput: { hookEventName: 'PermissionRequest'; decision: Record<string, unknown> } };

const decision = (d: Record<string, unknown>): Decision => ({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: d } });

/** The `addRules` allow suggestions, which are what "always allow" means at the terminal. */
export function alwaysRules(suggestions: Suggestion[] | undefined): Suggestion[] {
	return (suggestions ?? []).filter((s) => s?.type === 'addRules' && s.behavior === 'allow' && Array.isArray(s.rules) && s.rules.length > 0);
}

function ruleText(s: Suggestion): string {
	return (s.rules ?? [])
		.map((r) => {
			const rule = r.ruleContent ? `${r.toolName}(${redact(r.ruleContent)})` : `${r.toolName}`;
			// A rule for a discovery server's call_tool allows every tool it runs, not just this one.
			return !r.ruleContent && /^mcp__.+__call_tool$/.test(r.toolName ?? '') ? `${rule} (every tool on that server)` : rule;
		})
		.join(', ');
}

export const ALLOW = 'Allow';
export const ALWAYS = 'Always allow';
export const DENY = 'Deny';

const ANSWER_NOTE = (waitMs: number) =>
	`Answer here or at the terminal: the first answer counts. With no answer in ${Math.round(waitMs / 60_000)} minutes it stays at the terminal; it is never allowed on its own.`;

/** The PermissionRequest hook. Returns what to print, or null to leave it to the terminal. */
export async function permissionPrompt(input: HookInput, d: Dashboard, options: Omit<AskOptions, 'decided'> & { decided?: () => boolean }, io: Io = {}): Promise<Decision | null> {
	const tool = input.tool_name;
	if (!tool) return null;
	const watch = new Decided(input);
	const decided = options.decided ?? (() => watch.check());
	if (tool === 'AskUserQuestion') return questionPrompt(input, d, { ...options, decided }, io);
	// Approving a plan is reading it, which the terminal does better. It stays there.
	if (tool === 'ExitPlanMode') return null;

	const { action, subject } = describeCall(tool, input.tool_input);
	const rules = alwaysRules(input.permission_suggestions);
	const waitMs = options.waitMs ?? WAIT_MS;
	const detail = [
		...(d.agent ? [`Agent: ${d.agent}`] : []),
		`Folder: ${home(input.cwd)}`,
		`Tool: ${tool}`,
		subject,
		...(rules.length ? [`"${ALWAYS}" adds: ${truncate(rules.map(ruleText).join('; '), 500)}`] : []),
		'',
		ANSWER_NOTE(waitMs)
	].join('\n');
	const answer = await ask(
		d,
		[
			{
				kind: 'buttons',
				question: truncate(`${who(d, input.cwd)} wants to ${action}: ${subject}`, 500),
				detail,
				options: rules.length ? [ALLOW, ALWAYS, DENY] : [ALLOW, DENY]
			}
		],
		{ ...options, decided },
		io
	);
	if (!answer) return null;
	const [value] = answer.values;
	if (value === ALLOW) return decision({ behavior: 'allow' });
	if (value === ALWAYS && rules.length) return decision({ behavior: 'allow', updatedPermissions: rules });
	if (value === DENY) {
		const by = answer.by ? ` (${answer.by})` : '';
		return decision({ behavior: 'deny', message: `${DENIED_ON_DASHBOARD}${by} Do not try it another way; ask them if you need it.` });
	}
	return null;
}

type Question = { question?: unknown; header?: unknown; multiSelect?: unknown; options?: { label?: unknown; description?: unknown }[] };

/**
 * AskUserQuestion, asked on the dashboard: each question as a "choice" (or "multi_choice"),
 * all at once. The answers go back the way the terminal would give them. Writing your own
 * answer ("Other") is only at the terminal.
 */
async function questionPrompt(input: HookInput, d: Dashboard, options: AskOptions, io: Io): Promise<Decision | null> {
	const questions = (input.tool_input?.questions ?? []) as Question[];
	if (!Array.isArray(questions) || questions.length === 0) return null;
	const waitMs = options.waitMs ?? WAIT_MS;
	const asks: Ask[] = [];
	const labels: string[][] = [];
	for (const q of questions) {
		if (typeof q?.question !== 'string' || !Array.isArray(q.options) || q.options.length === 0 || q.options.length > 25) return null;
		const original = q.options.map((o) => (typeof o?.label === 'string' ? o.label : ''));
		const shown = original.map((l) => truncate(redact(l), 200));
		if (original.some((l) => !l) || new Set(shown).size !== shown.length) return null;
		labels.push(original);
		const lines = q.options.map((o, i) => `• ${shown[i]}${typeof o.description === 'string' && o.description ? ` — ${truncate(redact(o.description), 300)}` : ''}`);
		asks.push({
			kind: q.multiSelect === true ? 'multi_choice' : 'choice',
			question: truncate(`${who(d, input.cwd)} asks: ${redact(q.question)}`, 500),
			detail: cut([`Folder: ${home(input.cwd)}`, ...lines, '', ANSWER_NOTE(waitMs), 'To answer in your own words, use the terminal.'].join('\n'), 4000),
			options: shown,
			...(q.multiSelect === true ? { min: 1 } : {})
		});
	}
	const answer = await ask(d, asks, options, io);
	if (!answer) return null;
	const answers: Record<string, string> = {};
	for (const [i, q] of questions.entries()) {
		const value = answer.values[i];
		const pick = (shownLabel: unknown) => {
			const at = asks[i].options.indexOf(String(shownLabel));
			return at >= 0 ? labels[i][at] : null;
		};
		const picked = Array.isArray(value) ? value.map(pick) : [pick(value)];
		if (picked.length === 0 || picked.some((p) => p === null)) return null;
		answers[q.question as string] = picked.join(', ');
	}
	return decision({ behavior: 'allow', updatedInput: { ...input.tool_input, answers } });
}

// ---------- refusals ----------

export type Refusal = { id: string; key: string; text: string };

/** Why a tool_result says a call was refused, or null when it is an ordinary error or no error. */
export function refusalReason(content: unknown, toolUseResult: unknown): string | null {
	const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => (typeof c?.text === 'string' ? c.text : '')).join(' ') : '';
	if (text.startsWith(DENIED_ON_DASHBOARD)) return 'refused on the dashboard';
	if (toolUseResult === 'User rejected tool use' || /^The user doesn't want to (?:proceed with this tool use|take this action)/.test(text)) return 'refused at the terminal';
	if (/^Permission to use .+ has been denied/.test(text)) return 'blocked by a permission rule';
	const hook = /^(\w+)(?::\S*)? hook error: ([\s\S]*)/.exec(text);
	if (hook && (hook[1] === 'PreToolUse' || hook[1] === 'PermissionRequest')) return `blocked by a hook: ${truncate(redact(hook[2]), 160)}`;
	return null;
}

function refusalText(tool: string | undefined, input: Record<string, unknown> | undefined, why: string): { key: string; text: string } {
	if (!tool) return { key: `?\u0000${why}`, text: `a tool call — ${why}` };
	const { action, subject } = describeCall(tool, input);
	const shown = subject ? `${action}: \`${subject.replace(/`/g, "'")}\`` : action;
	return { key: `${tool}\u0000${subject}\u0000${why}`, text: `${shown} — ${why}` };
}

/** The refusals among [entries], in order. A tool_use earlier in [known] still names its call. */
export function refusalsIn(entries: Entry[], known = new Map<string, { name?: string; input?: unknown }>(), since = 0): Refusal[] {
	const out: Refusal[] = [];
	for (const entry of entries) {
		const at = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
		for (const b of blocks(entry)) {
			if (b.type === 'tool_use' && b.id) known.set(b.id, { name: b.name, input: b.input });
			if (b.type !== 'tool_result' || !b.tool_use_id) continue;
			if (!Number.isNaN(at) && at < since) continue;
			const why = refusalReason(b.content, entry.toolUseResult);
			if (!why) continue;
			const call = known.get(b.tool_use_id);
			out.push({ id: b.tool_use_id, ...refusalText(call?.name, call?.input as Record<string, unknown> | undefined, why) });
		}
	}
	return out;
}

type Card = { update_id: string; posted_at: number; lines: { key: string; text: string; count: number }[]; more: number };
type RefusalState = { offsets: Record<string, number>; seen: string[]; card: Card | null; channel?: string | null };

/** Where `refused` keeps what it has read and the card it is adding to, per session. */
export function statePath(data: string, sessionId: string): string {
	return join(data, 'refusals', `${sessionId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`);
}

function readState(path: string): RefusalState {
	try {
		const s = JSON.parse(readFileSync(path, 'utf8')) as Partial<RefusalState>;
		return { offsets: s.offsets ?? {}, seen: Array.isArray(s.seen) ? s.seen : [], card: s.card ?? null, channel: s.channel };
	} catch {
		return { offsets: {}, seen: [], card: null };
	}
}

function writeState(path: string, state: RefusalState, now: number): void {
	mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
	writeFileSync(path, JSON.stringify(state), { mode: 0o600 });
	// Sessions end without saying so: a week-old file is one nobody will add to.
	try {
		for (const f of readdirSync(dirname(path))) {
			const p = join(dirname(path), f);
			if (now - statSync(p).mtimeMs > 7 * 24 * 3600_000) rmSync(p, { force: true });
		}
	} catch {
		// Tidying is best effort.
	}
}

/** The channel to post refusals into: one this agent posted in or chose, else any it hears. */
export async function pickChannel(d: Dashboard, io: Io): Promise<string | null> {
	const subs = await callTool(d, 'list_subscriptions', {}, io);
	const channels = (Array.isArray(subs.channels) ? subs.channels : []) as { slug?: unknown; id?: unknown; via?: unknown }[];
	const pick = channels.find((c) => c.via === 'posted') ?? channels.find((c) => c.via === 'chosen') ?? channels[0];
	const name = pick?.slug ?? pick?.id;
	return typeof name === 'string' ? name : null;
}

function cardBody(d: Dashboard, cwd: string | undefined, card: Card): { title: string; body: string } {
	const total = card.lines.reduce((n, l) => n + l.count, 0) + card.more;
	const lines = card.lines.map((l) => `- ${l.text}${l.count > 1 ? ` (×${l.count})` : ''}`);
	if (card.more) lines.push(`- …and ${card.more} more`);
	return {
		title: `Refused: ${total} tool call${total === 1 ? '' : 's'}`,
		body: [`${d.agent ? `**${d.agent}**` : 'This agent'} in \`${home(cwd)}\`:`, '', ...lines].join('\n')
	};
}

/**
 * The Stop, SubagentStop and PermissionDenied hooks: finds the refusals since last time and
 * puts them on one low-priority card, which collects for half an hour. A refusal already
 * listed (the same call, the same reason) counts up instead of adding a line.
 */
export async function reportRefusals(input: HookInput, d: Dashboard, data: string, io: Io = {}): Promise<number> {
	const now = (io.now ?? Date.now)();
	const session = input.session_id || 'unknown';
	const path = statePath(data, session);
	const state = readState(path);
	const found: Refusal[] = [];

	if (input.hook_event_name === 'PermissionDenied') {
		const why = `blocked by auto mode${input.reason ? `: ${truncate(redact(input.reason), 160)}` : ''}`;
		found.push({ id: input.tool_use_id ?? `denied-${now}`, ...refusalText(input.tool_name, input.tool_input, why) });
	} else {
		const paths = input.hook_event_name === 'SubagentStop' && input.agent_transcript_path ? [input.agent_transcript_path] : input.transcript_path ? [input.transcript_path] : [];
		for (const p of paths) {
			if (!existsSync(p)) continue;
			const first = state.offsets[p] === undefined;
			const tail = new Tail(p, state.offsets[p] ?? null);
			// The first read of a session's transcript starts near its end, and ignores what is old:
			// a resumed session's refusals were reported the first time round.
			found.push(...refusalsIn(tail.read(), undefined, first ? now - CARD_FOR_MS : 0));
			state.offsets[p] = tail.position;
		}
	}

	const seen = new Set(state.seen);
	const fresh = found.filter((r) => !seen.has(r.id));
	for (const r of fresh) seen.add(r.id);
	state.seen = [...seen].slice(-300);
	if (fresh.length === 0) {
		writeState(path, state, now);
		return 0;
	}

	const add = (base: Card | null): Card => {
		const next: Card = base ? { ...base, lines: base.lines.map((l) => ({ ...l })) } : { update_id: '', posted_at: now, lines: [], more: 0 };
		for (const r of fresh) {
			const line = next.lines.find((l) => l.key === r.key);
			if (line) line.count += 1;
			else if (next.lines.length < CARD_LINES) next.lines.push({ key: r.key, text: r.text, count: 1 });
			else next.more += 1;
		}
		return next;
	};

	const open = state.card && now - state.card.posted_at < CARD_FOR_MS ? state.card : null;
	if (open) {
		const next = add(open);
		try {
			await callTool(d, 'edit_update', { update_id: open.update_id, ...cardBody(d, input.cwd, next) }, io);
			state.card = next;
			writeState(path, state, now);
			return fresh.length;
		} catch {
			// Deleted by the owner, or gone: these go on a new card.
		}
	}
	if (!state.channel) state.channel = await pickChannel(d, io);
	if (!state.channel) {
		io.log?.('refused: this agent follows no channel yet, so there is nowhere to post');
		writeState(path, state, now);
		return 0;
	}
	const next = add(null);
	const posted = await callTool(d, 'post_update', { channel: state.channel, ...cardBody(d, input.cwd, next), level: 'warn', priority: 'low' }, io);
	const id = (posted.update as { id?: unknown } | undefined)?.id;
	state.card = typeof id === 'string' ? { ...next, update_id: id } : null;
	writeState(path, state, now);
	return fresh.length;
}
