/**
 * Keep a long-lived stream tied to what the store says now.
 *
 * The channel and the monitor run for the whole session. Unpairing (`forget`)
 * or pairing with another dashboard only changes files, so without this a
 * running session would keep hearing the dashboard it started with, and keep
 * calling its messages the owner's. Here the store is read again every few
 * seconds and before every notification: once the token (or the dashboard) is
 * no longer this project's, the stream is dropped and nothing more from it is
 * said.
 */

/** A connection that stays live only while the store still says it should. */
export type Live = {
	/** Aborts once the store has moved on. Hand it to `runBridge` or `runMonitor`. */
	signal: AbortSignal;
	/** True while the store still says the same; false (and aborts) once it does not. */
	still: () => boolean;
	stop: () => void;
};

/** Watch `current()` for as long as it still matches `opened`, checked every `everyMs`. */
export function watch<T>(
	opened: T,
	current: () => T | null,
	same: (a: T, b: T) => boolean,
	everyMs: number,
	parent?: AbortSignal
): Live {
	const controller = new AbortController();
	const onParent = () => controller.abort();
	parent?.addEventListener('abort', onParent, { once: true });
	if (parent?.aborted) controller.abort();

	const still = (): boolean => {
		if (controller.signal.aborted) return false;
		const now = current();
		if (now !== null && same(now, opened)) return true;
		controller.abort();
		return false;
	};
	const timer = setInterval(still, everyMs);
	timer.unref?.();

	return {
		signal: controller.signal,
		still,
		stop: () => {
			clearInterval(timer);
			parent?.removeEventListener('abort', onParent);
			controller.abort();
		}
	};
}

export type FollowOptions<T> = {
	/** What the store says now: a token, or a whole connection; null while there is none. */
	current: () => T | null;
	same?: (a: T, b: T) => boolean;
	/** Run one stream. It must stop when `live.signal` aborts. */
	serve: (value: T, live: Live) => Promise<void>;
	waitMs: number;
	signal?: AbortSignal;
	sleep?: (ms: number) => Promise<void>;
};

/**
 * Serve whatever the store gives, and start again whenever it changes: wait
 * while there is nothing, drop a stream whose token is no longer current, and
 * open the next one with the new token.
 */
export async function follow<T>(options: FollowOptions<T>): Promise<void> {
	const { current, serve, waitMs, signal } = options;
	const same = options.same ?? ((a: T, b: T) => a === b);
	const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

	while (!signal?.aborted) {
		const value = current();
		if (value === null) {
			await sleep(waitMs);
			continue;
		}
		const live = watch(value, current, same, waitMs, signal);
		try {
			await serve(value, live);
		} finally {
			// A stream that ended by itself while still current is retried after a pause, not in a spin.
			const changed = live.signal.aborted;
			live.stop();
			if (!changed && !signal?.aborted) await sleep(waitMs);
		}
	}
}
