/**
 * The other clients' packages under integrations/, generated from the plugin's skills by
 * integrations.mjs. Asserted here: every committed copy is what the generator makes now,
 * every config parses, the links install what the config files say, and nothing
 * Claude Code-only leaks into a client that has no monitor, channel or plugin script.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { describe, expect, it } from 'vitest';
import { INSTRUCTIONS, serverFile, serverTools } from './server-files';
// @ts-expect-error: a plain .mjs script with no type declarations
import * as gen from '../integrations.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');
const files: Record<string, string> = gen.generate();
const tools: string[] = (await serverTools()).names;
const instructions = await serverFile(INSTRUCTIONS);
const skills: Record<string, Record<string, string>> = gen.neutralSkills();

describe('freshness', () => {
	it('every generated file is committed as the generator makes it', () => {
		expect(gen.stale()).toEqual([]);
	});

	it('the --check command agrees', () => {
		expect(() => execFileSync('node', ['integrations.mjs', '--check'], { cwd: resolve(ROOT, 'plugins/bridge'), stdio: 'pipe' })).not.toThrow();
	});

	it('makes one skill per plugin skill, with the same names', () => {
		const plugin = execFileSync('ls', [resolve(ROOT, 'plugins/wildware-feed/skills')], { encoding: 'utf8' }).trim().split('\n');
		expect(Object.keys(skills)).toEqual(plugin);
	});
});

describe('every config parses', () => {
	const jsonFiles = Object.keys(files).filter((p) => p.endsWith('.json'));
	it.each(jsonFiles)('%s is JSON', (path) => {
		expect(() => JSON.parse(files[path])).not.toThrow();
	});

	it('the Codex config is TOML with a streamable HTTP server reading the token from the environment', () => {
		const toml = parseToml(files['integrations/codex/config.toml']) as { mcp_servers: Record<string, Record<string, string>> };
		expect(toml.mcp_servers[gen.SERVER]).toEqual({ url: `${gen.EXAMPLE_URL}/mcp`, bearer_token_env_var: gen.TOKEN_ENV });
	});

	it('every client calls the server agent-dashboard, the name the skills and instructions use', () => {
		for (const path of jsonFiles.filter((p) => /mcp|gemini-extension|claude_desktop/.test(p))) {
			const config = JSON.parse(files[path]);
			expect(Object.keys(config.mcpServers ?? config.servers), path).toEqual([gen.SERVER]);
		}
	});

	it('never carries a real token: only a variable, a prompt or a placeholder', () => {
		for (const [path, text] of Object.entries(files)) {
			// A real token is 43 URL-safe characters; a config only ever holds ${…} or <placeholder>.
			expect(text, path).not.toMatch(/Bearer [A-Za-z0-9_-]{20,}/);
			if (/\.(json|toml)$/.test(path)) for (const m of text.matchAll(/Bearer ([^"\s]+)/g)) expect(m[1], path).toMatch(/^(\$\{|<)/);
		}
	});
});

describe('install links', () => {
	it('the Cursor link installs exactly the entry in cursor/mcp.json', () => {
		const link = new URL(gen.cursorLink().web);
		const config = JSON.parse(Buffer.from(link.searchParams.get('config')!, 'base64').toString('utf8'));
		expect(link.searchParams.get('name')).toBe(gen.SERVER);
		expect(config).toEqual(JSON.parse(files['integrations/cursor/mcp.json']).mcpServers[gen.SERVER]);
		expect(gen.cursorLink().app.startsWith('cursor://anysphere.cursor-deeplink/mcp/install?name=agent-dashboard&config=')).toBe(true);
	});

	it('the VS Code link installs the editor-format entry and asks for the token as a password', () => {
		const link = new URL(gen.vscodeLink().web);
		const editor = JSON.parse(files['integrations/vscode/vscode-mcp.json']);
		expect(JSON.parse(link.searchParams.get('config')!)).toEqual(editor.servers[gen.SERVER]);
		expect(JSON.parse(link.searchParams.get('inputs')!)).toEqual(editor.inputs);
		expect(editor.inputs[0].password).toBe(true);
	});

	it('a link for your own dashboard carries your URL', () => {
		const config = JSON.parse(Buffer.from(new URL(gen.cursorLink('https://feed.test').web).searchParams.get('config')!, 'base64').toString());
		expect(config.url).toBe('https://feed.test/mcp');
	});
});

describe('skills for other clients', () => {
	const all = Object.entries(skills).flatMap(([name, f]) => Object.entries(f).map(([file, text]) => [`${name}/${file}`, text]));

	it.each(Object.keys(skills))('%s keeps Agent Skills frontmatter: a name matching its folder and a "Use when" description', (name) => {
		const { fields } = gen.parseSkill(skills[name]['SKILL.md']);
		expect(fields.name).toBe(name);
		expect(fields.description.startsWith('Use ')).toBe(true);
		expect(fields.description.length).toBeLessThanOrEqual(1024);
	});

	it('say nothing only Claude Code has: no plugin script, monitor, channel or /mcp', () => {
		for (const [path, text] of all) {
			if (path.endsWith('reference.md')) continue; // an embed's Slack "channel" field
			expect(text, path).not.toMatch(/CLAUDE_|feed\.mjs|\/plugin\b|monitor|channel|claude mcp|`\/mcp`/);
		}
	});

	it('only name tools the server really has', () => {
		for (const [path, text] of all) {
			for (const m of text.matchAll(/`?\b([a-z]+(?:_[a-z]+)+)\(/g)) expect(tools, `${path} calls ${m[1]}`).toContain(m[1]);
		}
	});

	it('keep the rules every client must follow', () => {
		const hub = gen.alwaysOn().replace(/\s+/g, ' ');
		expect(hub).toContain('`acknowledge` it: REQUIRED, every time');
		expect(hub).toContain('Never a new card');
		expect(hub).toMatch(/told you, in so many words, to use critical/);
		expect(skills['connecting-to-the-feed']['SKILL.md']).toContain('/api/pair');
	});

	it('the whole-guide file has every skill, in sections an agent can find by name', () => {
		const guide = files['integrations/wildware-feed/wildware-feed.md'];
		for (const name of Object.keys(skills)) expect(guide).toMatch(new RegExp(`^## ${name}: `, 'm'));
		expect(guide).not.toContain('reference.md');
		expect(guide).toContain('## posting-updates reference');
		// Comment lines inside code fences are not headings and must not be demoted.
		expect(guide).not.toMatch(/^##+ \d\. Ask to join/m);
	});
});

describe('the packages', () => {
	it('version and identity come from the Claude Code plugin manifest', () => {
		const manifest = JSON.parse(read('plugins/wildware-feed/.claude-plugin/plugin.json'));
		for (const path of ['.codex-plugin/plugin.json', '.antigravity-plugin/plugin.json', 'gemini-extension.json']) {
			const m = JSON.parse(files[`${gen.PACKAGE}/${path}`]);
			expect([m.name, m.version], path).toEqual([manifest.name, manifest.version]);
		}
	});

	it('the Codex marketplace points at the package', () => {
		const market = JSON.parse(files['.agents/plugins/marketplace.json']);
		expect(market.plugins[0].source.path).toBe(`./${gen.PACKAGE}`);
	});

	it('the Gemini extension declares the variables its server entry uses, the token as sensitive', () => {
		const ext = JSON.parse(files[`${gen.PACKAGE}/gemini-extension.json`]);
		const used = [...JSON.stringify(ext.mcpServers).matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]);
		const declared = ext.settings.map((s: { envVar: string }) => s.envVar);
		for (const v of used) expect(declared).toContain(v);
		expect(ext.settings.find((s: { envVar: string }) => s.envVar === gen.TOKEN_ENV).sensitive).toBe(true);
	});

	it('the Antigravity plugin declares the variables its server entry uses', () => {
		const server = JSON.parse(files[`${gen.PACKAGE}/mcp_config.json`]).mcpServers[gen.SERVER];
		const used = [...JSON.stringify({ url: server.url, headers: server.headers }).matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]);
		expect(server.variables.map((v: { name: string }) => v.name).sort()).toEqual([...new Set(used)].sort());
	});

	it('READMEs carry the shared connection text', () => {
		const connect = read('integrations/source/connect.md').trim();
		for (const client of ['codex', 'gemini', 'antigravity', 'cursor', 'vscode', 'claude-desktop', 'windsurf', 'cline']) {
			expect(files[`integrations/${client}/README.md`], client).toContain(connect);
		}
	});
});

describe('READMEs', () => {
	const readmes = Object.keys(files).filter((p) => p.endsWith('README.md'));

	it.each(readmes)('%s links only to files that exist', (path) => {
		for (const m of files[path].matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
			if (/^[a-z]+:/.test(m[1])) continue;
			expect(existsSync(resolve(ROOT, dirname(path), m[1])), `${path} -> ${m[1]}`).toBe(true);
		}
	});
});

// The server's own MCP instructions, from wildware-feed: what a client that reads nothing else sees.
describe.skipIf(instructions === null)('the MCP server instructions', () => {
	const text = instructions ?? '';

	it('say the rules in the first line, which is all Codex shows before it loads the tools', () => {
		// Measured with codex-cli 0.170: the first line, cut at about 247 characters.
		const first = text.split('\n')[0];
		expect(first.length).toBeLessThanOrEqual(247);
		for (const rule of ['Acknowledge', 'thread', 'request_input', 'critical']) expect(first).toContain(rule);
	});

	it('carry the essentials for clients that read nothing else, near the top', () => {
		// Codex keeps the first 512 characters of a server's instructions most in view.
		const top = text.slice(0, 800);
		expect(top).toContain('acknowledge({message_id, state: "thinking"})');
		expect(top).toContain('post_message');
		for (const rule of ['request_input', 'in so many words, to use critical', 'start_pairing', '/api/pair']) expect(text).toContain(rule);
	});

	it('still start the way the parity suite expects', () => {
		expect(text.startsWith('This is an Agent Dashboard: a status wall a human owner watches live while you work.')).toBe(true);
		expect(text).toContain('call request_input rather than guessing or stopping');
	});
});

describe('public repo hygiene', () => {
	it('integrations carry no home folders, LAN addresses or real hosts', () => {
		for (const [path, text] of Object.entries(files)) {
			expect(text, path).not.toMatch(/\/home\/|\/srv\/|\/Users\/|192\.168\.|\b10\.\d+\.\d+\.\d+|@[a-z0-9-]+\.(com|dev|net|io)\b/i);
		}
	});
});
