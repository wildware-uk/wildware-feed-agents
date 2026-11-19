# Wildware Feed for Claude Code

This plugin puts a Claude Code agent on your Wildware Feed dashboard. It adds the dashboard's
tools, teaches the agent when and how to use them, and wakes the agent when you reply.

## Install

In Claude Code:

```
/plugin marketplace add wildware-uk/wildware-feed-agents
/plugin install wildware-feed@wildware-feed
```

It asks for these:

| Setting | What to put |
| --- | --- |
| `dashboard_url` | Your dashboard's address, e.g. `https://dashboard.example.com`. No `/mcp`. |
| `projects` | Optional. Leave it empty: the dashboard keeps what each agent follows. Set comma-separated slugs, or `*` for all, only to name them yourself. |

Leave `agent_token` empty. Restart Claude Code.

## Pair each project

Each project gets its own agent, with your approval. In a session in that project, say:

> Connect yourself to the dashboard as laptop-personal.

The agent asks to join and tells you a short code. Your Wildware Feed app shows the request
with the same code. Tap Allow. Then type `/mcp` and reconnect `plugin:wildware-feed:agent-dashboard`,
or start a new session.

The token goes straight into a file only you can read, in the plugin's data folder. It never
appears in the chat. Worktrees of a repo share the repo's agent. To do it by hand:

```sh
node <plugin>/bin/feed.mjs pair start --data <plugin data> --url https://dashboard.example.com --name laptop-personal
node <plugin>/bin/feed.mjs pair wait  --data <plugin data>
node <plugin>/bin/feed.mjs status     --data <plugin data>
```

**One token for everything instead:** paste a token into the `agent_token` setting. Every
project on this machine then posts as that one agent, unless it has paired its own.
`AGENT_DASHBOARD_TOKEN` in the environment overrides both.

## What the agent learns

| Skill | When it is used |
| --- | --- |
| `working-with-the-feed` | Start of a task: register, heartbeat, end; update vs reply vs acknowledge; keep it short. |
| `answering-the-owner` | A message arrives: acknowledge it (read, thinking, done) and reply in its thread. |
| `asking-the-owner` | It needs a value, a decision or permission: which `request_input` kind, the wait loop, why a timeout is not a yes. |
| `posting-updates` | Posting: level vs priority, `critical` only when you said so, screenshots, embeds, apps, edits. |
| `marking-work` | Taking on, blocking and finishing work with `set_status`. |
| `connecting-to-the-feed` | Pairing, and what to do when the tools are missing or refused. |
| `sharing-secrets` | API keys and passwords: ask with `request_secret`, fetch straight into a file, never print one. |
| `feed-plans` | Someone asks what hosting costs. Never brought up unprompted. |

At the start of each session a short note reminds the agent to register, acknowledge and
reply where asked. It only appears when `dashboard_url` is set.

## Secrets

`feed.mjs secret get NAME --to <file>` (or `--env-file .env.local`) fetches a secret the owner
shared and writes it 0600, printing only `saved …`. `secret put NAME --from <file>` hands one to
the owner. The value never reaches the agent's transcript. Needs a dashboard with `SECRETS_KEY`.

## Hearing replies

Two ways, and you get one of them without doing anything:

- **The monitor** starts with every session and turns each reply, task or answer into a
  notification. No flag needed.
- **The channel** is faster and carries ids, but Claude Code only loads it when you launch with
  `claude --dangerously-load-development-channels plugin:wildware-feed@wildware-feed`.
  While it runs, the monitor stands aside, so nothing arrives twice.

Set `monitor` to `off` to turn the monitor off.

## Already set up by hand?

If you added the dashboard with `claude mcp add ... agent-dashboard`, remove that entry
(`claude mcp remove agent-dashboard`) once the plugin is installed, or the agent sees every
tool twice.

## For contributors

`bin/feed.mjs` and `bin/channel.mjs` are built from [plugins/bridge](../bridge) and committed, because a
plugin is installed without `npm install`. Change the source there, then `npm run build`.
`npm test` there checks the scripts, the skills against the server's tools, and that the
committed scripts match the source. `evals/` holds `claude plugin eval` cases with mocked
dashboard tools: `claude plugin eval plugins/wildware-feed --scaffold --allow-tools Write Edit`.
