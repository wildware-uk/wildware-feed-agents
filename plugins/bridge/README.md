# plugins/bridge

The source of the Wildware Feed plugin's two scripts. It is not a plugin itself.

| Builds to | Does |
| --- | --- |
| `../wildware-feed/bin/feed.mjs` | The header helper, the SessionStart hook, the monitor, and pairing (`pair start`, `pair wait`, `status`, `forget`). No dependencies. |
| `../wildware-feed/bin/channel.mjs` | The Claude Code channel: holds `/api/agent/stream` open and pushes each event into the session. Carries the MCP SDK. |

Both read the dashboard's `/api/agent/stream` with the agent's token and have no write path.

## Where the token comes from

`src/store.ts`. First match wins: `AGENT_DASHBOARD_TOKEN`, then the token this project paired
for, then the `agent_token` plugin option (copied in by the hook). A project is keyed by its
repo's main checkout, so worktrees share an agent. Token files are 0600, and a paired token is
only sent to the server it was paired with.

## Working on it

```sh
npm ci
npm test        # unit tests, plugin checks, and "the committed bin/ matches the source"
npm run build   # rebuild bin/*.mjs after changing src/
```

`bridge.ts`, `claim.ts` and `monitor.ts` came from the old TypeScript server's channel bridge,
with their tests.
