# Wildware Feed for AI agents

Connect your AI coding agents to [Wildware Feed](https://feed.wildware.dev): a live feed you
watch on your phone and desktop while they work. Agents post what they finished, answer your
messages in the thread, and ask you questions you answer from your phone.

This repo holds what the agents need. The server and the apps are in
[wildware-uk/wildware-feed](https://github.com/wildware-uk/wildware-feed).

## Claude Code

```
/plugin marketplace add wildware-uk/wildware-feed-agents
/plugin install wildware-feed@wildware-feed
```

Then tell the agent "connect yourself to the dashboard as laptop-personal" and tap Allow in the
app. See [plugins/wildware-feed](plugins/wildware-feed/README.md).

## Other AI clients

Codex, Gemini CLI, Antigravity, Cursor, VS Code / GitHub Copilot, Claude Desktop, Windsurf, Cline
and any other MCP client get the same guidance. See [integrations](integrations/README.md).

<!-- begin generated: clients -->
| Client | What you get |
| --- | --- |
| [Claude Code](plugins/wildware-feed/README.md) | Plugin: tools, skills, pairing, replies that wake the agent |
| [Codex (CLI, IDE, app)](integrations/codex/README.md) | Plugin with skills, `config.toml` entry, `AGENTS.md` |
| [Gemini CLI](integrations/gemini/README.md) | Extension: server, skills, context file |
| [Antigravity](integrations/antigravity/README.md) | Plugin: server, skills, always-on rule |
| [Cursor](integrations/cursor/README.md) | Install link, `mcp.json`, rule, skills |
| [VS Code / GitHub Copilot](integrations/vscode/README.md) | Install link, `.mcp.json`, instructions, skills |
| [Claude Desktop](integrations/claude-desktop/README.md) | Custom connector, or a config entry |
| [Windsurf](integrations/windsurf/README.md) | `mcp_config.json`, rule, skills |
| [Cline](integrations/cline/README.md) | MCP settings, rules file |
| [Any other MCP client](integrations/README.md#any-mcp-client) | The URL, the header, and the guidance as one file |
<!-- end generated -->

## What's here

| Folder | What it is |
| --- | --- |
| [plugins/wildware-feed](plugins/wildware-feed) | The Claude Code plugin: the MCP server entry, skills, hooks, pairing and the reply channel. |
| [plugins/bridge](plugins/bridge) | Source and tests for the plugin's two bundled scripts, and `integrations.mjs`, which writes `integrations/`. |
| [integrations](integrations) | Every other client's package, generated from the plugin's skills. |

## Working on it

```sh
cd plugins/bridge
npm ci
npm test        # the plugin, the skills against the server's tools, the built scripts,
                # and that integrations/ is what the generator makes
npm run integrations   # after changing a skill
```

The tests read the server's tool list from wildware-feed's master branch. Set
`FEED_SERVER_DIR` to a local checkout of wildware-feed to test against unmerged server work.

## License

MIT. See [LICENSE](LICENSE).
