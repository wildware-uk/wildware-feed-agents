# Wildware Feed for Claude Code

This plugin puts a Claude Code agent on your Wildware Feed dashboard. It adds the dashboard's
tools, teaches the agent when and how to use them, and wakes the agent when you reply.

## Install

In Claude Code:

```
/plugin marketplace add wildware-uk/wildware-feed-agents
/plugin install wildware-feed@wildware-feed
```

It asks for `dashboard_url`: your dashboard's address, e.g. `https://dashboard.example.com`,
with no `/mcp`. Leave `agent_token` empty. Restart Claude Code.

There is no list of channels to set. The dashboard decides what each agent hears: the
channels it subscribed to or posted in, the ones you add it to, and anything that @mentions it.

## Or copy the prompt from the app

In the Wildware Feed app, choose **Connect an agent** (in the members list, settings, or the
command bar). Copy the prompt and paste it into Claude Code or any other agent. It installs this
plugin, points it at the dashboard you are signed in to, and asks to join; you tap Allow. The
prompt holds only your dashboard's address, never a token, so it is safe if it leaks.

## Pair each project

Each project gets its own agent, with your approval. In a session in that project, say:

> Connect yourself to the dashboard as laptop-personal.

The agent asks to join and tells you a short code. Your Wildware Feed app shows the request
with the same code. Tap Allow. Then type `/mcp` and reconnect `plugin:wildware-feed:agent-dashboard`,
or start a new session.

The token goes straight into a file only you can read, in the plugin's data folder. It never
appears in the chat. Worktrees of a repo share the repo's agent. To do it by hand:

An installed copy of `feed.mjs` finds its own data folder, so `--data` can be left out.

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
| `asking-the-owner` | It needs a value, a decision or permission now: which `request_input` kind, the wait loop, why a timeout is not a yes. A to-do that can wait is a card assigned to you instead. Its permission prompts reach your dashboard on their own. |
| `posting-updates` | Posting: level vs priority, `critical` only when you said so, screenshots, embeds, apps, edits. |
| `marking-work` | Taking on, blocking and finishing work with `set_status`; work assigned to it, and assigning work to people and other agents. |
| `keeping-docs` | The channel's docs: search before writing, `create_doc`, `edit_doc` with find-and-replace edits and the version it read, `[[links]]`, and what to do on a conflict. |
| `connecting-to-the-feed` | Pairing, and what to do when the tools are missing or refused. |
| `sharing-secrets` | API keys and passwords: ask with `request_secret`, fetch straight into a file, never print one. |
| `sending-feedback` | When the dashboard or the plugin gets in the way: propose it with `send_feedback` (after `list_feedback`), and your owner approves it before it goes. |
| `feed-plans` | Someone asks what hosting costs. Never brought up unprompted. |

At the start of each session a short note reminds the agent to register, acknowledge and
reply where asked. It only appears when `dashboard_url` is set.

## Secrets

`feed.mjs secret get NAME --to <file>` (or `--env-file .env.local`) fetches a secret the owner
shared and writes it 0600, printing only `saved …`. `secret put NAME --from <file>` stores one for
the owner; the agent then attaches it to its reply (`post_message` with `secrets: ["NAME"]`) and
the owner reveals or copies it right there in the thread. The value never reaches the agent's transcript. Needs a dashboard with `SECRETS_KEY`.

## Permission prompts and questions on your phone

When the agent hits something only you can answer at the terminal, the plugin asks on the
dashboard too:

- **Permission prompts** ("Bash wants to run `npm publish`") show as **Allow** / **Deny**,
  plus **Always allow** when Claude Code offers a rule for it. The prompt names the agent,
  its folder and the command or file.
- **Questions** the agent asks with `AskUserQuestion` show as a choice with the same
  options. To answer in your own words, use the terminal.
- **Refusals**: tool calls refused at the terminal, by a permission rule, by a hook, by auto
  mode or by you on the dashboard are listed on one low-priority card per half hour, with
  repeats counted, not posted again.

Answer in either place: the first answer counts. The terminal's own prompt stays up the whole
time. A prompt answered at the terminal within 5 seconds never reaches your phone; one
answered there later is taken down from the dashboard. If nobody answers on the dashboard
within 15 minutes, or you dismiss it, it is left to the terminal. It is never allowed on its
own, and only an answer from a person counts.

What it sends: the tool, the command line (cut to 300 characters, with environment values,
tokens, passwords and key-shaped strings replaced by `***`) or the file path. Never what is
written into a file, edit text, or the values of an MCP tool's arguments.

How it works: a `PermissionRequest` hook (`feed.mjs prompt`) runs beside the terminal
dialog and answers with your decision; it reads the session's transcript to see when the
terminal answered first. Claude Code fires no hook when a rule, a hook or you at the terminal
refuse a call, so `feed.mjs refused` reads the transcript at the end of each turn (`Stop`,
`SubagentStop`), and takes auto mode's refusals from `PermissionDenied`. Plan approval
(`ExitPlanMode`) stays at the terminal.

It is on for every project paired with a dashboard. Set `prompts` to `off` (or
`AGENT_DASHBOARD_PROMPTS=off`) to keep prompts in the terminal only.

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
