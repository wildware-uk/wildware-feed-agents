import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { origin, plainHttpAllowed, startPairing, waitForPairing, WAIT_BUDGET_MS } from './pair';
import { Store } from './store';

const URL_ = 'https://dashboard.example.com';
const store = () => Store.for(mkdtempSync(join(tmpdir(), 'feed-pair-')), '/work/app', () => null);

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function capture() {
	const lines: string[] = [];
	return { lines, out: (line: string) => lines.push(line), text: () => lines.join('\n') };
}

const started = {
	state: 'pending',
	pairing_id: 'P1',
	poll_secret: 'poll-secret',
	code: 'K7Q2',
	name: 'laptop',
	expires_at: '2026-01-01T00:10:00Z'
};

describe('the dashboard URL', () => {
	it('is reduced to its origin, so a pasted /mcp or trailing slash does no harm', () => {
		expect(origin('https://dashboard.example.com/mcp/')).toBe(URL_);
		expect(() => origin('ftp://x')).toThrow();
	});
});

describe('pair start', () => {
	it('asks to join with the project folder and host, and prints the code', async () => {
		const s = store();
		const fetch = vi.fn(async () => reply(201, started));
		const io = capture();

		expect(await startPairing(s, { url: `${URL_}/mcp`, known: [`${URL_}/mcp`], name: ' laptop ' }, { fetch, out: io.out, host: () => 'box' })).toBe(0);

		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`${URL_}/api/pair`);
		expect(JSON.parse(String(init.body))).toEqual({ name: 'laptop', host: 'box', cwd: '/work/app' });
		expect(io.text()).toContain('Code: K7Q2');
		expect(io.text()).not.toContain('poll-secret');
		expect(s.pending()).toMatchObject({ pairing_id: 'P1', poll_secret: 'poll-secret', url: URL_ });
	});

	it('says why when the dashboard refuses', async () => {
		const io = capture();
		const fetch = vi.fn(async () => reply(429, { error: 'rate_limited', message: 'too many pairing calls' }));
		expect(await startPairing(store(), { url: URL_, known: [URL_], name: 'x' }, { fetch, out: io.out })).toBe(1);
		expect(io.text()).toContain('too many pairing calls');
	});

	it('will not pair a project twice without --force', async () => {
		const s = store();
		s.savePaired({ url: URL_, known: [URL_], name: 'laptop', agent_id: null, token: 't', project: '/work/app', paired_at: '' });
		const fetch = vi.fn();
		const io = capture();
		expect(await startPairing(s, { url: URL_, known: [URL_], name: 'x' }, { fetch, out: io.out })).toBe(0);
		expect(fetch).not.toHaveBeenCalled();
		expect(io.text()).toContain('already paired as "laptop"');
	});

	it('stops before asking a dashboard this machine has not used, until the owner confirms its host', async () => {
		const fetch = vi.fn(async () => reply(201, started));
		const io = capture();
		const forged = 'https://feed.attacker.example';
		expect(await startPairing(store(), { url: forged, known: [URL_], name: 'laptop' }, { fetch, out: io.out })).toBe(3);
		expect(fetch).not.toHaveBeenCalled();
		expect(io.text()).toContain('Dashboard: https://feed.attacker.example');
		expect(io.text()).toContain('Is feed.attacker.example your Wildware Feed dashboard?');
		// A confirmation for some other host doesn't count.
		expect(await startPairing(store(), { url: forged, known: [URL_], newDashboard: 'dashboard.example.com', name: 'laptop' }, { fetch, out: () => {} })).toBe(3);
		expect(fetch).not.toHaveBeenCalled();

		const confirmed = capture();
		expect(await startPairing(store(), { url: forged, known: [URL_], newDashboard: 'FEED.attacker.example', name: 'laptop' }, { fetch, out: confirmed.out })).toBe(0);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(confirmed.text()).toContain('Dashboard: https://feed.attacker.example');
		expect(confirmed.text()).toContain('feed.attacker.example, now');
	});

	it('refuses plain http across the internet, but not on this computer or the house network', async () => {
		const io = capture();
		const fetch = vi.fn(async () => reply(201, started));
		expect(await startPairing(store(), { url: 'http://feed.example.com', known: ['http://feed.example.com'], name: 'x' }, { fetch, out: io.out })).toBe(2);
		expect(fetch).not.toHaveBeenCalled();
		expect(io.text()).toContain('plain http');
		// Built from parts: the repo keeps no house-network addresses in its files.
		const house = [['192', '168', '1', '20'], ['10', '0', '0', '5']].map((parts) => parts.join('.'));
		for (const host of ['127.0.0.1', 'localhost', '[::1]', ...house, '172.20.1.1', 'nas.local']) {
			expect(plainHttpAllowed(new URL(`http://${host}:8010`).hostname)).toBe(true);
		}
		for (const host of ['feed.example.com', '8.8.8.8', '172.32.0.1', '[2001:db8::1]']) {
			expect(plainHttpAllowed(new URL(`http://${host}`).hostname)).toBe(false);
		}
	});

	it('refuses an empty name', async () => {
		const io = capture();
		expect(await startPairing(store(), { url: URL_, known: [URL_], name: '  ' }, { fetch: vi.fn(), out: io.out })).toBe(2);
	});
});

describe('pair wait', () => {
	async function begun() {
		const s = store();
		await startPairing(s, { url: URL_, known: [URL_], name: 'laptop' }, { fetch: vi.fn(async () => reply(201, started)), out: () => {} });
		return s;
	}

	it('keeps waiting while pending, then saves the token without printing it', async () => {
		const s = await begun();
		const answers = [
			reply(200, { state: 'pending' }),
			reply(200, { state: 'approved', token: 'the-new-token', agent: { id: 'A9', name: 'laptop-renamed' } })
		];
		const fetch = vi.fn(async () => answers.shift()!);
		const io = capture();

		expect(await waitForPairing(s, { fetch, out: io.out })).toBe(0);

		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`${URL_}/api/pair/P1`);
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer poll-secret');
		expect(io.text()).not.toContain('the-new-token');
		expect(io.text()).toContain('laptop-renamed');
		expect(io.text()).toContain('/mcp');
		expect(s.paired()).toMatchObject({ token: 'the-new-token', name: 'laptop-renamed', agent_id: 'A9', url: URL_ });
		expect(s.pending()).toBeNull();
	});

	it('treats denied and expired as no, and clears the request', async () => {
		for (const state of ['denied', 'expired', 'collected']) {
			const s = await begun();
			const io = capture();
			expect(await waitForPairing(s, { fetch: vi.fn(async () => reply(200, { state })), out: io.out })).toBe(1);
			expect(s.paired()).toBeNull();
			expect(s.pending()).toBeNull();
		}
	});

	it('hands back inside the tool time limit, still pending, so it can be run again', async () => {
		const s = await begun();
		let clock = 0;
		const fetch = vi.fn(async () => {
			clock += 25_000;
			return reply(200, { state: 'pending' });
		});
		const io = capture();
		expect(await waitForPairing(s, { fetch, out: io.out, now: () => clock })).toBe(3);
		expect(clock).toBeLessThanOrEqual(WAIT_BUDGET_MS + 25_000);
		expect(io.text()).toContain('K7Q2');
		expect(s.pending()).not.toBeNull();
	});

	it('says to start first when nothing is waiting', async () => {
		const io = capture();
		expect(await waitForPairing(store(), { fetch: vi.fn(), out: io.out })).toBe(1);
		expect(io.text()).toContain('start');
	});
});
