/**
 * Builds the plugin's two scripts into ../wildware-feed/bin/, each one file with
 * everything inlined: a plugin is installed by cloning, so there is no
 * node_modules beside it.
 *
 *   node build.mjs          write them
 *   node build.mjs --check  fail if the committed copies differ from the source
 */
import { build } from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bin = resolve(here, '../wildware-feed/bin');
const check = process.argv.includes('--check');
const out = check ? mkdtempSync(join(tmpdir(), 'feed-build-')) : bin;

const entries = { feed: 'src/feed-bin.ts', channel: 'src/channel-bin.ts' };

for (const [name, entry] of Object.entries(entries)) {
	await build({
		entryPoints: [resolve(here, entry)],
		outfile: join(out, `${name}.mjs`),
		bundle: true,
		platform: 'node',
		format: 'esm',
		target: 'node20',
		legalComments: 'none',
		logLevel: 'warning',
		banner: {
			js: [
				'#!/usr/bin/env node',
				`// Generated from plugins/bridge/${entry} by plugins/bridge/build.mjs. Do not edit.`,
				"import { createRequire as __feedRequire } from 'node:module';",
				'const require = __feedRequire(import.meta.url);'
			].join('\n')
		}
	});
}

if (check) {
	let stale = false;
	for (const name of Object.keys(entries)) {
		const built = readFileSync(join(out, `${name}.mjs`), 'utf8');
		let committed = '';
		try {
			committed = readFileSync(join(bin, `${name}.mjs`), 'utf8');
		} catch {}
		if (built !== committed) {
			stale = true;
			console.error(`bin/${name}.mjs is out of date: run npm run build in plugins/bridge`);
		}
	}
	process.exit(stale ? 1 : 0);
}
