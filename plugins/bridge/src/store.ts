/**
 * Where an agent's token lives on this machine, and which one a session uses.
 *
 * Pairing gives each project its own agent: the token for a project is kept in
 * the plugin's data folder under a key made from the project's root, so two
 * repos on one laptop are two agents with two names. Worktrees of one repo share
 * the main checkout's root, so they share its agent.
 *
 * Which token a session gets, first match wins:
 *
 * 1. `AGENT_DASHBOARD_TOKEN` in the environment, for a session run by hand.
 * 2. The token this project paired for.
 * 3. The `agent_token` plugin option, copied here by the SessionStart hook,
 *    for an owner who pasted one token for the whole machine.
 *
 * Files holding a token are written 0600. Nothing here prints a token.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** A finished pairing: the agent this project joined as. */
export type Paired = {
	url: string;
	name: string;
	agent_id: string | null;
	token: string;
	project: string;
	paired_at: string;
};

/** A pairing the owner has not decided yet. */
export type Pending = {
	url: string;
	name: string;
	project: string;
	pairing_id: string;
	poll_secret: string;
	code: string;
	expires_at: string;
};

/** Where the token came from, said without saying the token. */
export type TokenSource = 'env' | 'paired' | 'option';

export type Resolved = { token: string; source: TokenSource; name: string | null; url: string | null };

/**
 * The root a project's agent is keyed by.
 *
 * Inside a git repo that is the main checkout (the parent of the common git
 * folder), so a worktree is the same agent as the repo it belongs to and a
 * session started in a subfolder is the same agent as one started at the top.
 * Outside git it is the folder itself.
 */
export function projectRoot(dir: string, git: (dir: string) => string | null = gitCommonDir): string {
	let real: string;
	try {
		real = realpathSync(dir);
	} catch {
		real = resolve(dir);
	}
	const common = git(real);
	if (common && common.endsWith('/.git')) return dirname(common);
	if (common && common.endsWith('\\.git')) return dirname(common);
	return real;
}

function gitCommonDir(dir: string): string | null {
	try {
		const out = execFileSync('git', ['-C', dir, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
			timeout: 3_000
		}).trim();
		return out || null;
	} catch {
		return null;
	}
}

/** A short, stable file name for a project root. */
export function projectKey(root: string): string {
	return createHash('sha256').update(root).digest('hex').slice(0, 16);
}

export class Store {
	constructor(
		readonly data: string,
		readonly root: string
	) {}

	static for(data: string, projectDir: string, git?: (dir: string) => string | null): Store {
		return new Store(data, projectRoot(projectDir, git));
	}

	get key(): string {
		return projectKey(this.root);
	}

	private path(kind: 'agents' | 'pending'): string {
		return join(this.data, kind, `${this.key}.json`);
	}

	get optionPath(): string {
		return join(this.data, 'option-token.json');
	}

	get connectionPath(): string {
		return join(this.data, 'connection.json');
	}

	paired(): Paired | null {
		return readJson<Paired>(this.path('agents'), (v) => typeof v.token === 'string' && typeof v.url === 'string');
	}

	savePaired(paired: Paired): void {
		writeSecret(this.path('agents'), paired);
	}

	forget(): boolean {
		const had = this.paired() !== null;
		rmSync(this.path('agents'), { force: true });
		return had;
	}

	pending(): Pending | null {
		return readJson<Pending>(this.path('pending'), (v) => typeof v.pairing_id === 'string' && typeof v.poll_secret === 'string');
	}

	savePending(pending: Pending): void {
		writeSecret(this.path('pending'), pending);
	}

	clearPending(): void {
		rmSync(this.path('pending'), { force: true });
	}

	/** The plugin option's token, as the hook last copied it, with the dashboard it was set for. */
	optionToken(): { token: string; url: string | null } | null {
		const stored = readJson<{ token: string; url?: unknown }>(this.optionPath, (v) => typeof v.token === 'string');
		const token = stored?.token.trim();
		if (!token) return null;
		return { token, url: typeof stored?.url === 'string' ? stored.url : null };
	}

	/**
	 * Copy the plugin option's token here, or remove the copy when the option is unset. The token
	 * is bound to the dashboard it was first seen with, [url]: a dashboard URL changed later, with
	 * the same token, keeps the old binding, so the token never goes to the new address until the
	 * owner enters a token for it.
	 */
	saveOptionToken(token: string | undefined, url?: string | null): void {
		const trimmed = token?.trim();
		if (!trimmed) {
			rmSync(this.optionPath, { force: true });
			return;
		}
		const before = this.optionToken();
		const bound = before?.token === trimmed && before.url ? before.url : (url ?? null);
		writeSecret(this.optionPath, { token: trimmed, url: bound });
	}

	/**
	 * The token this session should use, or null when there is none.
	 *
	 * `serverUrl`, when given, is the URL the token is about to be sent to. A
	 * paired token is only handed over for the server it was paired with, so a
	 * changed dashboard URL never leaks one server's token to another.
	 */
	resolve(env: NodeJS.ProcessEnv, serverUrl?: string): Resolved | null {
		// No token goes over plain http across the internet, where anyone on the way could read it.
		if (serverUrl && !safeTransport(serverUrl)) return null;
		const fromEnv = env.AGENT_DASHBOARD_TOKEN?.trim();
		if (fromEnv) return { token: fromEnv, source: 'env', name: null, url: null };

		const paired = this.paired();
		if (paired && sameOrigin(paired.url, serverUrl)) {
			return { token: paired.token, source: 'paired', name: paired.name, url: paired.url };
		}

		const option = this.optionToken();
		if (option && (option.url ? sameOrigin(option.url, serverUrl) : !serverUrl)) {
			return { token: option.token, source: 'option', name: null, url: option.url };
		}

		return null;
	}
}

/**
 * Whether plain http is safe enough for [hostname]: only this computer or a private network
 * (a desktop app serving its own dashboard to the house), never anything across the internet.
 */
export function plainHttpAllowed(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
	if (host === '::1' || host.startsWith('fe80:') || /^f[cd][0-9a-f]{2}:/.test(host)) return true;
	const v4 = host.replace(/^::ffff:/, '').match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
	if (!v4) return false;
	const [a, b] = [Number(v4[1]), Number(v4[2])];
	return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

/** https, or plain http only on this computer or a private network. */
export function safeTransport(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && plainHttpAllowed(parsed.hostname));
	} catch {
		return false;
	}
}

/** True when `b` is absent or names the same origin as `a`. */
export function sameOrigin(a: string, b: string | undefined): boolean {
	if (!b) return true;
	try {
		return new URL(a).origin === new URL(b).origin;
	} catch {
		return false;
	}
}

function readJson<T>(path: string, valid: (value: Record<string, unknown>) => boolean): T | null {
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
		if (typeof parsed !== 'object' || parsed === null) return null;
		return valid(parsed as Record<string, unknown>) ? (parsed as T) : null;
	} catch {
		return null;
	}
}

/** Write a JSON file only its owner can read. */
export function writeSecret(path: string, value: unknown): void {
	mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
	writeFileSync(path, `${JSON.stringify(value, null, '\t')}\n`, { mode: 0o600 });
	// writeFileSync keeps the mode of a file that already existed.
	chmodSync(path, 0o600);
}
