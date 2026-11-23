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
 *   secret get    fetch a secret straight into a file (0600); prints only "saved …"
 *   secret put    hand a file to the owner as a secret; prints only "saved …"
 *
 * Every command takes `--data <plugin data dir>` and `--project <dir>`; the
 * plugin's own files pass `${CLAUDE_PLUGIN_DATA}` and `${CLAUDE_PROJECT_DIR}`.
 * Without `--data`, an installed copy finds its own data folder (see
 * [dataDirFor]), so an agent that has only just installed the plugin can pair
 * before anything reloads it.
 */
import { parseArgs } from 'node:util';
import { basename, dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { sameOrigin, Store, writeSecret, type Resolved } from './store';
import { startPairing, waitForPairing } from './pair';
import { channelIsLive, CLAIM_EVERY_MS } from './claim';
import { runMonitor } from './monitor';
import { getSecret, putSecret, SecretError } from './secret';
import { watch } from './follow';

/**
 * What the hook saves for the monitor. No token: that is in the store.
 *
 * No channel list either: what an agent hears is decided by the server alone
 * (what it follows). A file saved by an older plugin may still carry a
 * `projects` field; it is ignored.
 */
export type Settings = { url: string | null; monitor: 'auto' | 'off' };

/** The plugin's options, from the hook's environment, falling back to `AGENT_DASHBOARD_*`. */
export function settingsFrom(env: NodeJS.ProcessEnv): Settings {
	const pick = (option: string, fallback: string) =>
		env[`CLAUDE_PLUGIN_OPTION_${option}`]?.trim() || env[fallback]?.trim() || '';
	const url = pick('DASHBOARD_URL', 'AGENT_DASHBOARD_URL').replace(/\/+$/, '').replace(/\/mcp$/, '');
	const monitor = pick('MONITOR', 'AGENT_DASHBOARD_MONITOR').toLowerCase() === 'off' ? 'off' : 'auto';
	return { url: url || null, monitor };
}

export function readSettings(store: Store): Settings | null {
	try {
		const parsed = JSON.parse(readFileSync(store.connectionPath, 'utf8')) as Partial<Settings>;
		return {
			url: typeof parsed.url === 'string' ? parsed.url : null,
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
export function connection(store: Store, env: NodeJS.ProcessEnv): { url: string; token: string; monitor: 'auto' | 'off' } | null {
	const saved = readSettings(store);
	const url = env.AGENT_DASHBOARD_URL?.trim() || saved?.url;
	const monitor = (env.AGENT_DASHBOARD_MONITOR ?? saved?.monitor ?? 'auto').toLowerCase() === 'off' ? 'off' : 'auto';
	if (!url) return null;
	const token = store.resolve(env, url);
	if (!token) return null;
	return { url, token: token.token, monitor };
}

/** True when two connections reach the same dashboard with the same token. */
export function sameConnection(a: { url: string; token: string }, b: { url: string; token: string }): boolean {
	return a.url === b.url && a.token === b.token;
}

/**
 * Where `secret get` and `secret put` send this project's token, and which token.
 *
 * `--url` may name another dashboard, but only a token paired with that one goes
 * there: the `AGENT_DASHBOARD_TOKEN` and `agent_token` tokens belong to the
 * dashboard this plugin is set up for, and are never sent anywhere else.
 */
export function secretTarget(
	store: Store,
	env: NodeJS.ProcessEnv,
	flag: string | undefined
): { url: string; token: Resolved } | { refused: string } {
	const configured = [env.AGENT_DASHBOARD_URL?.trim(), readSettings(store)?.url, settingsFrom(env).url].filter(
		(u): u is string => !!u
	);
	const url = flag?.trim() || configured[0];
	const token = url ? store.resolve(env, url) : null;
	if (!url || !token) {
		return { refused: 'This project is not connected to the dashboard yet: pair it first (wildware-feed:connecting-to-the-feed).' };
	}
	if (token.source !== 'paired' && !configured.some((u) => sameOrigin(u, url))) {
		return { refused: `--url names a dashboard this plugin is not set up for, and only a token paired with it may go there: pair this project with it first.` };
	}
	return { url, token };
}

/** What a failed secret command prints: its own words, or a fixed sentence that holds nothing. */
export function secretFailure(e: unknown): string {
	if (e instanceof SecretError) return e.message;
	// A file error names only the path it was given (--to, --from, --env-file).
	const file = e as NodeJS.ErrnoException;
	if (e instanceof Error && typeof file.syscall === 'string' && typeof file.code === 'string') return e.message;
	return 'it failed, and nothing was saved: run it again for a fresh link';
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
			// Read the store again every few seconds and before each line: once this
			// project is unpaired or paired elsewhere, the old dashboard is dropped and
			// the loop goes back to waiting for the current one (`./follow.ts`).
			const live = watch(found, () => connection(store, env), sameConnection, MONITOR_WAIT_MS);
			try {
				await runMonitor({
					baseUrl: found.url,
					token: found.token,
					signal: live.signal,
					write: (line) => {
						if (live.still()) process.stdout.write(`${line}\n`);
					}
				});
			} finally {
				live.stop();
			}
			process.stderr.write("agent-dashboard monitor: this project's pairing changed; waiting for the current one\n");
			continue;
		}
		if (!saidUnconfigured && Date.now() - started >= SAY_AFTER_MS) {
			saidUnconfigured = true;
			const settings = readSettings(store);
			// Silent when there is no URL at all: the plugin is installed, not set up.
			if (settings?.url) {
				process.stdout.write(
					'agent-dashboard monitor: waiting — this project is not paired yet, so nothing will arrive from the dashboard until it is.\n'
				);
			}
		}
		await new Promise((r) => setTimeout(r, MONITOR_WAIT_MS));
	}
}

/**
 * The data folder Claude Code gives an installed plugin, worked out from where
 * this script sits: an installed copy lives at
 * `<config>/plugins/cache/<marketplace>/<plugin>/<version>/bin/feed.mjs`, and its
 * data at `<config>/plugins/data/<plugin>-<marketplace>`. Null for any other
 * place (a checkout, `--plugin-dir`), where `--data` is still needed.
 */
export function dataDirFor(script: string | undefined): string | null {
	if (!script) return null;
	const bin = dirname(resolve(script));
	const version = dirname(bin);
	const plugin = dirname(version);
	const marketplace = dirname(plugin);
	const cache = dirname(marketplace);
	const plugins = dirname(cache);
	if (basename(bin) !== 'bin' || basename(cache) !== 'cache' || basename(plugins) !== 'plugins') return null;
	const id = `${basename(plugin)}-${basename(marketplace)}`.replace(/[^a-zA-Z0-9_-]/g, '-');
	return join(plugins, 'data', id);
}

export async function run(argv: string[], env: NodeJS.ProcessEnv = process.env, script: string | undefined = process.argv[1]): Promise<number> {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			data: { type: 'string' },
			project: { type: 'string' },
			url: { type: 'string' },
			name: { type: 'string' },
			force: { type: 'boolean' },
			'new-dashboard': { type: 'string' },
			to: { type: 'string' },
			'env-file': { type: 'string' },
			as: { type: 'string' },
			from: { type: 'string' },
			note: { type: 'string' }
		}
	});
	const [command, sub] = positionals;
	const data = values.data?.trim() || env.CLAUDE_PLUGIN_DATA?.trim() || dataDirFor(script);
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
				return startPairing(store, {
					url,
					name: values.name ?? '',
					force: values.force,
					known: [readSettings(store)?.url, settingsFrom(env).url, store.paired()?.url],
					newDashboard: values['new-dashboard']
				});
			}
			if (sub === 'wait') return waitForPairing(store);
			say('Usage: pair start --url <dashboard> --name <agent name> [--new-dashboard <host>] | pair wait');
			return 2;
		}
		case 'secret': {
			const name = positionals[2];
			const usage =
				'Usage: secret get <NAME> --to <file> | secret get <NAME> --env-file <file> [--as VAR] | secret put <NAME> --from <file> [--note <text>]';
			if (!name || (sub !== 'get' && sub !== 'put')) {
				say(usage);
				return 2;
			}
			const target = secretTarget(store, env, values.url);
			if ('refused' in target) {
				say(target.refused);
				return 2;
			}
			const { url, token } = target;
			try {
				if (sub === 'get') {
					say(await getSecret({ url, token: token.token, name, to: values.to, envFile: values['env-file'], as: values.as }));
				} else {
					if (!values.from) {
						say(usage);
						return 2;
					}
					say(await putSecret({ url, token: token.token, name, from: values.from, note: values.note }));
				}
				return 0;
			} catch (e) {
				// The dashboard's words, never a value, a link or a token.
				say(`secret ${sub} ${name}: ${secretFailure(e)}`);
				return 1;
			}
		}
		default:
			say('Usage: feed.mjs <headers|session-start|monitor|status|forget|pair start|pair wait|secret get|secret put> --data <dir> [--project <dir>]');
			return 2;
	}
}
/* c8 ignore stop */
