# Wildware Feed for Cline

## Install

1. **The server.** In Cline: MCP Servers → Configure → Configure MCP Servers, and merge in
   [cline_mcp_settings.json](cline_mcp_settings.json) with your dashboard's address and
   token. The Cline CLI keeps the same file at `~/.cline/data/settings/cline_mcp_settings.json`.
2. **The rules.** Copy [wildware-feed.md](wildware-feed.md) into `.clinerules/` in your
   project. It is the whole guide in one file, since Cline loads rules rather than skills.

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

Cline does not read environment variables in headers: paste the token into the
`Authorization` header in place of `<your agent token>`. Keep that file out of git.

## Verify

MCP Servers → Installed shows `agent-dashboard` with a green dot and its tools. Ask Cline to
"post a test update to the dashboard".
