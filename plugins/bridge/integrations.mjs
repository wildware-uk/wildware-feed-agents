/**
 * Turns the Claude Code plugin's skills into every other client's format.
 *
 * The master copy of the guidance is plugins/wildware-feed/skills/. Everything under
 * integrations/ that says what an agent should do is generated from it here, so the
 * clients cannot drift apart. The one skill that differs, connecting-to-the-feed,
 * has its non-Claude master in integrations/source/, because pairing works differently
 * without the plugin's script.
 *
 *   node integrations.mjs              write every generated file
 *   node integrations.mjs --check      fail if a committed copy is out of date
 *   node integrations.mjs links <url>  print the Cursor and VS Code install links for your dashboard
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SKILLS = 'plugins/wildware-feed/skills';
const SOURCE = 'integrations/source';
/** The one folder that is a Codex plugin, a Gemini CLI extension and an Antigravity plugin at once. */
export const PACKAGE = 'integrations/wildware-feed';

/** Names every client config shares, so a skill can say them once. */
export const SERVER = 'agent-dashboard';
export const EXAMPLE_URL = 'https://dashboard.example.com';
export const TOKEN_ENV = 'AGENT_DASHBOARD_TOKEN';
export const URL_ENV = 'AGENT_DASHBOARD_URL';
const REPO = 'https://github.com/wildware-uk/wildware-feed-agents';
const DESCRIPTION =
	'Report to a human owner while you work: post updates, answer their messages in the thread, and ask questions they answer from their phone.';

const read = (path) => readFileSync(join(ROOT, path), 'utf8');

function generatedNote(from) {
	return `<!-- Generated from ${from} by plugins/bridge/integrations.mjs. Do not edit. -->`;
}

/** Splits a SKILL.md into its frontmatter fields and its body. */
export function parseSkill(text) {
	const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
	if (!m) throw new Error('a skill must start with --- frontmatter ---');
	const fields = {};
	for (const line of m[1].split('\n')) {
		const f = /^(\w[\w-]*):\s*(.*)$/.exec(line);
		if (f) fields[f[1]] = f[2];
	}
	return { fields, body: text.slice(m[0].length).replace(/^\n+/, '') };
}

/** Replaces exact text, failing loudly when the master copy no longer has it. */
function swap(text, from, to, where) {
	if (!text.includes(from)) throw new Error(`${where}: expected to find ${JSON.stringify(from)}; the master skill changed, update integrations.mjs`);
	return text.split(from).join(to);
}

/** Drops a `## heading` section up to the next heading of the same level or the end. */
function dropSection(text, heading, where) {
	const start = text.indexOf(`\n${heading}\n`);
	if (start < 0) throw new Error(`${where}: expected a section ${JSON.stringify(heading)}; the master skill changed, update integrations.mjs`);
	const next = text.indexOf('\n## ', start + heading.length + 2);
	return text.slice(0, start + 1) + (next < 0 ? '' : text.slice(next + 1));
}

/**
 * What changes for a client that is not Claude Code: no monitor, no channel, no plugin
 * script. Each edit names the exact text it expects, so a master edit that moves it
 * fails the freshness test instead of leaving a Claude-only line behind.
 */
const NEUTRAL_EDITS = {
	'answering-the-owner': (t, w) => {
		t = swap(t, 'a monitor line such as "Your owner on <project>: ...", a <channel source="...agent-dashboard-channel"> event, ', '', w);
		return dropSection(t, '## Monitor lines and channel events', w);
	},
	'marking-work': (t, w) => swap(t, 'heartbeat or monitor line reports', 'heartbeat reports', w),
	'working-with-the-feed': (t, w) => swap(t, 'a message, monitor line or channel event arrived.', 'a message arrived.', w)
};

