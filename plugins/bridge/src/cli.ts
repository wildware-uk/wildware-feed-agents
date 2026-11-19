/**
 * `bin/feed.mjs`: everything the plugin runs except the channel, as subcommands.
 *
 *   headers       the MCP header helper: prints {"Authorization": "Bearer …"}
 *   session-start the SessionStart hook: saves settings, prints the reminder
 *   monitor       the background monitor (one line per event on stdout)
 *   pair start    ask the owner to let this project join, print the code
 *   pair wait     wait for their decision and save the token
 *   status        say whether this project is paired, and as whom
 *   forget        drop this project's token
 *
 * Every command takes `--data <plugin data dir>` and `--project <dir>`; the
 * plugin's own files pass `${CLAUDE_PLUGIN_DATA}` and `${CLAUDE_PROJECT_DIR}`.
 */
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { Store, writeSecret } from './store';
import { startPairing, waitForPairing } from './pair';
import { channelIsLive, CLAIM_EVERY_MS } from './claim';
import { runMonitor } from './monitor';

/** What the hook saves for the monitor. No token: that is in the store. */
export type Settings = { url: string | null; projects: string; monitor: 'auto' | 'off' };

/** The plugin's options, from the hook's environment, falling back to `AGENT_DASHBOARD_*`. */
export function settingsFrom(env: NodeJS.ProcessEnv): Settings {
	const pick = (option: string, fallback: string) =>
		env[`CLAUDE_PLUGIN_OPTION_${option}`]?.trim() || env[fallback]?.trim() || '';
	const url = pick('DASHBOARD_URL', 'AGENT_DASHBOARD_URL').replace(/\/+$/, '').replace(/\/mcp$/, '');
	const monitor = pick('MONITOR', 'AGENT_DASHBOARD_MONITOR').toLowerCase() === 'off' ? 'off' : 'auto';
	return { url: url || null, projects: pick('PROJECTS', 'AGENT_DASHBOARD_PROJECTS'), monitor };
}

export function readSettings(store: Store): Settings | null {
	try {
		const parsed = JSON.parse(readFileSync(store.connectionPath, 'utf8')) as Partial<Settings>;
		return {
			url: typeof parsed.url === 'string' ? parsed.url : null,
			projects: typeof parsed.projects === 'string' ? parsed.projects : '',
			monitor: parsed.monitor === 'off' ? 'off' : 'auto'
		};
	} catch {
		return null;
	}
}

/**
 * The SessionStart hook. Returns what to print, which becomes context.
 *
 * Silent when the plugin has no dashboard URL: an owner who installed it and
 * has not set it up yet has not asked for a reminder in every session.
 */
export function sessionStart(store: Store, env: NodeJS.ProcessEnv): string {
	const settings = settingsFrom(env);
	try {
		writeSecret(store.connectionPath, settings);
		store.saveOptionToken(env.CLAUDE_PLUGIN_OPTION_AGENT_TOKEN);
	} catch {
		// A read-only data folder costs the monitor, not the session.
	}

	if (!settings.url) return '';

	const token = store.resolve(env, settings.url);
	if (!token) {
		return [
			`Wildware Feed: this project is not connected to the dashboard at ${settings.url} yet.`,
			'If the owner asks you to connect, or wants you on the dashboard, use the',
			'wildware-feed:connecting-to-the-feed skill. It pairs this project with their approval.'
		].join('\n');
	}

	const who = token.name ? ` as "${token.name}"` : '';
	return [
		`Wildware Feed: your owner may be watching this run at ${settings.url}${who}.`,
		'register_session first and heartbeat on the interval it returns; end_session when done.',
		'Acknowledge every owner message (read, then thinking, then done) and reply in its thread',
		'with post_message. Ask with request_input instead of guessing; a timeout is not a yes.',
		'Skill: wildware-feed:working-with-the-feed.'
	].join('\n');
}

/** The header helper's output: a bearer token for this project, or nothing. */
export function headers(store: Store, env: NodeJS.ProcessEnv): Record<string, string> {
	const token = store.resolve(env, env.CLAUDE_CODE_MCP_SERVER_URL);
	return token ? { Authorization: `Bearer ${token.token}` } : {};
}

/** What the monitor and channel need, or null while something is missing. */
export function connection(store: Store, env: NodeJS.ProcessEnv): { url: string; token: string; projects: string[]; monitor: 'auto' | 'off' } | null {
	const saved = readSettings(store);
	const url = env.AGENT_DASHBOARD_URL?.trim() || saved?.url;
	const projects = (env.AGENT_DASHBOARD_PROJECTS?.trim() || saved?.projects || '')
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean);
	const monitor = (env.AGENT_DASHBOARD_MONITOR ?? saved?.monitor ?? 'auto').toLowerCase() === 'off' ? 'off' : 'auto';
	if (!url || projects.length === 0) return null;
	const token = store.resolve(env, url);
	if (!token) return null;
	return { url, token: token.token, projects, monitor };
}

