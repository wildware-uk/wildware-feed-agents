/**
 * Files from the Wildware Feed server, which lives in another repo
 * (wildware-uk/wildware-feed). The tests check the skills against what the server
 * really offers, so a tool renamed there fails here.
 *
 * Where they come from, first match wins:
 *   FEED_SERVER_DIR   a local checkout of wildware-feed (to test against unmerged server work)
 *   otherwise         its master branch on raw.githubusercontent.com
 *
 * In CI a failed download is an error. Elsewhere, so the tests still run offline, the
 * tool list falls back to the evals' copy and checks that need the server are skipped.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SERVER_REPO = 'wildware-uk/wildware-feed';
const RAW = `https://raw.githubusercontent.com/${SERVER_REPO}/master/`;
const ROOT = resolve(import.meta.dirname, '../../..');

export const TOOLS_LIST = 'server/src/main/resources/mcp/tools-list.json';
export const INSTRUCTIONS = 'server/src/main/resources/mcp/instructions.txt';
/** What a plain `/mcp` adds to the instructions where `{{tools}}` stands: how to find and run tools. */
export const DISCOVERY_INSTRUCTIONS = 'server/src/main/resources/mcp/instructions-discovery.txt';
/** The three tools a plain `/mcp` lists: list_tools, describe_tools and call_tool. */
export const DISCOVERY_TOOLS = 'server/src/main/resources/mcp/discovery-tools.json';

/** The file's text, or null when it cannot be had and this is not CI. */
export async function serverFile(path: string): Promise<string | null> {
	const local = process.env.FEED_SERVER_DIR?.trim();
	if (local) return readFileSync(resolve(local, path), 'utf8');
	try {
		const response = await fetch(RAW + path, { signal: AbortSignal.timeout(15_000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.text();
	} catch (error) {
		if (process.env.CI) throw new Error(`could not fetch ${RAW + path}: ${String(error)}`);
		console.warn(`offline: could not fetch ${path} from ${SERVER_REPO} (${String(error)})`);
		return null;
	}
}

/**
 * The names of every MCP tool the server offers, and of the discovery tools that run them
 * (`call_tool({ name, arguments })`), which a plain `/mcp` lists instead.
 */
export async function serverTools(): Promise<{ names: string[]; discovery: string[]; live: boolean }> {
	const text = await serverFile(TOOLS_LIST);
	const names = (list: string) => (JSON.parse(list) as { name: string }[]).map((t) => t.name);
	if (text) {
		const discovery = await serverFile(DISCOVERY_TOOLS);
		return { names: names(text), discovery: discovery ? names(discovery) : OFFLINE_DISCOVERY, live: true };
	}
	// Offline: the evals' copy, one describe_tools answer per tool (plugins/bridge/eval-mocks.mjs).
	const copies = readdirSync(resolve(ROOT, 'plugins/wildware-feed/evals/mocks/agent-dashboard/describe'));
	return { names: copies.filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)), discovery: OFFLINE_DISCOVERY, live: false };
}

const OFFLINE_DISCOVERY = ['list_tools', 'describe_tools', 'call_tool'];
