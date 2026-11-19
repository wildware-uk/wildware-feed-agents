/**
 * The dashboard as a Claude Code **monitor** — the fallback for sessions where
 * channels are off.
 *
 * A channel is the good version of this: it pushes a structured notification
 * into a running session. But channels are a research preview, custom ones are
 * not on Anthropic's allowlist, and a session only gets one if it was launched
 * with `--dangerously-load-development-channels`. Every other session — which is
 * most of them — hears nothing until its next `heartbeat`.
 *
 * A monitor needs no flag. Claude Code runs the command for the life of the
 * session and turns **every line it writes to stdout** into a notification. So
 * this is the same bridge with a different mouth: `runBridge` does the reading,
 * the backoff and the deciding, and `notify` writes a line instead of a
 * `notifications/claude/channel`.
 *
 * ```
 *   dashboard ──SSE /api/agent/stream──▶ monitor (this file) ──stdout line──▶ Claude Code
 * ```
 *
 * Two differences from the channel, both forced by the transport:
 *
 * - **One line per notification.** A message body is markdown and often several
 *   paragraphs; delivered raw it would become one notification per line, which
 *   is a burst of interruptions carrying one thought. {@link oneLine} collapses
 *   it and says so with an ellipsis rather than pretending the rest was not
 *   there.
 * - **No metadata.** A channel event carries ids on the tag; a line of stdout is
 *   a line of stdout. The ids are in the tools, which is where an agent has to
 *   go anyway — so the line says what happened and which project, and
 *   `get_messages` does the rest.
 *
 * Diagnostics still go to stderr, and now it matters twice over: on the channel
 * stdout was the MCP transport, and here it is the notification stream. A stray
 * log line would become a notification.
 */
import { runBridge } from './bridge';

/** How much of a message body one notification carries. */
export const LINE_MAX = 300;

/**
 * A notification as a single line.
 *
 * Newlines and runs of whitespace become single spaces, because the transport
 * is line-based and a body that kept its own would arrive as several
 * interruptions rather than one. Over-long text is cut at a word boundary with
 * an ellipsis: the agent is being told *that* something happened and roughly
 * what, and it reads the rest with the tools.
 */
export function oneLine(content: string, max = LINE_MAX): string {
	const flat = content.replace(/\s+/g, ' ').trim();
	if (flat.length <= max) return flat;

	const head = flat.slice(0, max - 1);
	const space = head.lastIndexOf(' ');
	return `${(space > max / 2 ? head.slice(0, space) : head).trimEnd()}…`;
}

export type MonitorOptions = {
	baseUrl: string;
	token: string;
	projects: readonly string[];
	/** Test seam: where a line goes. Defaults to stdout. */
	write?: (line: string) => void;
	/** Test seam: diagnostics. Defaults to stderr. */
	log?: (message: string) => void;
	fetch?: typeof globalThis.fetch;
	sleep?: (ms: number) => Promise<void>;
	signal?: AbortSignal;
};

/**
 * Read the dashboard until the session ends, writing one line per event.
 *
 * Two things the bridge treats as diagnostics are promoted to the session here,
 * because on a monitor stderr goes nowhere an agent can see and "misconfigured"
 * would look exactly like "quiet dashboard":
 *
 * - **the first connection**, so a session can tell the monitor is up at all;
 * - **a refusal**, which is nearly always a token that is wrong or revoked.
 *
 * Reconnects stay quiet. A dashboard that was restarted, or a laptop that
 * closed its lid, is not news — it is the ordinary weather of a long session,
 * and a notification per retry would be the monitor talking about itself
 * instead of about the work.
 */
export async function runMonitor(options: MonitorOptions): Promise<void> {
	const write = options.write ?? ((line: string) => process.stdout.write(`${line}\n`));
	const diagnose =
		options.log ??
		((message: string) => process.stderr.write(`agent-dashboard monitor: ${message}\n`));

	let announcedConnection = false;
	let announcedRefusal = false;

	const log = (message: string) => {
		diagnose(message);

		if (message === 'connected') {
			// A refusal after a good connection is news again: the token was fine and
			// has since been revoked, which is worth hearing a second time.
			announcedRefusal = false;
			if (announcedConnection) return;
			announcedConnection = true;
			write('agent-dashboard monitor: connected — watching the dashboard for this session.');
			return;
		}

		const refused = /^stream refused: (\d+)/.exec(message);
		if (refused && !announcedRefusal) {
			announcedRefusal = true;
			write(
				refused[1] === '401'
					? 'agent-dashboard monitor: refused (401) — the agent token is wrong or revoked. ' +
							'Pair this project again (the connecting-to-the-feed skill) or set a new ' +
							'agent_token under /plugin.'
					: `agent-dashboard monitor: the dashboard refused the connection (${refused[1]}). ` +
							'Retrying; check the dashboard URL and that the deployment is up.'
			);
		}
	};

	await runBridge({
		baseUrl: options.baseUrl,
		token: options.token,
		projects: options.projects,
		fetch: options.fetch,
		sleep: options.sleep,
		signal: options.signal,
		log,
		notify: (content) => {
			write(oneLine(content));
			return Promise.resolve();
		}
	});
}
