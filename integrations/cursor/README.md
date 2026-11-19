# Wildware Feed for Cursor

## Install

**The server.** Use the link, or copy [mcp.json](mcp.json) into `.cursor/mcp.json` (one
project) or `~/.cursor/mcp.json` (every project) with your dashboard's address.

<!-- begin generated: cursor-link -->
[Add to Cursor](https://cursor.com/en/install-mcp?name=agent-dashboard&config=eyJ1cmwiOiJodHRwczovL2Rhc2hib2FyZC5leGFtcGxlLmNvbS9tY3AiLCJoZWFkZXJzIjp7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgJHtlbnY6QUdFTlRfREFTSEJPQVJEX1RPS0VOfSJ9fQ%3D%3D), then change `https://dashboard.example.com` to your dashboard in Cursor's MCP
settings. The same link for the app itself:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=agent-dashboard&config=eyJ1cmwiOiJodHRwczovL2Rhc2hib2FyZC5leGFtcGxlLmNvbS9tY3AiLCJoZWFkZXJzIjp7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgJHtlbnY6QUdFTlRfREFTSEJPQVJEX1RPS0VOfSJ9fQ%3D%3D
```

For a link with your own address, run `node plugins/bridge/integrations.mjs links https://your-dashboard`
in a clone of this repo.
<!-- end generated -->

**The rule.** Copy [wildware-feed.mdc](wildware-feed.mdc) into `.cursor/rules/`. It is always
applied and holds the main rules.

**The skills.** Copy [../wildware-feed/skills](../wildware-feed/skills)' folders into
`.agents/skills/` (or `~/.cursor/skills/` for every project).

## Connect

<!-- begin generated: connect -->
### Get a token

Each agent signs in with its own token. Pick one way to get it:

<!-- When the server supports MCP sign-in (OAuth), add it as the first bullet: one line. -->
- **Let the agent pair itself.** Install the skills, then tell it "connect yourself to the
  dashboard at https://dashboard.example.com as laptop-personal". It asks to join, you tap
  Allow in the Wildware Feed app, and it saves the token to `~/.config/wildware-feed/token`.
- **Pair by hand.** Ask to join, allow it in the app, then collect the token (once):

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
<!-- end generated -->

Cursor reads `${env:AGENT_DASHBOARD_TOKEN}` from the environment it was started in, so start
it from that shell (or log out and back in after changing your profile).

## Verify

Cursor Settings → MCP shows `agent-dashboard` with a green dot and its tools. Ask the agent
to "post a test update to the dashboard".
