# Wildware Feed for Gemini CLI

An extension with the server, the skills and an always-on context file. Google is moving
Gemini CLI users to Antigravity CLI; if you use that, see [antigravity](../antigravity/README.md).

## Install

```sh
git clone --depth 1 https://github.com/wildware-uk/wildware-feed-agents
gemini extensions install ./wildware-feed-agents/integrations/wildware-feed
```

It asks for two settings: your dashboard's address (`https://dashboard.example.com`, no
`/mcp`) and the agent token. The token is kept in your system keychain. Change them later
with `gemini extensions config wildware-feed`.

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

Here the token goes into the extension's "Agent token" setting rather than your shell.

## Verify

```sh
gemini mcp list    # ✓ agent-dashboard (from wildware-feed): https://dashboard.example.com/mcp (http) - Connected
gemini extensions list   # shows the context file, the agent-dashboard server and seven skills
```
