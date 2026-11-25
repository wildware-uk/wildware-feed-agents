/**
 * Builds the evals' mocked dashboard from the server's own tool files, so the evals see the
 * tools exactly as a plain `/mcp` session does: list_tools, describe_tools and call_tool.
 *
 *   evals/mocks/agent-dashboard/_tools.json      the three discovery tools, as the server lists them
 *   evals/mocks/agent-dashboard/list_tools.md    every tool by area, as list_tools answers
 *   evals/mocks/agent-dashboard/describe/*.md    one tool each, as describe_tools answers
 *   <case>/mocks/agent-dashboard/fixtures/*.md   the suite's call_tool answers, with the case's own on top
 *
 * Hand-written: evals/mocks/agent-dashboard/fixtures/<tool>.md, what call_tool answers for each
 * tool, and a case's own fixtures named in OVERRIDES. A case mock reads files only from its
 * own folder, so each case that changes an answer carries a full copy of the rest.
 *
 *   node eval-mocks.mjs          write them, from FEED_SERVER_DIR or the server's master branch
 *   node eval-mocks.mjs --check  fail if a committed copy is out of date
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const EVALS = 'plugins/wildware-feed/evals';
export const MOCKS = `${EVALS}/mocks/agent-dashboard`;
const SERVER_REPO = 'wildware-uk/wildware-feed';
const SERVER = {
	tools: 'server/src/main/resources/mcp/tools-list.json',
	discovery: 'server/src/main/resources/mcp/discovery-tools.json',
	areas: 'server/src/main/kotlin/dev/wildware/feed/server/mcp/Discovery.kt'
};

/** The cases that answer some tools differently: case folder to the fixtures it writes itself. */
export const OVERRIDES = {
	'owner-message-in-thread': ['get_messages'],
	'draft-for-approval': ['await_request']
};

/** The body of every call_tool mock: the fixture named after the tool it runs. */
export const CALL_TOOL = '{{file:fixtures/{input.name}.md}}\n';

const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const pretty = (value) => JSON.stringify(value, null, 2);

/** Discovery.kt's AREAS, in order: [area, tool names]. */
export function areasFrom(kotlin) {
	const block = /val AREAS[^=]*=\s*linkedMapOf\(([\s\S]*?)\n\s*\)/.exec(kotlin)?.[1];
	if (!block) throw new Error('Discovery.kt: no AREAS map; update eval-mocks.mjs');
	return [...block.matchAll(/"([a-z]+)" to listOf\(([^)]*)\)/g)].map((m) => [m[1], [...m[2].matchAll(/"([a-z_]+)"/g)].map((n) => n[1])]);
}

/** Every generated file, path to text, from the server's three files. */
export function generate({ tools, discovery, areas }) {
	const all = JSON.parse(tools);
	const byName = new Map(all.map((t) => [t.name, t]));
	const files = {};
	files[`${MOCKS}/_tools.json`] = `${pretty({ tools: JSON.parse(discovery) })}\n`;

	const grouped = areasFrom(areas)
		.map(([area, names]) => ({ area, tools: names.filter((n) => byName.has(n)).map((n) => ({ name: n, summary: byName.get(n).title ?? '' })) }))
		.filter((a) => a.tools.length);
	const listed = new Set(grouped.flatMap((a) => a.tools.map((t) => t.name)));
	const other = all.filter((t) => !listed.has(t.name)).map((t) => ({ name: t.name, summary: t.title ?? '' }));
	if (other.length) grouped.push({ area: 'other', tools: other });
	files[`${MOCKS}/list_tools.md`] =
		`${all.length} dashboard tools in ${grouped.length} areas. describe_tools({names}) gives their arguments; call_tool({name, arguments}) runs one.\n` +
		`${pretty({ count: all.length, areas: grouped })}\n`;

	for (const tool of all) {
		files[`${MOCKS}/describe/${tool.name}.md`] = `1 tool: ${tool.name}. Run one with call_tool({name, arguments}).\n${pretty({ tools: [tool] })}\n`;
	}

	const suite = fixtures(`${MOCKS}/fixtures`);
	for (const [kase, own] of Object.entries(OVERRIDES)) {
		const dir = `${EVALS}/${kase}/mocks/agent-dashboard`;
		files[`${dir}/call_tool.md`] = CALL_TOOL;
		for (const [name, text] of Object.entries(suite)) {
			if (!own.includes(name)) files[`${dir}/fixtures/${name}.md`] = text;
		}
	}
	return files;
}

/** The hand-written fixtures in [dir], tool name to text. */
function fixtures(dir) {
	const full = join(ROOT, dir);
	if (!existsSync(full)) return {};
	return Object.fromEntries(
		readdirSync(full)
			.filter((f) => f.endsWith('.md'))
			.sort()
			.map((f) => [f.slice(0, -3), readFileSync(join(full, f), 'utf8')])
	);
}

/** Generated paths whose committed copy differs, and generated folders holding a file no longer made. */
export function stale(files) {
	const out = Object.entries(files)
		.filter(([path, text]) => !existsSync(join(ROOT, path)) || read(path) !== text)
		.map(([path]) => path);
	for (const dir of generatedDirs()) {
		for (const f of existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)) : []) {
			if (!(`${dir}/${f}` in files) && !isOwn(dir, f)) out.push(`${dir}/${f}`);
		}
	}
	return out;
}

function generatedDirs() {
	return [`${MOCKS}/describe`, ...Object.keys(OVERRIDES).map((k) => `${EVALS}/${k}/mocks/agent-dashboard/fixtures`)];
}

function isOwn(dir, file) {
	return Object.entries(OVERRIDES).some(([k, own]) => dir === `${EVALS}/${k}/mocks/agent-dashboard/fixtures` && own.includes(file.replace(/\.md$/, '')));
}

/** The server's files: from FEED_SERVER_DIR, else its master branch. */
export async function serverInputs() {
	const local = process.env.FEED_SERVER_DIR?.trim();
	const get = async (path) => {
		if (local) return readFileSync(resolve(local, path), 'utf8');
		const response = await fetch(`https://raw.githubusercontent.com/${SERVER_REPO}/master/${path}`, { signal: AbortSignal.timeout(15_000) });
		if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
		return response.text();
	};
	return { tools: await get(SERVER.tools), discovery: await get(SERVER.discovery), areas: await get(SERVER.areas) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const files = generate(await serverInputs());
	if (process.argv.includes('--check')) {
		const out = stale(files);
		if (out.length) {
			console.error(`out of date, run node eval-mocks.mjs:\n${out.join('\n')}`);
			process.exit(1);
		}
	} else {
		for (const dir of generatedDirs()) {
			for (const f of existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)) : []) {
				if (!isOwn(dir, f)) rmSync(join(ROOT, dir, f));
			}
		}
		for (const [path, text] of Object.entries(files)) {
			mkdirSync(dirname(join(ROOT, path)), { recursive: true });
			writeFileSync(join(ROOT, path), text);
		}
		console.log(`wrote ${Object.keys(files).length} files`);
	}
}
