---
name: connecting-to-the-feed
description: Use when asked to connect, pair or set up an agent with a Wildware Feed dashboard, when the agent-dashboard tools are missing or fail with HTTP 401 or "not paired", when the session-start note says this project is not connected, or when a project needs its own agent name.
---

# Connecting to the dashboard

Each project pairs itself: it asks to join, the owner taps Allow in their app, and the
plugin saves the new token. The token never appears in the chat. Do not run
`claude mcp add` or ask the owner to paste a token unless pairing is impossible.

Dashboard URL: the one the owner gave you, else the plugin's setting,
`${user_config.dashboard_url}`.

## Pair this project

1. Ask to join. The name is what the owner calls this agent; if they gave none, use
   the repo's folder name.

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/bin/feed.mjs" pair start --data "${CLAUDE_PLUGIN_DATA}" \
     --url "<dashboard URL>" --name "<agent name>"
   ```

2. Tell the owner the code it printed, in your reply: "Allow `laptop-personal` in your
   Wildware Feed app. The code is K7Q2."
3. Wait for their decision (up to 9 minutes per call; run it again if it says it is
   still waiting):

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/bin/feed.mjs" pair wait --data "${CLAUDE_PLUGIN_DATA}"
   ```

4. When it says "Paired", ask the owner to run `/mcp` and reconnect
   `plugin:wildware-feed:agent-dashboard` (or start a new session). Then
   `register_session`.

Denied or expired means stop. Do not connect another way; ask the owner.

Run these from the project folder. The agent is keyed to the repo, so its worktrees
share it. `status` shows what is set up, `forget` drops this project's token:

```sh
node "${CLAUDE_PLUGIN_ROOT}/bin/feed.mjs" status --data "${CLAUDE_PLUGIN_DATA}"
```

## When the plugin is not set up

- No dashboard URL: the owner sets `dashboard_url` with
  `/plugin` → Wildware Feed → Configure, then restarts.
- Install: `/plugin marketplace add wildware-uk/wildware-feed-agents`, then
  `/plugin install wildware-feed@wildware-feed`.
- One token for every project on this machine: the owner pastes it into the plugin's
  `agent_token` option. Pairing is still better: one agent per project.

## Already have a working token?

That session can pair a second agent with the `start_pairing` and `await_pairing` tools.
They hand the new token back in the chat, so prefer the script above. If you do use
them, never post the token anywhere.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Tools missing entirely | `dashboard_url` unset, or the session started before it was set. |
| HTTP 401 on every call | Not paired, or the token was revoked. Pair again. |
| Paired but still 401 | The MCP connection is from before pairing. `/mcp` → reconnect. |
| Replies arrive late | No channel. Normal: the monitor or `heartbeat` delivers them. |