/** The skills as any Agent Skills client reads them: `{ name: { 'SKILL.md': text, ...extras } }`. */
export function neutralSkills() {
	const out = {};
	for (const name of readdirSync(join(ROOT, SKILLS)).sort()) {
		const from = name === 'connecting-to-the-feed' ? `${SOURCE}/${name}.md` : `${SKILLS}/${name}/SKILL.md`;
		let text = read(from);
		text = (NEUTRAL_EDITS[name] ?? ((t) => t))(text, from);
		const { fields, body } = parseSkill(text);
		if (fields.name !== name) throw new Error(`${from}: name is ${fields.name}, folder is ${name}`);
		const files = { 'SKILL.md': `---\nname: ${fields.name}\ndescription: ${fields.description}\n---\n\n${generatedNote(from)}\n\n${body}` };
		for (const extra of readdirSync(join(ROOT, SKILLS, name)).sort()) {
			if (extra !== 'SKILL.md') files[extra] = read(`${SKILLS}/${name}/${extra}`);
		}
		out[name] = files;
	}
	return out;
}

/** The skill bodies only, for formats with no frontmatter of their own. */
function bodies() {
	return Object.fromEntries(Object.entries(neutralSkills()).map(([name, files]) => [name, parseSkill(files['SKILL.md']).body]));
}

const HUB = 'working-with-the-feed';

/** The always-on part: the hub skill, which says when to post, reply, acknowledge and ask. */
export function alwaysOn() {
	const hub = bodies()[HUB];
	return (
		hub.trimEnd() +
		'\n\nIf the other skills are not installed, the whole guide is one file: ' +
		`${REPO}/blob/main/${PACKAGE}/wildware-feed.md\n`
	);
}

