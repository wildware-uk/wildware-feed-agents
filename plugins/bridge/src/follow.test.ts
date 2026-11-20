import { describe, expect, it, vi } from 'vitest';
import { runBridge } from './bridge';
import { follow, watch } from './follow';
import { runMonitor } from './monitor';

/**
 * Unpairing, or pairing with another dashboard, while a session runs.
 *
 * Both only change files. The channel and the monitor must notice, drop the old
 * stream, say nothing more from it, and connect with the new token.
 */

const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

/** An SSE body this test writes into, closed when the request is aborted. */
function stream(signal: AbortSignal | undefined) {
	const encoder = new TextEncoder();
	let push: (text: string) => void = () => {};
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			push = (text) => controller.enqueue(encoder.encode(text));
			signal?.addEventListener('abort', () => controller.error(new Error('aborted')));
		}
	});
	return { body, push: (text: string) => push(text) };
}

const owner = (id: string, body: string) =>
	`event: message\ndata: ${JSON.stringify({ messages: [{ message_id: id, project: 'demo', project_name: 'Demo', author: 'human', body }] })}\n\n`;

/** A fake dashboard: every stream request is kept, with the token it carried. */
function dashboard() {
	const opened: { token: string; push: (text: string) => void; signal?: AbortSignal }[] = [];
	const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
		const auth = new Headers(init?.headers).get('authorization') ?? '';
		const s = stream(init?.signal ?? undefined);
		opened.push({ token: auth.replace('Bearer ', ''), push: s.push, signal: init?.signal ?? undefined });
		return new Response(s.body, { status: 200 });
	});
	return { opened, fetch: fetch as unknown as typeof globalThis.fetch };
}

describe('a stream that follows the store', () => {
	it('stops announcing the old dashboard once the token is gone, and reconnects with the new one', async () => {
		let token: string | null = 'token-A';
		const said: string[] = [];
		const stop = new AbortController();
		const { opened, fetch } = dashboard();

		const running = follow({
			current: () => token,
			waitMs: 10,
			signal: stop.signal,
			serve: (value, live) =>
				runBridge({
					baseUrl: 'https://dash.test',
					token: value,
					fetch,
					signal: live.signal,
					sleep: () => tick(5),
					notify: async (content) => {
						if (live.still()) said.push(content);
					}
				})
		});

		await tick();
		expect(opened).toHaveLength(1);
		expect(opened[0]!.token).toBe('token-A');
		opened[0]!.push(owner('m1', 'before forget'));
		await tick();

		// `forget`: the token file is gone.
		token = null;
		opened[0]!.push(owner('m2', 'after forget'));
		await tick();
		expect(opened[0]!.signal?.aborted).toBe(true);

		// Paired with another dashboard.
		token = 'token-B';
		await tick();
		stop.abort();
		await running;

		expect(said).toEqual(['Your owner on "Demo": before forget']);
		expect(opened.slice(1).map((o) => o.token)).toEqual(['token-B']);
	});

	it('drops a monitor line from the old dashboard the moment the store has moved on', async () => {
		let token: string | null = 'token-A';
		const lines: string[] = [];
		const { opened, fetch } = dashboard();
		const live = watch('token-A', () => token, (a, b) => a === b, 60_000);

		const running = runMonitor({
			baseUrl: 'https://dash.test',
			token: 'token-A',
			fetch,
			signal: live.signal,
			log: () => {},
			sleep: () => tick(5),
			write: (line) => {
				if (live.still()) lines.push(line);
			}
		});

		await tick();
		opened[0]!.push(owner('m1', 'before'));
		await tick();
		token = 'token-B';
		opened[0]!.push(owner('m2', 'after re-pairing'));
		await tick();
		await running;
		live.stop();

		expect(lines.some((l) => l.includes('before'))).toBe(true);
		expect(lines.some((l) => l.includes('after re-pairing'))).toBe(false);
		expect(live.signal.aborted).toBe(true);
	});

	it('waits while there is no token, and stops when told to', async () => {
		const stop = new AbortController();
		const serve = vi.fn();
		let waits = 0;

		await follow({
			current: () => null,
			waitMs: 10,
			signal: stop.signal,
			serve,
			sleep: async () => {
				waits += 1;
				if (waits === 3) stop.abort();
			}
		});

		expect(serve).not.toHaveBeenCalled();
		expect(waits).toBe(3);
	});
});
