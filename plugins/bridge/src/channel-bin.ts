/**
 * Entry point for `bin/channel.mjs`, the channel Claude Code spawns over stdio.
 *
 * The URL comes from the plugin's options through the MCP
 * config's `env`; the token comes from the store, so a project paired after the
 * session started is heard without a restart.
 */
import { parseArgs } from 'node:util';
import { main } from './channel';
import { claimEnv, readSettings } from './cli';
import { Store } from './store';

const { values } = parseArgs({ args: process.argv.slice(2), options: { data: { type: 'string' }, project: { type: 'string' } } });
const data = values.data?.trim() || process.env.CLAUDE_PLUGIN_DATA?.trim();
if (!data) {
	process.stderr.write('agent-dashboard channel: --data <plugin data folder> is required\n');
	process.exit(1);
}
const store = Store.for(data, values.project?.trim() || process.env.CLAUDE_PROJECT_DIR?.trim() || process.cwd());
const settings = readSettings(store);
const env = claimEnv(store, {
	...process.env,
	AGENT_DASHBOARD_URL: process.env.AGENT_DASHBOARD_URL?.trim() || settings?.url || ''
});
await main(env, () => store.resolve(env, env.AGENT_DASHBOARD_URL)?.token ?? null);