/** Pushes every heading one level down, leaving `#` lines inside code fences alone. */
function demote(text) {
	let fenced = false;
	return text
		.split('\n')
		.map((line) => {
			if (/^\s*```/.test(line)) fenced = !fenced;
			return !fenced && /^#{1,5} /.test(line) ? `#${line}` : line;
		})
		.join('\n');
}

/** Every skill in one file, for clients that load one instructions file and have no skills. */
export function allInOne() {
	const all = bodies();
	const order = [HUB, ...Object.keys(all).filter((n) => n !== HUB)];
	const parts = [`# Wildware Feed: the whole guide\n\n${generatedNote(`${SKILLS}/*/SKILL.md`)}\n\nEach section below is one skill; where a section names another skill, it means that section.\n`];
	for (const name of order) {
		let body = demote(all[name]).replace(/^## (.*)$/m, `## ${name}: $1`);
		if (name === 'posting-updates') {
			body = swap(body, 'See reference.md in this folder.', 'See "posting-updates reference" below.', `${SKILLS}/${name}/SKILL.md`);
		}
		parts.push(body.trimEnd() + '\n');
	}
	const reference = demote(read(`${SKILLS}/posting-updates/reference.md`)).replace(/^## .*$/m, '## posting-updates reference');
	parts.push(reference.trimEnd() + '\n');
	return parts.join('\n');
}

// ---------- client configs ----------

const json = (value) => JSON.stringify(value, null, '\t') + '\n';

/** Cursor: `.cursor/mcp.json` or `~/.cursor/mcp.json`. */
export const cursorServer = (url = EXAMPLE_URL) => ({ url: `${url}/mcp`, headers: { Authorization: `Bearer \${env:${TOKEN_ENV}}` } });
/** VS Code / Copilot, the portable format: `.mcp.json` or `~/.copilot/mcp-config.json`. */
export const vscodeServer = (url = EXAMPLE_URL) => ({ type: 'http', url: `${url}/mcp`, headers: { Authorization: `Bearer \${${TOKEN_ENV}}` } });
/** VS Code's editor format (`.vscode/mcp.json`, install links): a password prompt instead of a variable. */
const VSCODE_INPUT = { type: 'promptString', id: 'agent-dashboard-token', description: 'Wildware Feed agent token', password: true };
export const vscodeEditorServer = (url = EXAMPLE_URL) => ({ type: 'http', url: `${url}/mcp`, headers: { Authorization: 'Bearer ${input:agent-dashboard-token}' } });

export function cursorLink(url = EXAMPLE_URL) {
	const config = Buffer.from(JSON.stringify(cursorServer(url))).toString('base64');
	return {
		app: `cursor://anysphere.cursor-deeplink/mcp/install?name=${SERVER}&config=${encodeURIComponent(config)}`,
		web: `https://cursor.com/en/install-mcp?name=${SERVER}&config=${encodeURIComponent(config)}`
	};
}

export function vscodeLink(url = EXAMPLE_URL) {
	const query = `name=${SERVER}&inputs=${encodeURIComponent(JSON.stringify([VSCODE_INPUT]))}&config=${encodeURIComponent(JSON.stringify(vscodeEditorServer(url)))}`;
	return { app: `vscode:mcp/install?${query}`, web: `https://vscode.dev/redirect/mcp/install?${query}` };
}

function codexToml() {
	return [
		'# Wildware Feed for Codex. Add this to ~/.codex/config.toml (or .codex/config.toml in a trusted project)',
		`# and change ${EXAMPLE_URL} to your dashboard. Codex reads the token from ${TOKEN_ENV} when it starts.`,
		'# Generated by plugins/bridge/integrations.mjs.',
		`[mcp_servers.${SERVER}]`,
		`url = "${EXAMPLE_URL}/mcp"`,
		`bearer_token_env_var = "${TOKEN_ENV}"`,
		''
	].join('\n');
}

function manifest() {
	return JSON.parse(read('plugins/wildware-feed/.claude-plugin/plugin.json'));
}

function packageFiles() {
	const m = manifest();
	const about = {
		name: m.name,
		version: m.version,
		description: DESCRIPTION,
		author: m.author,
		homepage: m.homepage,
		repository: m.repository,
		license: m.license,
		keywords: m.keywords.filter((k) => k !== 'channel')
	};
	const files = {
		'.codex-plugin/plugin.json': json({ ...about, skills: './skills/' }),
		'.antigravity-plugin/plugin.json': json({ ...about, displayName: m.displayName }),
		'mcp_config.json': json({
			mcpServers: {
				[SERVER]: {
					url: `\${${URL_ENV}}/mcp`,
					headers: { Authorization: `Bearer \${${TOKEN_ENV}}` },
					variables: [
						{ name: URL_ENV, title: 'Dashboard URL', description: `Your dashboard's address, e.g. ${EXAMPLE_URL}. No /mcp, no trailing slash.` },
						{ name: TOKEN_ENV, title: 'Agent token', description: 'This agent\'s token. Pair to get one: see the README.', link: `${REPO}/tree/main/integrations#get-a-token` }
					]
				}
			}
		}),
		'gemini-extension.json': json({
			name: m.name,
			version: m.version,
			description: DESCRIPTION,
			// Antigravity loads rules only from rules/, so both read the one file there.
			contextFileName: 'rules/AGENTS.md',
			mcpServers: { [SERVER]: { httpUrl: `\${${URL_ENV}}/mcp`, headers: { Authorization: `Bearer \${${TOKEN_ENV}}` } } },
			settings: [
				{ name: 'Dashboard URL', description: `Your dashboard's address, e.g. ${EXAMPLE_URL}. No /mcp, no trailing slash.`, envVar: URL_ENV },
				{ name: 'Agent token', description: 'This agent\'s token. Pair to get one: see the README.', envVar: TOKEN_ENV, sensitive: true }
			]
		}),
		'rules/AGENTS.md': `${generatedNote(`${SKILLS}/${HUB}/SKILL.md`)}\n\n${alwaysOn()}`,
		'wildware-feed.md': allInOne()
	};
	for (const [name, skill] of Object.entries(neutralSkills())) {
		for (const [file, text] of Object.entries(skill)) files[`skills/${name}/${file}`] = text;
	}
	return Object.fromEntries(Object.entries(files).map(([p, t]) => [`${PACKAGE}/${p}`, t]));
}

function clientFiles() {
	const hubNote = generatedNote(`${SKILLS}/${HUB}/SKILL.md`);
	return {
		'.agents/plugins/marketplace.json': json({
			name: 'wildware-feed',
			plugins: [
				{
					name: 'wildware-feed',
					source: { source: 'local', path: `./${PACKAGE}` },
					policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
					category: 'Productivity'
				}
			]
		}),
		'integrations/codex/config.toml': codexToml(),
		'integrations/codex/AGENTS.md': `${hubNote}\n\n${alwaysOn()}`,
		'integrations/cursor/mcp.json': json({ mcpServers: { [SERVER]: cursorServer() } }),
		'integrations/cursor/wildware-feed.mdc': `---\ndescription: Wildware Feed - how to report to the owner watching the dashboard\nalwaysApply: true\n---\n\n${hubNote}\n\n${alwaysOn()}`,
		'integrations/vscode/mcp.json': json({ mcpServers: { [SERVER]: vscodeServer() } }),
		'integrations/vscode/vscode-mcp.json': json({ inputs: [VSCODE_INPUT], servers: { [SERVER]: vscodeEditorServer() } }),
		'integrations/vscode/wildware-feed.instructions.md': `---\napplyTo: "**"\ndescription: Wildware Feed - how to report to the owner watching the dashboard\n---\n\n${hubNote}\n\n${alwaysOn()}`,
		'integrations/windsurf/mcp_config.json': json({ mcpServers: { [SERVER]: { serverUrl: `${EXAMPLE_URL}/mcp`, headers: { Authorization: `Bearer \${env:${TOKEN_ENV}}` } } } }),
		'integrations/windsurf/wildware-feed.md': `---\ntrigger: always_on\n---\n\n${hubNote}\n\n${alwaysOn()}`,
		'integrations/cline/cline_mcp_settings.json': json({
			mcpServers: {
				[SERVER]: { type: 'streamableHttp', url: `${EXAMPLE_URL}/mcp`, headers: { Authorization: 'Bearer <your agent token>' }, disabled: false, autoApprove: [] }
			}
		}),
		'integrations/cline/wildware-feed.md': allInOne(),
		'integrations/claude-desktop/claude_desktop_config.json': json({
			mcpServers: {
				[SERVER]: {
					command: 'npx',
					args: ['-y', `mcp-remote@${MCP_REMOTE}`, `${EXAMPLE_URL}/mcp`, '--header', 'Authorization:${AUTH_HEADER}'],
					env: { AUTH_HEADER: 'Bearer <your agent token>' }
				}
			}
		})
	};
}

/** The stdio-to-HTTP proxy Claude Desktop's config file needs for a header. Pinned. */
const MCP_REMOTE = '0.16.0';

// ---------- README blocks ----------

/** The clients the READMEs list, in the order they list them. */
const CLIENTS = [
	['Claude Code', 'Plugin: tools, skills, pairing, replies that wake the agent', 'plugins/wildware-feed/README.md'],
	['Codex (CLI, IDE, app)', 'Plugin with skills, `config.toml` entry, `AGENTS.md`', 'integrations/codex/README.md'],
	['Gemini CLI', 'Extension: server, skills, context file', 'integrations/gemini/README.md'],
	['Antigravity', 'Plugin: server, skills, always-on rule', 'integrations/antigravity/README.md'],
	['Cursor', 'Install link, `mcp.json`, rule, skills', 'integrations/cursor/README.md'],
	['VS Code / GitHub Copilot', 'Install link, `.mcp.json`, instructions, skills', 'integrations/vscode/README.md'],
	['Claude Desktop', 'Custom connector, or a config entry', 'integrations/claude-desktop/README.md'],
	['Windsurf', '`mcp_config.json`, rule, skills', 'integrations/windsurf/README.md'],
	['Cline', 'MCP settings, rules file', 'integrations/cline/README.md'],
	['Any other MCP client', 'The URL, the header, and the guidance as one file', 'integrations/README.md#any-mcp-client']
];

function clientTable(fromDir) {
	const rows = CLIENTS.map(([name, gets, path]) => {
		const [file, anchor] = path.split('#');
		const link = relative(fromDir, file) + (anchor ? `#${anchor}` : '');
		return `| [${name}](${link || '.'}) | ${gets} |`;
	});
	return ['| Client | What you get |', '| --- | --- |', ...rows].join('\n');
}

/** Text the READMEs share, kept in one place and copied between their markers. */
function blocks(fromDir) {
	const cursor = cursorLink();
	const vscode = vscodeLink();
	return {
		connect: read(`${SOURCE}/connect.md`).trimEnd(),
		clients: clientTable(fromDir),
		'cursor-link': [
			`[Add to Cursor](${cursor.web}), then change \`${EXAMPLE_URL}\` to your dashboard in Cursor's MCP`,
			'settings. The same link for the app itself:',
			'',
			'```text',
			cursor.app,
			'```',
			'',
			'For a link with your own address, run `node plugins/bridge/integrations.mjs links https://your-dashboard`',
			'in a clone of this repo.'
		].join('\n'),
		'vscode-link': [
			`[Install in VS Code](${vscode.web}). It asks for the token once and keeps it in VS Code's`,
			`secret store. Then change \`${EXAMPLE_URL}\` to your dashboard (MCP: Open User Configuration).`,
			'For a link with your own address, run `node plugins/bridge/integrations.mjs links https://your-dashboard`',
			'in a clone of this repo.'
		].join('\n')
	};
}

const BLOCK = /(<!-- begin generated: ([\w-]+) -->)[\s\S]*?(<!-- end generated -->)/g;

/** Rewrites every `<!-- begin generated: name -->` block in a hand-written README. */
export function fillBlocks(text, where) {
	const all = blocks(dirname(where));
	return text.replace(BLOCK, (_, open, name, close) => {
		if (!(name in all)) throw new Error(`${where}: no generated block called ${name}`);
		return `${open}\n${all[name]}\n${close}`;
	});
}

function readmeFiles() {
	const out = {};
	const dirs = ['.', 'integrations', ...readdirSync(join(ROOT, 'integrations')).map((d) => `integrations/${d}`)];
	for (const dir of dirs) {
		const path = dir === '.' ? 'README.md' : `${dir}/README.md`;
		if (!existsSync(join(ROOT, path))) continue;
		const text = read(path);
		if (text.includes('<!-- begin generated:')) out[path] = fillBlocks(text, path);
	}
	return out;
}

/** Every generated file, by path from the repo root. */
export function generate() {
	return { ...packageFiles(), ...clientFiles(), ...readmeFiles() };
}

/** Folders that hold nothing but generated files, so a stale leftover there is an error too. */
export const OWNED = [`${PACKAGE}/skills`];

function filesUnder(dir) {
	if (!existsSync(join(ROOT, dir))) return [];
	return readdirSync(join(ROOT, dir)).flatMap((name) => {
		const path = `${dir}/${name}`;
		return statSync(join(ROOT, path)).isDirectory() ? filesUnder(path) : [path];
	});
}

/** Paths whose committed copy differs from what this script makes, or that should not exist. */
export function stale() {
	const files = generate();
	const out = [];
	for (const [path, text] of Object.entries(files)) {
		const committed = existsSync(join(ROOT, path)) ? read(path) : null;
		if (committed !== text) out.push(path);
	}
	for (const dir of OWNED) for (const path of filesUnder(dir)) if (!(path in files)) out.push(path);
	return out;
}

function write() {
	for (const dir of OWNED) rmSync(join(ROOT, dir), { recursive: true, force: true });
	for (const [path, text] of Object.entries(generate())) {
		mkdirSync(dirname(join(ROOT, path)), { recursive: true });
		writeFileSync(join(ROOT, path), text);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [command, arg] = process.argv.slice(2);
	if (command === '--check') {
		const out = stale();
		for (const path of out) console.error(`${path} is out of date: run npm run integrations in plugins/bridge`);
		process.exit(out.length ? 1 : 0);
	} else if (command === 'links') {
		if (!arg) {
			console.error('usage: node integrations.mjs links https://your-dashboard');
			process.exit(2);
		}
		const url = new URL(arg).origin;
		const c = cursorLink(url);
		const v = vscodeLink(url);
		console.log(`Cursor:  ${c.web}\n         ${c.app}\nVS Code: ${v.web}\n         ${v.app}`);
	} else {
		write();
		console.log(`wrote ${Object.keys(generate()).length} files (${relative(process.cwd(), join(ROOT, 'integrations')) || '.'})`);
	}
}
