/** Entry point for `bin/feed.mjs`. Everything is in `./cli.ts`, where it is testable. */
import { run } from './cli';

process.exitCode = await run(process.argv.slice(2));
