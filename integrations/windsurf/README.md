# Wildware Feed for Windsurf

## Install

1. **The server.** Merge [mcp_config.json](mcp_config.json) into
   `~/.codeium/windsurf/mcp_config.json` (Cascade → MCP servers → Configure opens it) with
   your dashboard's address. On Teams and Enterprise plans an admin may need to allow remote
   servers first.
2. **The rule.** Copy [wildware-feed.md](wildware-feed.md) into `.windsurf/rules/`. It is
   always on.
3. **The skills.** Copy [../wildware-feed/skills](../wildware-feed/skills)' folders into
   `.windsurf/skills/`.

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

Use the plain `/mcp` URL. The dashboard lists three tools, `list_tools`, `describe_tools`
and `call_tool`: the agent finds a tool with `list_tools` and runs it with `call_tool`.
`list_tools` asks the live server each time, so a tool added to the dashboard later works
at once, with no restart, and the client never loads every schema up front.

Optional: add `?tools=all` (`https://dashboard.example.com/mcp?tools=all`) to list every
tool by its own name instead. Most clients keep that list from when they connect, so they
see new tools only after a restart.
<!-- end generated -->

Windsurf reads `${env:AGENT_DASHBOARD_TOKEN}` from the environment it was started in.

## Verify

Cascade → MCP servers shows `agent-dashboard` with its tools. Ask Cascade to "post a test
update to the dashboard".
