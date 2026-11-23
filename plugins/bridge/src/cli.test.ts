import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { claimEnv, connection, dataDirFor, headers, readSettings, sameConnection, secretFailure, secretTarget, sessionStart, settingsFrom } from './cli';
import { SecretError } from './secret';
import { Store } from './store';

const URL_ = 'https://dashboard.example.com';
const store = () => Store.for(mkdtempSync(join(tmpdir(), 'feed-cli-')), '/work/app', () => null);
const pair = (s: Store, url = URL_) =>
	s.savePaired({ url, name: 'laptop', agent_id: 'A1', token: 'paired-token', project: s.root, paired_at: '' });

describe('the SessionStart hook', () => {
	it('says nothing when the plugin has no dashboard URL', () => {
		expect(sessionStart(store(), {})).toBe('');
	});

	it('points an unpaired project at the connecting skill', () => {
		const said = sessionStart(store(), { CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: URL_ });
		expect(said).toContain('not connected');
		expect(said).toContain('connecting-to-the-feed');
	});

	it('reminds a connected session to register, acknowledge and reply in the thread', () => {
		const s = store();
		pair(s);
		const said = sessionStart(s, { CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: `${URL_}/` });
		for (const word of ['register_session', 'heartbeat', 'Acknowledge', 'post_message', 'request_input', 'laptop']) {
			expect(said).toContain(word);
		}
		expect(said.split('\n').length).toBeLessThanOrEqual(6);
		expect(said).not.toContain('paired-token');
	});

	it('saves the settings for the monitor without the token, and the option token apart', () => {
		const s = store();
		sessionStart(s, {
			CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: `${URL_}/mcp`,
			CLAUDE_PLUGIN_OPTION_AGENT_TOKEN: 'pasted-token'
		});
		const saved = readFileSync(s.connectionPath, 'utf8');
		expect(JSON.parse(saved)).toEqual({ url: URL_, monitor: 'auto' });
		expect(saved).not.toContain('pasted-token');
		expect(s.optionToken()).toEqual({ token: 'pasted-token', url: URL_ });
	});
});

describe('where an installed copy keeps its data', () => {
	it('finds the folder Claude Code gives the plugin, from where the script is installed', () => {
		const script = join('/opt/me/.claude/plugins/cache/wildware-feed/wildware-feed/1.0.0/bin/feed.mjs');
		expect(dataDirFor(script)).toBe(join('/opt/me/.claude/plugins/data/wildware-feed-wildware-feed'));
	});

	it('keeps the marketplace in the name, made safe for a folder', () => {
		expect(dataDirFor('/x/plugins/cache/my.market/wildware-feed/abc123/bin/feed.mjs')).toBe(join('/x/plugins/data/wildware-feed-my-market'));
	});

	it('gives up anywhere else, so --data is still needed', () => {
		expect(dataDirFor(undefined)).toBeNull();
		expect(dataDirFor('/opt/code/wildware-feed-agents/plugins/wildware-feed/bin/feed.mjs')).toBeNull();
		expect(dataDirFor('/x/plugins/cache/m/p/1.0.0/feed.mjs')).toBeNull();
	});
});

describe('settings', () => {
	it('take the plugin options first and AGENT_DASHBOARD_* second', () => {
		expect(settingsFrom({ AGENT_DASHBOARD_URL: 'https://env.example.com', AGENT_DASHBOARD_MONITOR: 'OFF' })).toEqual({
			url: 'https://env.example.com',
			monitor: 'off'
		});
		expect(
			settingsFrom({ CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: URL_, AGENT_DASHBOARD_URL: 'https://env.example.com' }).url
		).toBe(URL_);
	});
});

