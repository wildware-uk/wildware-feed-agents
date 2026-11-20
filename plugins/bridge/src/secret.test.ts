import { lstatSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSecret, linkFrom, putSecret, SecretError, withEnvLine } from './secret';

const URL_ = 'https://dashboard.example.com';
const VALUE = 'sk-test-NOT-REAL-plugin-1234';
const LINK = `${URL_}/api/agent/secret/${'x'.repeat(43)}`;
const dir = () => mkdtempSync(join(tmpdir(), 'feed-secret-'));

type Call = { url: string; init?: RequestInit };

/** A dashboard that hands out one link and serves or takes one value. */
function dashboard(opts: { refuse?: string; served?: string; link?: string } = {}) {
	const calls: Call[] = [];
	let stored: Buffer | null = null;
	const fetch = (async (url: string, init?: RequestInit) => {
		calls.push({ url, init });
		if (url === `${URL_}/mcp`) {
			const call = JSON.parse(String(init?.body)).params;
			if (opts.refuse) {
				return new Response(JSON.stringify({ result: { isError: true, structuredContent: { error: 'not_found', message: opts.refuse } } }));
			}
			const link = opts.link ?? LINK;
			const data = call.name === 'secret_url' ? { name: call.arguments.name, url: link } : { name: call.arguments.name, upload_url: link };
			return new Response(JSON.stringify({ result: { structuredContent: data } }));
		}
		if (url === LINK && (init?.method ?? 'GET') === 'GET') return new Response(opts.served ?? VALUE);
		if (url === LINK && init?.method === 'PUT') {
			stored = Buffer.from(init.body as Uint8Array);
			return new Response(JSON.stringify({ saved: true }), { status: 201 });
		}
		return new Response('', { status: 404 });
	}) as typeof globalThis.fetch;
	return { fetch, calls, stored: () => stored };
}

