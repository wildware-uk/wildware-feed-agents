import { mkdtempSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Store, projectKey, projectRoot, sameOrigin, type Paired } from './store';

const temp = () => mkdtempSync(join(tmpdir(), 'feed-store-'));
const noGit = () => null;

function paired(over: Partial<Paired> = {}): Paired {
	return {
		url: 'https://dashboard.example.com',
		name: 'laptop',
		agent_id: 'A1',
		token: 'secret-token',
		project: '/p',
		paired_at: '2026-01-01T00:00:00.000Z',
		...over
	};
}

describe('which project a session belongs to', () => {
	it('is the main checkout for anything inside a git repo, worktrees included', () => {
		expect(projectRoot('/', () => '/work/app/.git')).toBe('/work/app');
	});

	it('is the folder itself outside git', () => {
		const dir = temp();
		expect(projectRoot(dir, noGit)).toBe(dir);
	});

	it('uses the real git when there is one', () => {
		const dir = temp();
		mkdirSync(join(dir, 'sub'));
		// Not a repo: the folder is its own root.
		expect(projectRoot(join(dir, 'sub'))).toBe(join(dir, 'sub'));
	});

	it('gives two roots two keys and one root one key', () => {
		expect(projectKey('/a')).toBe(projectKey('/a'));
		expect(projectKey('/a')).not.toBe(projectKey('/b'));
	});
});

describe('which token a session uses', () => {
	it('prefers the environment, then the pairing, then the plugin option', () => {
		const store = Store.for(temp(), temp(), noGit);
		expect(store.resolve({})).toBeNull();

		store.saveOptionToken('option-token');
		expect(store.resolve({})).toMatchObject({ token: 'option-token', source: 'option' });

		store.savePaired(paired());
		expect(store.resolve({})).toMatchObject({ token: 'secret-token', source: 'paired', name: 'laptop' });

		expect(store.resolve({ AGENT_DASHBOARD_TOKEN: ' env-token ' })).toMatchObject({ token: 'env-token', source: 'env' });
	});

	it('sends the option token only to the dashboard it was set for', () => {
		const store = Store.for(temp(), temp(), noGit);
		store.saveOptionToken('option-token', 'https://feed.example.com');
		expect(store.resolve({}, 'https://feed.example.com/mcp')).toMatchObject({ token: 'option-token' });
		// The dashboard URL changed and the token didn't: it stays bound to the first.
		store.saveOptionToken('option-token', 'https://elsewhere.example');
		expect(store.resolve({}, 'https://elsewhere.example/mcp')).toBeNull();
		expect(store.resolve({}, 'https://feed.example.com/mcp')).toMatchObject({ token: 'option-token' });
		// A new token, entered for the new dashboard, goes there.
		store.saveOptionToken('new-token', 'https://elsewhere.example');
		expect(store.resolve({}, 'https://elsewhere.example/mcp')).toMatchObject({ token: 'new-token' });
	});

	it('sends no token over plain http to the internet', () => {
		const store = Store.for(temp(), temp(), noGit);
		store.saveOptionToken('option-token', 'http://feed.example.com');
		expect(store.resolve({ AGENT_DASHBOARD_TOKEN: 'env-token' }, 'http://feed.example.com/mcp')).toBeNull();
		expect(store.resolve({ AGENT_DASHBOARD_TOKEN: 'env-token' }, 'http://127.0.0.1:8010/mcp')).toMatchObject({ token: 'env-token' });
	});

	it('keeps one project’s token away from another project', () => {
		const data = temp();
		Store.for(data, '/one', noGit).savePaired(paired());
		expect(Store.for(data, '/two', noGit).resolve({})).toBeNull();
		expect(Store.for(data, '/one', noGit).resolve({})?.token).toBe('secret-token');
	});

	it('never sends a paired token to a different server', () => {
		const store = Store.for(temp(), '/p', noGit);
		store.savePaired(paired());
		expect(store.resolve({}, 'https://dashboard.example.com/mcp')?.source).toBe('paired');
		expect(store.resolve({}, 'https://other.example.com/mcp')).toBeNull();
	});

	it('drops the option copy when the option is cleared', () => {
		const store = Store.for(temp(), '/p', noGit);
		store.saveOptionToken('x');
		store.saveOptionToken('');
		expect(store.optionToken()).toBeNull();
	});

	it('writes token files readable only by their owner', () => {
		const store = Store.for(temp(), '/p', noGit);
		store.savePaired(paired());
		store.saveOptionToken('x');
		const files = [join(store.data, 'agents', `${store.key}.json`), store.optionPath];
		for (const file of files) expect(statSync(file).mode & 0o777).toBe(0o600);
	});

	it('treats a broken file as no token rather than failing', () => {
		const store = Store.for(temp(), '/p', noGit);
		mkdirSync(join(store.data, 'agents'), { recursive: true });
		writeFileSync(join(store.data, 'agents', `${store.key}.json`), '{"token":');
		expect(store.resolve({})).toBeNull();
	});

	it('forgets a pairing', () => {
		const store = Store.for(temp(), '/p', noGit);
		store.savePaired(paired());
		expect(store.forget()).toBe(true);
		expect(store.forget()).toBe(false);
		expect(store.paired()).toBeNull();
	});
});

describe('same origin', () => {
	it('compares origins and treats a missing server as a match', () => {
		expect(sameOrigin('https://a.example.com', 'https://a.example.com/mcp')).toBe(true);
		expect(sameOrigin('https://a.example.com', 'http://a.example.com/mcp')).toBe(false);
		expect(sameOrigin('https://a.example.com', undefined)).toBe(true);
		expect(sameOrigin('nonsense', 'https://a.example.com')).toBe(false);
	});
});
