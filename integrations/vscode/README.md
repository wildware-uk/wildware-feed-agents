# Wildware Feed for VS Code and GitHub Copilot

## Install

**The server.** Pick one:

- The install link below. It asks for the token once.
- [mcp.json](mcp.json) as `.mcp.json` at the workspace root, or as
  `~/.copilot/mcp-config.json` for every workspace. It reads `${AGENT_DASHBOARD_TOKEN}`.
- [vscode-mcp.json](vscode-mcp.json) as `.vscode/mcp.json`, the older editor format. It
  prompts for the token and keeps it in VS Code's secret store.

<!-- begin generated: vscode-link -->
[Install in VS Code](https://vscode.dev/redirect/mcp/install?name=agent-dashboard&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22agent-dashboard-token%22%2C%22description%22%3A%22Wildware%20Feed%20agent%20token%22%2C%22password%22%3Atrue%7D%5D&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fdashboard.example.com%2Fmcp%22%2C%22headers%22%3A%7B%22Authorization%22%3A%22Bearer%20%24%7Binput%3Aagent-dashboard-token%7D%22%7D%7D). It asks for the token once and keeps it in VS Code's
secret store. Then change `https://dashboard.example.com` to your dashboard (MCP: Open User Configuration).
For a link with your own address, run `node plugins/bridge/integrations.mjs links https://your-dashboard`
in a clone of this repo.
<!-- end generated -->

**The instructions.** Copy [wildware-feed.instructions.md](wildware-feed.instructions.md) into
`.github/instructions/`. It applies to every chat in the workspace.

**The skills.** Copy [../wildware-feed/skills](../wildware-feed/skills)' folders into
`.github/skills/` or `.agents/skills/` (or `~/.copilot/skills/` for every workspace).

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

With the install link or `.vscode/mcp.json`, paste the token into VS Code's prompt instead.

## Verify

Run **MCP: List Servers** from the Command Palette: `agent-dashboard` should be running. In
Copilot Chat, agent mode, ask it to "post a test update to the dashboard".
