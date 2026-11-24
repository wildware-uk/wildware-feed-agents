/**
 * What a permission prompt may say about a tool call, with the secrets taken out.
 *
 * The dashboard is the owner's own, but a prompt is shown on a phone's lock
 * screen and kept in its history, so it carries only what a person needs to
 * decide: the tool, the command line or the file, and never what is written
 * into a file, an environment value, a token or a password.
 */

/** The longest command line sent. Longer ones end in "…". */
export const MAX_COMMAND = 300;

const HIDDEN = '***';

/** Flag names whose value is a secret: `--token x`, `--password=x`, `--api-key x`. */
const SECRET_FLAG = /(?:passw(?:or)?d|passphrase|secret|token|api-?key|access-?key|private-?key|authorization|credential|cookie)/i;

/** Query parameters whose value is a secret: `?token=x`, `&sig=x`. */
const SECRET_PARAM = /(?:pass(?:word|wd)?|secret|token|api[-_]?key|access[-_]?key|auth|credential|session|signature|sig|key)/i;

/** Values that are secrets by their shape alone, whatever name they go by. */
const SECRET_SHAPES: RegExp[] = [
	/\bsk-[A-Za-z0-9_-]{12,}/g, // OpenAI, Anthropic, Stripe
	/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g, // GitHub
	/\bgithub_pat_[A-Za-z0-9_]{20,}/g,
	/\bxox[abposr]-[A-Za-z0-9-]{10,}/g, // Slack
	/\bAKIA[0-9A-Z]{16}\b/g, // AWS access key
	/\bAIza[0-9A-Za-z_-]{30,}/g, // Google
	/\bglpat-[A-Za-z0-9_-]{16,}/g, // GitLab
	/\bnpm_[A-Za-z0-9]{30,}/g,
	/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, // a JWT
	/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
	/\b[A-Fa-f0-9]{32,}\b/g, // a long hex string
	/\b(?=[A-Za-z0-9+_]*\d)(?=[A-Za-z0-9+_]*[a-z])(?=[A-Za-z0-9+_]*[A-Z])[A-Za-z0-9+_]{40,}={0,2}/g // a long base64-ish string
];

/** One shell word: quoted, or bare up to the next space. */
const WORD = String.raw`(?:"(?:[^"\\]|\\.)*"|'[^']*'|[^\s;&|]+)`;

/**
 * [text] with every secret it holds replaced by `***`:
 *
 * - every environment assignment's value (`FOO=bar cmd`, `export FOO=bar`), whatever its name;
 * - the value after a secret-sounding flag (`--token x`, `--password=x`, `-u user:pass`);
 * - `Authorization:` and `Cookie:` headers, and `user:password@` in a URL;
 * - a secret-sounding query parameter (`?token=x`);
 * - anything shaped like a key, a token or a private key.
 */
export function redact(text: string): string {
	let out = text;
	out = out.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, HIDDEN);
	// user:password@host
	out = out.replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, `$1${HIDDEN}@`);
	// Authorization: Bearer x / Cookie: x / X-Api-Key: x, inside quotes or not.
	out = out.replace(/((?:authorization|proxy-authorization|cookie|x-[a-z-]*(?:key|token|secret))\s*:\s*)(?:(?:bearer|basic|token)\s+)?[^\s'"]+/gi, `$1${HIDDEN}`);
	// FOO=bar and export FOO=bar: the value of any environment assignment.
	out = out.replace(new RegExp(String.raw`(^|[\s;(])((?:export\s+)?[A-Za-z_][A-Za-z0-9_]*=)${WORD}`, 'g'), `$1$2${HIDDEN}`);
	// --token=x, --password x, -p x (mysql), -u user:pass (curl)
	out = out.replace(new RegExp(String.raw`(\s--?[A-Za-z0-9-]*${SECRET_FLAG.source}[A-Za-z0-9-]*)(=|\s+)${WORD}`, 'gi'), `$1$2${HIDDEN}`);
	// curl -u user:password, --user user:password
	out = out.replace(/(\s(?:-u|--user)(?:\s+|=))[^\s:'"]+:[^\s'"]+/g, `$1${HIDDEN}`);
	// ?token=x&sig=y
	out = out.replace(new RegExp(String.raw`([?&][A-Za-z0-9_.-]*${SECRET_PARAM.source}[A-Za-z0-9_.-]*=)[^&\s'"#]+`, 'gi'), `$1${HIDDEN}`);
	for (const shape of SECRET_SHAPES) out = out.replace(shape, HIDDEN);
	return out;
}

/** [text] cut to [max] characters on one line, ending in "…" when it was cut. */
export function truncate(text: string, max = MAX_COMMAND): string {
	const flat = text.replace(/\s*\n\s*/g, ' ⏎ ').trim();
	return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/** A URL with its password and its secret-looking query values taken out. */
function safeUrl(url: string): string {
	return truncate(redact(url), 200);
}

function str(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * What a tool call is about, safe to show: `{ tool, subject }`, where tool is
 * what the owner reads ("run a command", "edit a file") and subject the command
 * line or the path. File contents, edit text, prompts and MCP argument values
 * never appear; for a tool this does not know, only its argument names do.
 */
export function describeCall(toolName: string, input: Record<string, unknown> | undefined): { action: string; subject: string } {
	const args = input ?? {};
	const path = str(args.file_path) ?? str(args.notebook_path) ?? str(args.path);
	switch (toolName) {
		case 'Bash':
			return { action: 'run a command', subject: truncate(redact(str(args.command) ?? '')) };
		case 'Write':
			return { action: 'write a file', subject: truncate(path ?? '?', 200) };
		case 'Edit':
		case 'MultiEdit':
			return { action: 'edit a file', subject: truncate(path ?? '?', 200) };
		case 'NotebookEdit':
			return { action: 'edit a notebook', subject: truncate(path ?? '?', 200) };
		case 'Read':
			return { action: 'read a file', subject: truncate(path ?? '?', 200) };
		case 'Glob':
		case 'Grep':
			return { action: 'search files', subject: truncate(redact(`${str(args.pattern) ?? ''}${path ? ` in ${path}` : ''}`), 200) };
		case 'WebFetch':
			return { action: 'fetch a web page', subject: safeUrl(str(args.url) ?? '?') };
		case 'WebSearch':
			return { action: 'search the web', subject: truncate(redact(str(args.query) ?? ''), 200) };
		case 'Task':
		case 'Agent':
			return { action: 'start a helper agent', subject: truncate(redact(str(args.description) ?? ''), 200) };
		default: {
			const mcp = /^mcp__(.+?)__(.+)$/.exec(toolName);
			// A discovery server's call_tool({ name, arguments }) is about the tool it runs.
			const inner = mcp?.[2] === 'call_tool' ? str(args.name) : null;
			const shown = inner && args.arguments && typeof args.arguments === 'object' && !Array.isArray(args.arguments) ? (args.arguments as Record<string, unknown>) : inner ? {} : args;
			const keys = Object.keys(shown).slice(0, 8).join(', ');
			const name = mcp ? `${inner ? truncate(inner.replace(/^mcp__.+__/, '').replace(/[^\w.-]/g, ''), 80) : mcp[2]} (${mcp[1]})` : toolName;
			return { action: `use ${name}`, subject: keys ? `arguments: ${keys}` : 'no arguments' };
		}
	}
}
