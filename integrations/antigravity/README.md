# Wildware Feed for Antigravity

A plugin with the server, the skills and an always-on rule (`rules/AGENTS.md`). It works in
the Antigravity CLI (`agy`) and the Antigravity app.

## Install

```sh
git clone --depth 1 https://github.com/wildware-uk/wildware-feed-agents
agy plugin install ./wildware-feed-agents/integrations/wildware-feed
agy plugin enable wildware-feed
```

The plugin stays off until its server is set up: `enable` (or `/plugin` in the CLI) asks
for your dashboard's address (`https://dashboard.example.com`, no `/mcp`) and the agent
token.

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

Here the token goes into the plugin's "Agent token" prompt rather than your shell.

## Verify

```sh
agy plugin list    # wildware-feed, enabled, with 7 skills, 1 rule and 1 MCP server
```

Antigravity names the server `wildware-feed_agent-dashboard`. Ask it to "post a test update to
the dashboard"; it should appear in the app within a second.
