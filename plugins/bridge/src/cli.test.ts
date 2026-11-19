import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { claimEnv, connection, headers, sessionStart, settingsFrom } from './cli';
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
			CLAUDE_PLUGIN_OPTION_PROJECTS: '*',
			CLAUDE_PLUGIN_OPTION_AGENT_TOKEN: 'pasted-token'
		});
		const saved = readFileSync(s.connectionPath, 'utf8');
		expect(JSON.parse(saved)).toEqual({ url: URL_, projects: '*', monitor: 'auto' });
		expect(saved).not.toContain('pasted-token');
		expect(s.optionToken()).toBe('pasted-token');
	});
});

describe('settings', () => {
	it('take the plugin options first and AGENT_DASHBOARD_* second', () => {
		expect(settingsFrom({ AGENT_DASHBOARD_URL: 'https://env.example.com', AGENT_DASHBOARD_MONITOR: 'OFF' })).toEqual({
			url: 'https://env.example.com',
			projects: '',
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
	it('waits for a URL and a token, and passes on projects only when the owner named them', () => {
		const s = store();
		expect(connection(s, {})).toBeNull();
		sessionStart(s, { CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: URL_, CLAUDE_PLUGIN_OPTION_PROJECTS: 'app, web' });
		expect(connection(s, {})).toBeNull();
		pair(s);
		expect(connection(s, {})).toEqual({ url: URL_, token: 'paired-token', projects: ['app', 'web'], monitor: 'auto' });
	});

	it('needs no projects: the server keeps what the agent follows', () => {
		const s = store();
		sessionStart(s, { CLAUDE_PLUGIN_OPTION_DASHBOARD_URL: URL_ });
		pair(s);
		expect(connection(s, {})).toEqual({ url: URL_, token: 'paired-token', projects: [], monitor: 'auto' });
	});

	it('keys the channel claim to the project', () => {
		const s = store();
		expect(claimEnv(s, {})).toMatchObject({ CLAUDE_PLUGIN_DATA: s.data, WILDWARE_FEED_PROJECT_KEY: s.key });
	});
});
