/**
 * `feed.mjs secret get` and `secret put`: move a secret between the dashboard and a file without
 * the value ever reaching stdout, so it never enters the agent's transcript.
 *
 * `get` asks the dashboard's `secret_url` tool for a single-use link, fetches it, and writes the
 * value straight to a file (0600), or as one `NAME=value` line in an env file. `put` asks
 * `create_secret_upload` for a link and sends a file's bytes to it. Each prints one short line
 * with the name and the size, never the value or the link.
 */
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { origin } from './pair';

export type SecretIo = { fetch?: typeof globalThis.fetch };

export type GetOptions = { url: string; token: string; name: string; to?: string; envFile?: string; as?: string };
export type PutOptions = { url: string; token: string; name: string; from: string; note?: string };

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** One MCP tool call, its structured result, or an Error with the dashboard's words. */
async function tool(url: string, token: string, name: string, args: Record<string, unknown>, io: SecretIo): Promise<Record<string, unknown>> {
	const fetch = io.fetch ?? globalThis.fetch;
	const response = await fetch(`${origin(url)}/mcp`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json, text/event-stream',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
	});
	if (response.status === 401) throw new Error('the dashboard refused this project\'s token: pair again, or check AGENT_DASHBOARD_TOKEN');
	if (!response.ok) throw new Error(`the dashboard said ${response.status}`);
	const body = (await response.json()) as { result?: { structuredContent?: Record<string, unknown>; isError?: boolean; content?: { text?: string }[] }; error?: { message?: string } };
	if (body.error) throw new Error(body.error.message ?? 'the dashboard refused the call');
	const result = body.result ?? {};
	const data = result.structuredContent ?? {};
	if (result.isError) {
		const why = typeof data.message === 'string' ? data.message : result.content?.[0]?.text ?? 'refused';
		throw new Error(why);
	}
	return data;
}

/**
 * Write [bytes] to [path], readable by this user only from the first byte: a new 0600 file beside
 * it, renamed over it. A symlink at [path] is replaced, not followed.
 */
function writePrivate(path: string, bytes: Buffer | string): void {
	const temp = join(dirname(path), `.${basename(path)}.${randomBytes(6).toString('hex')}.tmp`);
	try {
		writeFileSync(temp, bytes, { mode: 0o600, flag: 'wx' });
		renameSync(temp, path);
	} catch (e) {
		rmSync(temp, { force: true });
		throw e;
	}
}

/** Characters an env-file value may hold bare; anything else is single-quoted. */
const BARE = /^[A-Za-z0-9_./+=:@,%~-]*$/;

/**
 * The value as an env file holds it: bare when it is plain, else in single quotes, which shells and
 * dotenv parsers both take literally. One with a quote, a newline or no clean text can't be held
 * safely, so it is refused.
 */
export function envValue(value: string): string {
	if (BARE.test(value)) return value;
	if (/['\r\n\0]/.test(value)) throw new Error("it holds a quote or a line break, so it can't go in an env file safely: use --to <file>");
	return `'${value}'`;
}

/** [file] with `VAR=value` set: an existing line for VAR replaced, else one appended. */
export function withEnvLine(file: string, variable: string, value: string): string {
	const line = `${variable}=${envValue(value)}`;
	const lines = file.length ? file.replace(/\n$/, '').split('\n') : [];
	const at = lines.findIndex((l) => l.replace(/^export\s+/, '').startsWith(`${variable}=`));
	if (at >= 0) lines[at] = line;
	else lines.push(line);
	return `${lines.join('\n')}\n`;
}

/** `secret get`. Returns the line to print, which never holds the value. */
export async function getSecret(options: GetOptions, io: SecretIo = {}): Promise<string> {
	const { to, envFile } = options;
	if ((to ? 1 : 0) + (envFile ? 1 : 0) !== 1) throw new Error('say where it goes: --to <file> or --env-file <file>');
	const variable = options.as ?? options.name;
	if (envFile && !ENV_NAME.test(variable)) throw new Error(`${variable} is not an environment variable name: pass --as NAME`);

	const grant = await tool(options.url, options.token, 'secret_url', { name: options.name }, io);
	if (typeof grant.url !== 'string') throw new Error('the dashboard gave no link');
	const fetch = io.fetch ?? globalThis.fetch;
	const response = await fetch(grant.url);
	if (!response.ok) throw new Error(`the link was refused (${response.status}): run this again for a fresh one`);
	const bytes = Buffer.from(await response.arrayBuffer());

	if (to) {
		writePrivate(to, bytes);
		return `saved ${options.name} to ${to} (${bytes.length} bytes)`;
	}
	let value: string;
	try {
		value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new Error(`${options.name} is not text, so it can't go in an env file: use --to <file>`);
	}
	if (/[\r\n]/.test(value)) throw new Error(`${options.name} has more than one line, so it can't go in an env file: use --to <file>`);
	const before = existsSync(envFile!) ? readFileSync(envFile!, 'utf8') : '';
	writePrivate(envFile!, withEnvLine(before, variable, value));
	return `saved ${options.name} as ${variable} in ${envFile} (${bytes.length} bytes)`;
}

/** `secret put`. Returns the line to print. */
export async function putSecret(options: PutOptions, io: SecretIo = {}): Promise<string> {
	const bytes = readFileSync(options.from);
	if (bytes.length === 0) throw new Error(`${options.from} is empty`);
	const args: Record<string, unknown> = { name: options.name };
	if (options.note) args.note = options.note;
	const grant = await tool(options.url, options.token, 'create_secret_upload', args, io);
	if (typeof grant.upload_url !== 'string') throw new Error('the dashboard gave no upload link');
	const fetch = io.fetch ?? globalThis.fetch;
	const response = await fetch(grant.upload_url, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes });
	if (!response.ok) throw new Error(`the upload was refused (${response.status})`);
	return `saved ${options.name} on the dashboard (${bytes.length} bytes)`;
}