describe('secret get', () => {
	it('writes the value to a 0600 file and says only where', async () => {
		const d = dashboard();
		const to = join(dir(), 'key.txt');
		const said = await getSecret({ url: `${URL_}/mcp`, token: 'agent-token', name: 'OPENAI_API_KEY', to }, d);
		expect(readFileSync(to, 'utf8')).toBe(VALUE);
		expect(statSync(to).mode & 0o777).toBe(0o600);
		expect(said).toBe(`saved OPENAI_API_KEY to ${to} (${VALUE.length} bytes)`);
		expect(said).not.toContain(VALUE);
		expect(said).not.toContain(LINK);
		expect((d.calls[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer agent-token');
	});

	it('sets one line in an env file, keeping the others, and tightens an existing file', async () => {
		const file = join(dir(), '.env.local');
		writeFileSync(file, 'A=1\nOPENAI_API_KEY=old\nB=2\n', { mode: 0o644 });
		const said = await getSecret({ url: URL_, token: 't', name: 'OPENAI_API_KEY', envFile: file }, dashboard());
		expect(readFileSync(file, 'utf8')).toBe(`A=1\nOPENAI_API_KEY=${VALUE}\nB=2\n`);
		expect(statSync(file).mode & 0o777).toBe(0o600);
		expect(said).not.toContain(VALUE);

		await getSecret({ url: URL_, token: 't', name: 'OPENAI_API_KEY', envFile: file, as: 'OTHER' }, dashboard());
		expect(readFileSync(file, 'utf8').trim().split('\n').at(-1)).toBe(`OTHER=${VALUE}`);
	});

	it('refuses an env file for a value of several lines, and a bad variable name', async () => {
		const file = join(dir(), '.env');
		await expect(getSecret({ url: URL_, token: 't', name: 'PEM', envFile: file }, dashboard({ served: 'a\nb' }))).rejects.toThrow('more than one line');
		await expect(getSecret({ url: URL_, token: 't', name: 'my.key', envFile: file }, dashboard())).rejects.toThrow('--as');
		await expect(getSecret({ url: URL_, token: 't', name: 'K' }, dashboard())).rejects.toThrow('--to');
	});

	it("passes on the dashboard's refusal without a value", async () => {
		await expect(
			getSecret({ url: URL_, token: 't', name: 'K', to: join(dir(), 'x') }, dashboard({ refuse: 'no secret named K that you may read' })),
		).rejects.toThrow('no secret named K');
	});
});

describe('secret put', () => {
	it('sends the file to the upload link and says only the size', async () => {
		const d = dashboard();
		const from = join(dir(), 'token');
		writeFileSync(from, VALUE);
		const said = await putSecret({ url: URL_, token: 't', name: 'DEPLOY_TOKEN', from, note: 'from deploy' }, d);
		expect(d.stored()?.toString()).toBe(VALUE);
		expect(JSON.parse(String(d.calls[0].init?.body)).params.arguments).toEqual({ name: 'DEPLOY_TOKEN', note: 'from deploy' });
		expect(said).toBe(`saved DEPLOY_TOKEN on the dashboard (${VALUE.length} bytes)`);
	});
});

describe('env lines', () => {
	it('append to an empty file and replace an export line', () => {
		expect(withEnvLine('', 'A', '1')).toBe('A=1\n');
		expect(withEnvLine('export A=0\nB=2', 'A', '1')).toBe('A=1\nB=2\n');
	});

	it('quote anything a shell or dotenv would read as more than text, and refuse what cannot be quoted', () => {
		expect(withEnvLine('', 'A', 'x$(rm -rf ~)`id`;y #z')).toBe("A='x$(rm -rf ~)`id`;y #z'\n");
		expect(() => withEnvLine('', 'A', "it's")).toThrow('--to');
	});
});

describe('files', () => {
	it('replace a symlink instead of writing through it', async () => {
		const d = dir();
		const target = join(d, 'elsewhere');
		writeFileSync(target, 'keep');
		const link = join(d, 'key.txt');
		symlinkSync(target, link);
		await getSecret({ url: URL_, token: 't', name: 'K', to: link }, dashboard());
		expect(readFileSync(target, 'utf8')).toBe('keep');
		expect(readFileSync(link, 'utf8')).toBe(VALUE);
		expect(lstatSync(link).isSymbolicLink()).toBe(false);
	});

	it('refuse bytes that are not text for an env file', async () => {
		const fetch = dashboard().fetch;
		const binary = (async (url: string, init?: RequestInit) =>
			url === LINK ? new Response(new Uint8Array([0xff, 0xfe])) : fetch(url, init)) as typeof globalThis.fetch;
		await expect(getSecret({ url: URL_, token: 't', name: 'K', envFile: join(dir(), '.env') }, { fetch: binary })).rejects.toThrow('not text');
	});
});

describe('an env file that is a link', () => {
	it('is refused before the link is asked for, and the file it points at is never read', async () => {
		const d = dir();
		const outside = join(d, 'private.txt');
		writeFileSync(outside, 'PRIVATE-LINE');
		const env = join(d, '.env.local');
		symlinkSync(outside, env);
		const dash = dashboard();

		await expect(getSecret({ url: URL_, token: 't', name: 'K', envFile: env }, dash)).rejects.toThrow('is a link');
		expect(dash.calls).toHaveLength(0);
		expect(lstatSync(env).isSymbolicLink()).toBe(true);
		expect(readFileSync(outside, 'utf8')).toBe('PRIVATE-LINE');
	});

	it('is refused when it points nowhere, too', async () => {
		const d = dir();
		const env = join(d, '.env.local');
		symlinkSync(join(d, 'missing'), env);
		await expect(getSecret({ url: URL_, token: 't', name: 'K', envFile: env }, dashboard())).rejects.toThrow('is a link');
	});
});

/** The link and the token stay out of every message, failures included. */
describe('a failed secret command', () => {
	const ID = 'LINKID-1111111111111111111111111111';
	const kept = (e: unknown) => {
		expect(e).toBeInstanceOf(SecretError);
		const message = (e as Error).message;
		expect(message).not.toContain(ID);
		expect(message).not.toContain('proxypass');
		expect(message).not.toContain('secret-token');
		return message;
	};
	const failing = async (run: Promise<unknown>) => {
		try {
			await run;
		} catch (e) {
			return kept(e);
		}
		throw new Error('expected a refusal');
	};

	it('never quotes a link fetch could not use', async () => {
		for (const link of [`https://proxyuser:proxypass@dashboard.example.com/api/agent/secret/${ID}`, `https://dashboard.example.com:99999/api/agent/secret/${ID}`, `http://[::1/${ID}`]) {
			await failing(getSecret({ url: URL_, token: 'secret-token', name: 'K', to: join(dir(), 'x') }, dashboard({ link })));
			const from = join(dir(), 'f');
			writeFileSync(from, 'v');
			await failing(putSecret({ url: URL_, token: 'secret-token', name: 'K', from }, dashboard({ link })));
		}
	});

	it('never quotes a token with a line break in it, and sends nothing', async () => {
		const d = dashboard();
		const message = await failing(getSecret({ url: URL_, token: 'secret-token\nBBBB', name: 'K', to: join(dir(), 'x') }, d));
		expect(message).toContain('line break');
		expect(d.calls).toHaveLength(0);
	});

	it('turns whatever fetch throws into a fixed sentence', async () => {
		const throwing = (async (url: string) => {
			throw new TypeError(`Failed to parse URL from ${url} secret-token`);
		}) as unknown as typeof globalThis.fetch;
		await failing(getSecret({ url: URL_, token: 'secret-token', name: 'K', to: join(dir(), 'x') }, { fetch: throwing }));
	});
});

describe('where a secret link may point', () => {
	it('resolves a path against the dashboard, and keeps a link on it', () => {
		expect(linkFrom(`${URL_}/mcp`, '/api/agent/secret/x')).toBe(`${URL_}/api/agent/secret/x`);
		expect(linkFrom(URL_, LINK)).toBe(LINK);
	});

	it('refuses a link on any other address, and fetches nothing from it', async () => {
		const elsewhere = `https://other.example.test/api/agent/secret/${'y'.repeat(20)}`;
		expect(() => linkFrom(URL_, elsewhere)).toThrow('another address');
		expect(() => linkFrom(URL_, 'http://dashboard.example.com/x')).toThrow('another address');
		const d = dashboard({ link: elsewhere });
		await expect(getSecret({ url: URL_, token: 't', name: 'K', to: join(dir(), 'x') }, d)).rejects.toThrow('another address');
		expect(d.calls.map((c) => c.url)).toEqual([`${URL_}/mcp`]);

		const from = join(dir(), 'f');
		writeFileSync(from, 'v');
		const p = dashboard({ link: elsewhere });
		await expect(putSecret({ url: URL_, token: 't', name: 'K', from }, p)).rejects.toThrow('another address');
		expect(p.stored()).toBeNull();
	});

	it('does not follow a redirect', async () => {
		const d = dashboard();
		await getSecret({ url: URL_, token: 't', name: 'K', to: join(dir(), 'x') }, d);
		expect(d.calls[1]?.init?.redirect).toBe('error');
	});
});