/** The env the claim code reads: the data folder and this project's key. */
export function claimEnv(store: Store, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
	return { ...env, CLAUDE_PLUGIN_DATA: store.data, WILDWARE_FEED_PROJECT_KEY: store.key };
}

function status(store: Store, env: NodeJS.ProcessEnv): string {
	const settings = readSettings(store);
	const paired = store.paired();
	const pending = store.pending();
	const lines = [`Project: ${store.root}`, `Dashboard: ${settings?.url ?? 'not set (dashboard_url under /plugin)'}`];
	if (paired) lines.push(`Paired as "${paired.name}" with ${paired.url} on ${paired.paired_at}.`);
	else lines.push('Not paired.');
	if (pending) lines.push(`A pairing is waiting for the owner: code ${pending.code}. Run \`pair wait\`.`);
	const token = store.resolve(env, settings?.url ?? undefined);
	lines.push(
		token
			? `Token in use: ${token.source === 'env' ? 'AGENT_DASHBOARD_TOKEN' : token.source === 'paired' ? 'this project\'s pairing' : 'the agent_token plugin option'}.`
			: 'No token: the dashboard tools will be refused until this project is paired.'
	);
	return lines.join('\n');
}

const MONITOR_WAIT_MS = 5_000;
const SAY_AFTER_MS = 20_000;

/* c8 ignore start -- the process wrapper; what it calls is tested. */
async function monitor(store: Store, env: NodeJS.ProcessEnv): Promise<void> {
	const started = Date.now();
	let saidUnconfigured = false;
	let saidStandby = false;
	const claims = claimEnv(store, env);

	for (;;) {
		const found = connection(store, env);
		if (found?.monitor === 'off') {
			process.stderr.write('agent-dashboard monitor: off by configuration\n');
			return;
		}
		if (found && channelIsLive(claims)) {
			if (!saidStandby) {
				saidStandby = true;
				process.stderr.write('agent-dashboard monitor: the channel is delivering for this session; standing by\n');
			}
			await new Promise((r) => setTimeout(r, CLAIM_EVERY_MS));
			continue;
		}
		if (found) {
			await runMonitor({ baseUrl: found.url, token: found.token, projects: found.projects });
			return;
		}
		if (!saidUnconfigured && Date.now() - started >= SAY_AFTER_MS) {
			saidUnconfigured = true;
			const settings = readSettings(store);
			// Silent when there is no URL at all: the plugin is installed, not set up.
			if (settings?.url) {
				process.stdout.write(
					settings.projects
						? 'agent-dashboard monitor: waiting — this project is not paired yet, so nothing will arrive from the dashboard until it is.\n'
						: 'agent-dashboard monitor: not configured — set projects under /plugin (or * for every project), then restart the session.\n'
				);
			}
		}
		await new Promise((r) => setTimeout(r, MONITOR_WAIT_MS));
	}
}

export async function run(argv: string[], env: NodeJS.ProcessEnv = process.env): Promise<number> {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			data: { type: 'string' },
			project: { type: 'string' },
			url: { type: 'string' },
			name: { type: 'string' },
			force: { type: 'boolean' }
		}
	});
	const [command, sub] = positionals;
	const data = values.data?.trim() || env.CLAUDE_PLUGIN_DATA?.trim();
	const project = values.project?.trim() || env.CLAUDE_PROJECT_DIR?.trim() || process.cwd();
	if (!data) {
		process.stderr.write('wildware-feed: --data <plugin data folder> is required\n');
		return 2;
	}
	const store = Store.for(data, project);
	const say = (text: string) => {
		if (text) process.stdout.write(`${text}\n`);
	};

	switch (command) {
		case 'headers':
			say(JSON.stringify(headers(store, env)));
			return 0;
		case 'session-start':
			say(sessionStart(store, env));
			return 0;
		case 'monitor':
			await monitor(store, env);
			return 0;
		case 'status':
			say(status(store, env));
			return 0;
		case 'forget':
			say(store.forget() ? 'Forgot this project\'s token. It is no longer paired.' : 'This project was not paired.');
			store.clearPending();
			return 0;
		case 'pair': {
			if (sub === 'start') {
				const url = values.url?.trim() || readSettings(store)?.url || settingsFrom(env).url;
				if (!url || url.includes('${')) {
					say('No dashboard URL. Pass --url https://your-dashboard, or set dashboard_url under /plugin.');
					return 2;
				}
				return startPairing(store, { url, name: values.name ?? '', force: values.force });
			}
			if (sub === 'wait') return waitForPairing(store);
			say('Usage: pair start --url <dashboard> --name <agent name> | pair wait');
			return 2;
		}
		default:
			say('Usage: feed.mjs <headers|session-start|monitor|status|forget|pair start|pair wait> --data <dir> [--project <dir>]');
			return 2;
	}
}
/* c8 ignore stop */
