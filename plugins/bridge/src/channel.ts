/**
 * The channel's MCP half: the one part of the bridge that needs the MCP SDK.
 *
 * Kept apart from `./bridge.ts` so `bin/feed.mjs` (the monitor, the hook, the
 * header helper and pairing) does not carry the SDK it never uses.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CAPABILITIES, CHANNEL_NAME, INSTRUCTIONS, runBridge } from './bridge';
import { CLAIM_EVERY_MS, stampClaim } from './claim';

/** Build the MCP server half: the capability declaration and nothing else. */
export function createChannelServer(): Server {
	return new Server(
		{ name: CHANNEL_NAME, version: '0.1.0' },
		{ capabilities: CAPABILITIES, instructions: INSTRUCTIONS }
	);
}

/**
 * Wire the MCP server to the bridge and run until the process is killed.
 *
 * `token`, when given, is asked for the token instead of reading
 * `AGENT_DASHBOARD_TOKEN`, and asked again every few seconds until it has one.
 * That is how a project paired mid-session starts hearing the dashboard without
 * a restart: the channel is already connected to Claude Code and simply waits.
 */
export async function main(
	env: NodeJS.ProcessEnv = process.env,
	token: () => string | null = () => env.AGENT_DASHBOARD_TOKEN?.trim() || null,
	waitMs = 5_000
): Promise<void> {
	const baseUrl = env.AGENT_DASHBOARD_URL?.trim();
	if (!baseUrl) {
		// stderr, never stdout: stdout is the MCP transport, and a stray line on it
		// is a protocol error rather than a message anybody reads.
		process.stderr.write('agent-dashboard channel: set AGENT_DASHBOARD_URL (the plugin\'s dashboard_url)\n');
		process.exitCode = 1;
		return;
	}

	const mcp = createChannelServer();
	await mcp.connect(new StdioServerTransport());

	let current = token();
	while (!current) {
		await new Promise((resolve) => setTimeout(resolve, waitMs));
		current = token();
	}

	// Say this session is being delivered to, so the plugin's monitor stands
	// aside rather than repeating every reply (`./claim.ts`). Re-stamped on an
	// interval because a claim nobody renews has to expire: a channel that was
	// killed must not silence every monitor that comes after it. `unref` so this
	// timer is never the reason the process stays alive.
	stampClaim(env);
	const claim = setInterval(() => stampClaim(env), CLAIM_EVERY_MS);
	claim.unref?.();

	try {
		await runBridge({
			baseUrl,
			token: current,
			log: (message) => process.stderr.write(`agent-dashboard channel: ${message}\n`),
			notify: (content, meta) =>
				mcp.notification({ method: 'notifications/claude/channel', params: { content, meta } })
		});
	} finally {
		clearInterval(claim);
	}
}
