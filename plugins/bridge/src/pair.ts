/**
 * Pairing a project with the dashboard, over the server's public `/api/pair`.
 *
 * Two commands rather than one, because an agent sees a command's output only
 * when it ends: `start` asks to join and prints the code at once, so the agent
 * can tell the owner, and `wait` then holds until the owner decides.
 *
 * The token never reaches stdout. It goes straight into the store, 0600, where
 * the plugin's header helper, channel and monitor read it. That is the point of
 * doing this in a script instead of letting the agent call the endpoint itself:
 * the transcript never holds the secret.
 */
import { hostname } from 'node:os';
import type { Store } from './store';

export type PairIo = {
	fetch?: typeof globalThis.fetch;
	now?: () => number;
	out?: (line: string) => void;
	host?: () => string;
};

/** How long `wait` keeps going before it hands back, inside a 10-minute tool limit. */
export const WAIT_BUDGET_MS = 9 * 60_000;

const RECONNECT =
	'Ask your owner to run /mcp and reconnect plugin:wildware-feed:agent-dashboard ' +
	'(or start a new session). Then call register_session.';

/** The dashboard origin, with no trailing slash and no `/mcp`. */
export function origin(url: string): string {
	const parsed = new URL(url.trim());
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error(`not an http(s) URL: ${url}`);
	return parsed.origin;
}

async function json(response: Response): Promise<Record<string, unknown>> {
	try {
		const body: unknown = await response.json();
		return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function refusal(status: number, body: Record<string, unknown>): string {
	const why = typeof body.message === 'string' ? body.message : typeof body.error === 'string' ? body.error : 'no reason given';
	return `the dashboard said ${status}: ${why}`;
}

/** Ask to join. Exit code 0 when the request is waiting for the owner. */
export async function startPairing(
	store: Store,
	options: { url: string; name: string; force?: boolean },
	io: PairIo = {}
): Promise<number> {
	const out = io.out ?? ((line: string) => process.stdout.write(`${line}\n`));
	const fetch = io.fetch ?? globalThis.fetch;
	const base = origin(options.url);
	const name = options.name.trim();
	if (!name) {
		out('A name is required: the name this agent joins under, for example "laptop-personal".');
		return 2;
	}

	const already = store.paired();
	if (already && !options.force) {
		out(`This project is already paired as "${already.name}" with ${already.url}.`);
		out('Run `forget` first if you really want a new agent for it.');
		return 0;
	}

	const response = await fetch(`${base}/api/pair`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, host: (io.host ?? hostname)(), cwd: store.root })
	});
	const body = await json(response);
	if (response.status !== 201 || typeof body.pairing_id !== 'string' || typeof body.poll_secret !== 'string') {
		out(`Could not ask to join: ${refusal(response.status, body)}.`);
		return 1;
	}

	const code = String(body.code ?? '');
	store.savePending({
		url: base,
		name: String(body.name ?? name),
		project: store.root,
		pairing_id: body.pairing_id,
		poll_secret: body.poll_secret,
		code,
		expires_at: String(body.expires_at ?? '')
	});

	out(`Asked ${base} to let "${String(body.name ?? name)}" join, for ${store.root}.`);
	out(`Code: ${code}`);
	out('Tell your owner this code now. Their app shows the request with the same code; they choose Allow or Deny.');
	out('Then run the `wait` command. The request expires in 10 minutes.');
	return 0;
}

/** Wait for the owner's decision. Exit code 0 only when this project is now paired. */
export async function waitForPairing(store: Store, io: PairIo = {}): Promise<number> {
	const out = io.out ?? ((line: string) => process.stdout.write(`${line}\n`));
	const fetch = io.fetch ?? globalThis.fetch;
	const now = io.now ?? Date.now;

	const pending = store.pending();
	if (!pending) {
		const paired = store.paired();
		out(paired ? `Already paired as "${paired.name}". ${RECONNECT}` : 'No pairing is waiting. Run `start` first.');
		return paired ? 0 : 1;
	}

	const started = now();
	for (;;) {
		const response = await fetch(`${pending.url}/api/pair/${encodeURIComponent(pending.pairing_id)}`, {
			headers: { Authorization: `Bearer ${pending.poll_secret}` }
		});
		const body = await json(response);

		if (response.status === 429) {
			const wait = Number(response.headers.get('Retry-After') ?? '5');
			await new Promise((r) => setTimeout(r, Math.min(Math.max(wait, 1), 30) * 1000));
			continue;
		}
		if (response.status !== 200) {
			out(`Pairing failed: ${refusal(response.status, body)}.`);
			if (response.status === 404) store.clearPending();
			return 1;
		}

		const state = String(body.state ?? '');
		if (state === 'approved' && typeof body.token === 'string') {
			const agent = (body.agent ?? {}) as Record<string, unknown>;
			const name = typeof agent.name === 'string' ? agent.name : pending.name;
			store.savePaired({
				url: pending.url,
				name,
				agent_id: typeof agent.id === 'string' ? agent.id : null,
				token: body.token,
				project: store.root,
				paired_at: new Date(now()).toISOString()
			});
			store.clearPending();
			out(`Paired. This project is now the agent "${name}" on ${pending.url}. The token is saved; it is not shown.`);
			out(RECONNECT);
			return 0;
		}
		if (state === 'pending') {
			if (now() - started >= WAIT_BUDGET_MS) {
				out(`Still waiting for your owner (code ${pending.code}). Run \`wait\` again to keep waiting.`);
				return 3;
			}
			continue;
		}

		store.clearPending();
		if (state === 'denied') out('Your owner denied this pairing. Do not try to connect another way; ask them first.');
		else if (state === 'expired') out('Nobody decided in time and the request expired. Ask your owner before starting again.');
		else if (state === 'collected') out('This pairing was already collected, and its token is never shown twice. Start a new pairing.');
		else out(`Pairing ended in an unexpected state: ${state || 'none'}.`);
		return 1;
	}
}
