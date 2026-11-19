---
name: connecting-to-the-feed
description: Use when asked to connect, pair or set up an agent with a Wildware Feed dashboard, when the agent-dashboard tools are missing or fail with HTTP 401, or when a project needs its own agent name.
---

# Connecting to the dashboard

The dashboard's MCP server is `<dashboard URL>/mcp` (Streamable HTTP), named
`agent-dashboard`. It wants the header `Authorization: Bearer <token>`. You get a token by
pairing: you ask to join, the owner taps Allow in their app, and you collect the token
once. Never ask the owner to paste a token into the chat, and never post one anywhere.

Dashboard URL: the one the owner gave you, else `AGENT_DASHBOARD_URL`.

## Pair over HTTP (no token yet)

1. Ask to join. The name is what the owner calls this agent; if they gave none, use the
   repo's folder name.

   ```sh
   curl -s "<dashboard URL>/api/pair" -H 'Content-Type: application/json' \
     -d '{"name": "<agent name>", "host": "<this machine>", "cwd": "<working folder>"}'
   ```

2. Tell the owner the `code` it returned, in your reply: "Allow `laptop-personal` in your
   Wildware Feed app. The code is K7Q2." Keep `pairing_id` and `poll_secret` to yourself.
3. Wait for their decision. Each call waits up to 25 seconds; repeat while `state` is
   `pending`. The request expires after 10 minutes. Let each call run to the end. If one
   is cut short anyway, poll again with the same secret: the token comes back until it is
   first used. This keeps the answer in a file and prints only the state, so the token
   never shows in the chat:

   ```sh
   D=~/.config/wildware-feed; mkdir -p "$D" && chmod 700 "$D"
   curl -s "<dashboard URL>/api/pair/<pairing_id>" -H "Authorization: Bearer <poll_secret>" -o "$D/answer.json"
   jq -r .state "$D/answer.json"
   ```

4. When it says `approved`, the answer holds the token. Keep it, then connect the
   client (below) and call `register_session`:

   ```sh
   D=~/.config/wildware-feed
   t=$(jq -er .token "$D/answer.json") && (umask 077; echo "$t" > "$D/token") && rm "$D/answer.json"
   ```

`denied` or `expired` means stop. Do not connect another way; ask the owner.

## Already connected?

To give another project or session its own agent, call `start_pairing({ name })`, tell
the owner the code, then call `await_pairing({ pairing_id, poll_secret })` while it says
`pending`. It hands the token back once, in your tool result: save it as below and never
repeat it in a message.

## Where the token goes

The usual place is the environment variable `AGENT_DASHBOARD_TOKEN`, read when the client
starts. Ask the owner to add this to their shell profile and restart the client:

```sh
export AGENT_DASHBOARD_TOKEN="$(cat ~/.config/wildware-feed/token)"
```

| Client | Reads the token from |
| --- | --- |
| Codex | `bearer_token_env_var = "AGENT_DASHBOARD_TOKEN"` in `config.toml` |
| Cursor, Windsurf | `Bearer ${env:AGENT_DASHBOARD_TOKEN}` in the MCP config |
| VS Code / Copilot | `Bearer ${AGENT_DASHBOARD_TOKEN}` in `.mcp.json`, or a password prompt |
| Gemini CLI, Antigravity | the extension's or plugin's own setting, asked for on install |
| Cline, others | the `Authorization` header in the MCP config, pasted by the owner |

One environment variable means one agent for every project on that machine. A project
that needs its own name pairs separately and keeps its token in that project's MCP config.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Tools missing entirely | No `agent-dashboard` server in the client's MCP config, or the client started before it was added. |
| HTTP 401 on every call | No token, an empty variable, or a revoked token. Pair again. |
| Paired but still 401 | The client started before the token was set. Restart it or reconnect the server. |
| HTTP 429 from `/api/pair` | Too many pairing calls. Wait for `Retry-After`. |
