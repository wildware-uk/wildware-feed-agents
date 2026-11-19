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

## What's here

| Folder | What it is |
| --- | --- |
| [plugins/wildware-feed](plugins/wildware-feed) | The Claude Code plugin: the MCP server entry, skills, hooks, pairing and the reply channel. |
| [plugins/bridge](plugins/bridge) | Source and tests for the plugin's two bundled scripts. |

## Working on it

```sh
cd plugins/bridge
npm ci
npm test        # the plugin, the skills against the server's tools, the built scripts
```

The tests read the server's tool list from wildware-feed's master branch. Set
`FEED_SERVER_DIR` to a local checkout of wildware-feed to test against unmerged server work.

## License

MIT. See [LICENSE](LICENSE).
