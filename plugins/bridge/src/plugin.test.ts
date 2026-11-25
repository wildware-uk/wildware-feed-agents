/**
 * The plugin's files, as executable expectations. Every way the plugin breaks on
 * somebody else's machine is silent, so it is asserted here: a skill naming a
 * tool the server does not have, a manifest that disagrees with the marketplace,
 * a committed script that drifted from its source.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serverTools } from './server-files';
// @ts-expect-error: a plain .mjs script with no type declarations
import * as evalMocks from '../eval-mocks.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const PLUGIN = resolve(ROOT, 'plugins/wildware-feed');
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');
const json = (path: string) => JSON.parse(read(path));

const marketplace = json('.claude-plugin/marketplace.json');
const manifest = json('plugins/wildware-feed/.claude-plugin/plugin.json');
const mcp = json('plugins/wildware-feed/.mcp.json');
const server = await serverTools();
const tools: string[] = server.names;
const skillNames = readdirSync(resolve(PLUGIN, 'skills'));
const skills = Object.fromEntries(skillNames.map((n) => [n, read(`plugins/wildware-feed/skills/${n}/SKILL.md`)]));

function frontmatter(source: string): Record<string, string> {
	const block = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? '';
	return Object.fromEntries(
		block
			.split('\n')
			.map((line) => /^(\w+):\s*(.*)$/.exec(line))
			.filter((m): m is RegExpExecArray => m !== null)
			.map((m) => [m[1], m[2]])
	);
}

describe('marketplace and manifest', () => {
	it('agree on the name and version', () => {
		const entry = marketplace.plugins.find((p: { name: string }) => p.name === manifest.name);
		expect(entry?.source).toBe('./plugins/wildware-feed');
		expect(entry?.version).toBe(manifest.version);
		expect(marketplace.name).toBe('wildware-feed');
	});

	it('only asks for the URL; the token is optional because pairing provides it', () => {
		expect(manifest.userConfig.dashboard_url.required).toBe(true);
		expect(manifest.userConfig.agent_token.required).toBe(false);
		expect(manifest.userConfig.agent_token.sensitive).toBe(true);
	});

	it('never puts an optional setting in the MCP config, where an unset option would drop the server', () => {
		expect(JSON.stringify(mcp)).not.toContain('agent_token');
		expect(JSON.stringify(mcp)).not.toContain('projects');
		expect(mcp.mcpServers['agent-dashboard'].headersHelper).toContain('${CLAUDE_PROJECT_DIR}');
	});

	it('connects to plain /mcp, so list_tools always answers from the live server', () => {
		// ?tools=all freezes the tool list when a session starts: a tool added later is never seen.
		expect(mcp.mcpServers['agent-dashboard'].url).toBe('${user_config.dashboard_url}/mcp');
	});

	it('names no channels: the server alone decides what an agent hears', () => {
		expect(Object.keys(manifest.userConfig)).not.toContain('projects');
		expect(JSON.stringify(mcp)).not.toContain('PROJECTS');
	});

	it('declares the channel it ships', () => {
		expect(manifest.channels.map((c: { server: string }) => c.server)).toEqual(['agent-dashboard-channel']);
		expect(mcp.mcpServers['agent-dashboard-channel']).toBeDefined();
	});
});

describe('skills', () => {
	it.each(skillNames)('%s has a name matching its folder and a "Use when" description', (name) => {
		const fm = frontmatter(skills[name]);
		expect(fm.name).toBe(name);
		expect(fm.description.startsWith('Use ')).toBe(true);
		expect(fm.description.length).toBeLessThanOrEqual(1024);
	});

	it.each(skillNames)('%s only names tools the server really has', (name) => {
		const called = [...skills[name].matchAll(/`?\b([a-z]+(?:_[a-z]+)+)\(/g)].map((m) => m[1]);
		for (const tool of called) expect([...tools, ...server.discovery], `${name} calls ${tool}`).toContain(tool);
	});

	it('says critical is only for when the owner asked, wherever it mentions it', () => {
		for (const [name, text] of Object.entries(skills)) {
			if (!/critical/.test(text) || name === 'feed-plans') continue;
			expect(text.replace(/\s+/g, ' '), name).toMatch(/told you, in so many words/);
		}
	});

	it('quotes the plans exactly as the public site states them', () => {
		const plans = skills['feed-plans'];
		for (const line of [
			'$29 a month',
			'Or $290 a year, which is two months free.',
			'5 logins, then $6 a month each',
			'No card for the trial',
			'$79 a month (coming soon)',
			'Prices in US dollars. Paid plans open to the waitlist first.'
		]) {
			expect(plans).toContain(line);
		}
	});
});

describe('the server, in its own repo', () => {
	it.skipIf(!server.live)('the evals list, describe and run tools as a plain /mcp session sees them', async () => {
		const inputs = await evalMocks.serverInputs();
		expect(evalMocks.stale(evalMocks.generate(inputs)), 'run node plugins/bridge/eval-mocks.mjs').toEqual([]);
		const listed = (json('plugins/wildware-feed/evals/mocks/agent-dashboard/_tools.json').tools as { name: string }[]).map((t) => t.name);
		expect(listed).toEqual(server.discovery);
	});

	it('the evals answer call_tool from a fixture per tool, in every case that changes one', () => {
		const MOCKS = 'plugins/wildware-feed/evals/mocks/agent-dashboard';
		expect(read(`${MOCKS}/call_tool.md`)).toBe(evalMocks.CALL_TOOL);
		const fixtures = readdirSync(resolve(ROOT, `${MOCKS}/fixtures`)).map((f) => f.replace(/\.md$/, ''));
		// A fixture names a real tool; fixtures are not templated, so none may hold {{...}}.
		for (const name of fixtures) {
			expect(tools, `fixture ${name}`).toContain(name);
			expect(read(`${MOCKS}/fixtures/${name}.md`), name).not.toContain('{{');
		}
		for (const [kase, own] of Object.entries(evalMocks.OVERRIDES as Record<string, string[]>)) {
			const dir = `plugins/wildware-feed/evals/${kase}/mocks/agent-dashboard`;
			expect(read(`${dir}/call_tool.md`)).toBe(evalMocks.CALL_TOOL);
			for (const name of own) expect(read(`${dir}/fixtures/${name}.md`)).not.toBe(read(`${MOCKS}/fixtures/${name}.md`));
		}
	});

	it('the evals grade dashboard calls through call_tool, by the tool they run', () => {
		const graders = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'plugins/wildware-feed/evals'], { cwd: ROOT, encoding: 'utf8' })
			.split('\n')
			.filter((f) => /\/graders\/.*\.md$/.test(f));
		for (const file of graders) {
			const text = read(file);
			for (const m of text.matchAll(/tool: mcp__plugin_wildware-feed_agent-dashboard__(\w+)/g)) expect(m[1], file).toBe('call_tool');
		}
	});
});

describe('public repo hygiene', () => {
	// _tools.json, list_tools.md and describe/ are verbatim copies of the server's tool files, checked with the server.
	it('carries no home folders, LAN addresses or private hosts in the plugin', () => {
		const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'plugins', '.claude-plugin'], { cwd: ROOT, encoding: 'utf8' })
			.split('\n')
			.filter((f) => f && !f.includes('node_modules') && !f.endsWith('.png') && !f.endsWith('.mjs') && !f.endsWith('package-lock.json') && !f.endsWith('_tools.json') && !f.includes('/agent-dashboard/describe/') && !f.endsWith('/agent-dashboard/list_tools.md'));
		for (const file of files) {
			const text = read(file);
			expect(text, file).not.toMatch(/\/home\/|\/srv\/|\/Users\/|192\.168\.|\b10\.\d+\.\d+\.\d+/);
		}
	});
});

describe('the committed scripts', () => {
	it('are what the source builds to', () => {
		expect(() => execFileSync('node', ['build.mjs', '--check'], { cwd: resolve(ROOT, 'plugins/bridge'), stdio: 'pipe' })).not.toThrow();
	}, 60_000);
});

/**
 * The env-file line in sharing-secrets is the only form a client without the
 * plugin has. A value with a quote or a line break must add nothing to the file:
 * written in, it would end the quotes and add lines of its own.
 */
