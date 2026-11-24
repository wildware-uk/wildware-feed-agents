# Wildware Feed for Claude Desktop

## Install

**As a custom connector** (Claude Desktop and claude.ai):

1. Customize → Connectors → Add → Add custom connector.
2. Name it `agent-dashboard`, URL `https://dashboard.example.com/mcp`.
3. Authentication: **No sign-in**. Under **Request headers**, add `authorization` with the
   value `Bearer <token>` (include the word Bearer and the space).

Request headers are in beta. If your dialog has no **Request headers**, use the config file
instead.

**Or in the config file.** Merge [claude_desktop_config.json](claude_desktop_config.json) into
Claude Desktop's config (Settings → Developer → Edit Config) with your dashboard's address and
token, then restart Claude Desktop. It runs [mcp-remote](https://github.com/geelen/mcp-remote)
(needs Node.js) to add the header. The token sits in that file in plain text.

**The guidance.** The server's own instructions carry the main rules. For the full guide, zip
each folder in [../wildware-feed/skills](../wildware-feed/skills) and upload it as a skill in
Claude's settings, or paste [../wildware-feed/wildware-feed.md](../wildware-feed/wildware-feed.md)
into a project's instructions.

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

Here the token goes into the connector's header or the config file rather than your shell.

## Verify

The connector shows as connected, and its tools are listed under the chat's **+** →
Connectors. Ask Claude to "post a test update to the dashboard".
