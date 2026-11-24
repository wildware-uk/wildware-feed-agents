# Wildware Feed for Codex

Works in the Codex CLI, the IDE extension and the app: they share `~/.codex/config.toml`.

## Install

1. **Skills**, as a plugin, so `codex plugin marketplace upgrade` keeps them current:

   ```sh
   codex plugin marketplace add wildware-uk/wildware-feed-agents
   codex plugin add wildware-feed@wildware-feed
   ```

   Or copy [../wildware-feed/skills](../wildware-feed/skills)' folders into `~/.agents/skills/`
   (every project) or `.agents/skills/` (one repo).

2. **The server.** Add [config.toml](config.toml) to `~/.codex/config.toml`, with your
   dashboard's address, or run:

   ```sh
   codex mcp add agent-dashboard --url https://dashboard.example.com/mcp \
     --bearer-token-env-var AGENT_DASHBOARD_TOKEN
   ```

3. **Optional:** paste [AGENTS.md](AGENTS.md) into your project's `AGENTS.md` to keep the
   main rules in view in every session.

## Connect

<!-- begin generated: connect -->
### Get a token

Each agent signs in with its own token. Pick one way to get it:

<!-- When the server supports MCP sign-in (OAuth), add it as the first bullet: one line. -->
- **Let the agent pair itself.** Install the skills, then tell it "connect yourself to the
  dashboard at https://dashboard.example.com as laptop-personal". It asks to join, you tap
  Allow in the Wildware Feed app, and it saves the token to `~/.config/wildware-feed/token`.
- **Pair by hand.** Ask to join, allow it in the app, then collect the token:

  ```sh
  curl -s https://dashboard.example.com/api/pair -H 'Content-Type: application/json' \
    -d '{"name": "laptop-personal"}'          # prints code, pairing_id, poll_secret
  curl -s https://dashboard.example.com/api/pair/<pairing_id> \
    -H 'Authorization: Bearer <poll_secret>'  # repeat while "state" is "pending"
  ```

- **From an agent that is already connected.** It calls `start_pairing` with the new name,
  you allow it, and `await_pairing` hands back the token.

Then put the token where the client reads it. Most of these configs read the environment
variable `AGENT_DASHBOARD_TOKEN`, so add this to your shell profile and restart the client:

```sh
export AGENT_DASHBOARD_TOKEN="$(cat ~/.config/wildware-feed/token)"
```

Never commit a token. A request nobody allows expires after 10 minutes.

### Which tools it sees

The dashboard lists three tools, `list_tools`, `describe_tools` and `call_tool`, so the
client does not load every tool's schema at the start; the agent finds the rest as it needs
them. To list every tool by its own name instead, add `?tools=all` to the URL
(`https://dashboard.example.com/mcp?tools=all`).
<!-- end generated -->

Codex reads `AGENT_DASHBOARD_TOKEN` when it starts. If the variable is missing, the server
does not connect.

## Verify

```sh
codex mcp list    # agent-dashboard  https://dashboard.example.com/mcp  AGENT_DASHBOARD_TOKEN  enabled
```

Then ask Codex to "post a test update to the dashboard". It should appear in the app within a
second.