describe('the documented env-file line', () => {
	const line = skills['sharing-secrets']!.split('\n').find((l) => l.includes('.env.local') && l.includes('curl'))!;
	const VALUES = {
		plain: 'sk-test NOT $REAL #1',
		quote: "dummy-value'\nNODE_OPTIONS='--require=./x.js",
		command: "x'; echo RAN; : '",
		newline: 'a\nb',
		cr: 'a\rb'
	};

	for (const shell of ['sh', 'bash']) {
		it(`appends one literal line for a plain value, and nothing otherwise (${shell})`, () => {
			for (const [kind, value] of Object.entries(VALUES)) {
				const dir = mkdtempSync(join(tmpdir(), 'feed-envline-'));
				writeFileSync(join(dir, 'value'), value);
				// curl stands in as a function that prints the dummy value, as curl would.
				const script = `curl() { cat value; }\n${line.replace(/#.*$/, '')}`;
				const out = execFileSync(shell, ['-c', script], { cwd: dir, encoding: 'utf8' });
				let file = '';
				try {
					file = readFileSync(join(dir, '.env.local'), 'utf8');
				} catch {}
				if (kind === 'plain') {
					expect(file).toBe(`NAME='${value}'\n`);
				} else {
					expect(file, kind).toBe('');
					expect(out).toContain('refused');
					expect(out).not.toContain('RAN');
				}
			}
		});
	}
});