describe('the header helper', () => {
	it('sends this project’s token to its own server, and nothing otherwise', () => {
		const s = store();
		expect(headers(s, {})).toEqual({});
		pair(s);
		expect(headers(s, { CLAUDE_CODE_MCP_SERVER_URL: `${URL_}/mcp` })).toEqual({ Authorization: 'Bearer paired-token' });
		expect(headers(s, { CLAUDE_CODE_MCP_SERVER_URL: 'https://elsewhere.example.com/mcp' })).toEqual({});
	});
});

describe('what the monitor connects with', () => {
	it('waits for a URL and a token, and names no channels: the server keeps what the agent follows', () => {
		const s = store();
		expect(connection(s, {})).toBeNull();
		sessionStart(s, { CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: URL_ });
		expect(connection(s, {})).toBeNull();
		pair(s);
		expect(connection(s, {})).toEqual({ url: URL_, token: 'paired-token', monitor: 'auto' });
	});

	it('ignores a channel list, old or new: from the env, the option, or a file an older plugin saved', () => {
		const s = store();
		pair(s);
		writeFileSync(s.connectionPath, JSON.stringify({ url: URL_, projects: 'app,web', monitor: 'auto' }));
		expect(readSettings(s)).toEqual({ url: URL_, monitor: 'auto' });
		expect(connection(s, { AGENT_DASHBOARD_PROJECTS: '*' })).toEqual({ url: URL_, token: 'paired-token', monitor: 'auto' });
		expect(settingsFrom({ CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: URL_, CLAUDE_PLUGIN_OPTION_PROJECTS: '*' })).toEqual({ url: URL_, monitor: 'auto' });
	});

	it('keys the channel claim to the project', () => {
		const s = store();
		expect(claimEnv(s, {})).toMatchObject({ CLAUDE_PLUGIN_DATA: s.data, WILDWARE_FEED_PROJECT_KEY: s.key });
	});
});

describe('where a secret command sends the token', () => {
	const OTHER = 'https://other.example.test';

	it('sends the environment or option token only to the dashboard this plugin is set up for', () => {
		const s = store();
		sessionStart(s, { CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: URL_, CLAUDE_PLUGIN_OPTION_AGENT_TOKEN: 'option-token' });
		expect(secretTarget(s, {}, undefined)).toMatchObject({ url: URL_, token: { token: 'option-token' } });
		expect(secretTarget(s, {}, `${URL_}/mcp`)).toMatchObject({ token: { token: 'option-token' } });
		expect(secretTarget(s, {}, OTHER)).toHaveProperty('refused');
		expect(secretTarget(s, { AGENT_DASHBOARD_TOKEN: 'env-token' }, OTHER)).toHaveProperty('refused');
		expect(JSON.stringify(secretTarget(s, {}, OTHER))).not.toContain('option-token');
	});

	it('lets a paired token go to the dashboard it was paired with, and nowhere else', () => {
		const s = store();
		pair(s, OTHER);
		expect(secretTarget(s, {}, OTHER)).toMatchObject({ url: OTHER, token: { source: 'paired' } });
		expect(secretTarget(s, {}, 'https://third.example.test')).toHaveProperty('refused');
	});

	it('says what it could not do, and never what fetch quoted', () => {
		expect(secretFailure(new SecretError('the dashboard said 500'))).toBe('the dashboard said 500');
		const quoted = secretFailure(new TypeError('Failed to parse URL from /api/agent/secret/LINK-1'));
		expect(quoted).not.toContain('LINK-1');
		const file = Object.assign(new Error("ENOENT: no such file or directory, open 'missing.txt'"), { code: 'ENOENT', syscall: 'open' });
		expect(secretFailure(file)).toContain('missing.txt');
	});
});

describe('what a running monitor compares', () => {
	it('is a new connection when the token or the dashboard changes', () => {
		const a = { url: URL_, token: 'A', monitor: 'auto' as const };
		expect(sameConnection(a, { ...a })).toBe(true);
		expect(sameConnection(a, { ...a, token: 'B' })).toBe(false);
		expect(sameConnection(a, { ...a, url: 'https://other.example.test' })).toBe(false);
	});
});
