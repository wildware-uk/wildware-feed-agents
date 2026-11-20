/**
 * `feed.mjs secret get` and `secret put`: move a secret between the dashboard and a file without
 * the value ever reaching stdout, so it never enters the agent's transcript.
 *
 * `get` asks the dashboard's `secret_url` tool for a single-use link, fetches it, and writes the
 * value straight to a file (0600), or as one `NAME=value` line in an env file. `put` asks
 * `create_secret_upload` for a link and sends a file's bytes to it. Each prints one short line
 * with the name and the size, never the value or the link.
 */
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { origin } from './pair';

export type SecretIo = { fetch?: typeof globalThis.fetch };

export type GetOptions = { url: string; token: string; name: string; to?: string; envFile?: string; as?: string };
export type PutOptions = { url: string; token: string; name: string; from: string; note?: string };

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * An error these commands raise on purpose. Its message is safe to print: it
 * never holds a value, a link or a token. Anything else is reported with a
 * fixed sentence, because fetch's own messages can quote what it was given.
 */
export class SecretError extends Error {}

/**
 * fetch, with its own errors swapped for `failed`: a URL it cannot parse, or a
 * header it refuses, is quoted whole in its message, and that would be the link
 * or the token.
 */
async function quietFetch(io: SecretIo, failed: string, input: string, init?: RequestInit): Promise<Response> {
	try {
		return await (io.fetch ?? globalThis.fetch)(input, init);
	} catch {
		throw new SecretError(failed);
	}
}

/**
 * A link the dashboard gave, as an absolute URL on the dashboard's own address.
 * A link elsewhere, or with a user or password in it, is refused, and the error
 * never holds the link.
 */
export function linkFrom(dashboard: string, link: string): string {
	const home = origin(dashboard);
	let target: URL;
	try {
		target = new URL(link, `${home}/`);
	} catch {
		throw new SecretError('the dashboard gave a link that is not a URL');
	}
	if (target.username || target.password) throw new SecretError('the dashboard gave a link with a password in it');
	if (target.origin !== home) {
		throw new SecretError(`the dashboard gave a link on another address (${target.protocol}//${target.host}), not ${home}: set dashboard_url to the dashboard's own address`);
	}
	return target.href;
}

/** One MCP tool call, its structured result, or an Error with the dashboard's words. */
async function tool(url: string, token: string, name: string, args: Record<string, unknown>, io: SecretIo): Promise<Record<string, unknown>> {
	if (/[\r\n\0]/.test(token)) throw new SecretError("this project's token holds a line break: pair again, or check AGENT_DASHBOARD_TOKEN");
	const response = await quietFetch(io, 'the dashboard could not be reached', `${origin(url)}/mcp`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json, text/event-stream',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
	});
	if (response.status === 401) throw new SecretError('the dashboard refused this project\'s token: pair again, or check AGENT_DASHBOARD_TOKEN');
	if (!response.ok) throw new SecretError(`the dashboard said ${response.status}`);
	let parsed: unknown;
	try {
		parsed = await response.json();
	} catch {
		throw new SecretError('the dashboard gave an answer that is not JSON');
	}
	const body = (parsed ?? {}) as { result?: { structuredContent?: Record<string, unknown>; isError?: boolean; content?: { text?: string }[] }; error?: { message?: string } };
	if (body.error) throw new SecretError(body.error.message ?? 'the dashboard refused the call');
	const result = body.result ?? {};
	const data = result.structuredContent ?? {};
	if (result.isError) {
		const why = typeof data.message === 'string' ? data.message : result.content?.[0]?.text ?? 'refused';
		throw new SecretError(why);
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
	if (/['\r\n\0]/.test(value)) throw new SecretError("it holds a quote or a line break, so it can't go in an env file safely: use --to <file>");
	return `'${value}'`;
}

/**
 * The env file's text, or '' when there is none. A link (symlink) at the path,
 * or anything but a regular file, is refused: following one would copy whatever
 * file it points at into the work tree.
 */
export function readEnvFile(path: string): string {
	const refused = () => new SecretError(`${path} is a link, so it can't be used as an env file: name a real file`);
	// lstat first for systems with no O_NOFOLLOW; O_NOFOLLOW closes the gap between the two where there is one.
	if (isLink(path)) throw refused();
	let fd: number;
	try {
		fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	} catch (e) {
		const code = (e as NodeJS.ErrnoException).code;
		if (code === 'ENOENT') return '';
		if (code === 'ELOOP') throw refused();
		throw e;
	}
	try {
		if (!fstatSync(fd).isFile()) throw new SecretError(`${path} is not a regular file`);
		return readFileSync(fd, 'utf8');
	} finally {
		closeSync(fd);
	}
}

function isLink(path: string): boolean {
	try {
		return lstatSync(path).isSymbolicLink();
	} catch {
		return false;
	}
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
	if ((to ? 1 : 0) + (envFile ? 1 : 0) !== 1) throw new SecretError('say where it goes: --to <file> or --env-file <file>');
	const variable = options.as ?? options.name;
	if (envFile && !ENV_NAME.test(variable)) throw new SecretError(`${variable} is not an environment variable name: pass --as NAME`);
	// Before the link is asked for, so a refusal does not spend it.
	const before = envFile ? readEnvFile(envFile) : '';

	const grant = await tool(options.url, options.token, 'secret_url', { name: options.name }, io);
	if (typeof grant.url !== 'string') throw new SecretError('the dashboard gave no link');
	const link = linkFrom(options.url, grant.url);
	const response = await quietFetch(io, 'the link could not be reached: run this again for a fresh one', link, { redirect: 'error' });
	if (!response.ok) throw new SecretError(`the link was refused (${response.status}): run this again for a fresh one`);
	const bytes = Buffer.from(await response.arrayBuffer());

	if (to) {
		writePrivate(to, bytes);
		return `saved ${options.name} to ${to} (${bytes.length} bytes)`;
	}
	let value: string;
	try {
		value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new SecretError(`${options.name} is not text, so it can't go in an env file: use --to <file>`);
	}
	if (/[\r\n]/.test(value)) throw new SecretError(`${options.name} has more than one line, so it can't go in an env file: use --to <file>`);
	writePrivate(envFile!, withEnvLine(before, variable, value));
	return `saved ${options.name} as ${variable} in ${envFile} (${bytes.length} bytes)`;
}

/** `secret put`. Returns the line to print. */
export async function putSecret(options: PutOptions, io: SecretIo = {}): Promise<string> {
	const bytes = readFileSync(options.from);
	if (bytes.length === 0) throw new SecretError(`${options.from} is empty`);
	const args: Record<string, unknown> = { name: options.name };
	if (options.note) args.note = options.note;
	const grant = await tool(options.url, options.token, 'create_secret_upload', args, io);
	if (typeof grant.upload_url !== 'string') throw new SecretError('the dashboard gave no upload link');
	const link = linkFrom(options.url, grant.upload_url);
	const response = await quietFetch(io, 'the upload link could not be reached', link, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/octet-stream' },
		body: bytes,
		redirect: 'error'
	});
	if (!response.ok) throw new SecretError(`the upload was refused (${response.status})`);
	return `saved ${options.name} on the dashboard (${bytes.length} bytes)`;
}
