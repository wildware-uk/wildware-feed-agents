---
type: tool_order
before:
  tool: mcp__plugin_wildware-feed_agent-dashboard__acknowledge
  input_match: '"state":"thinking"'
after:
  tool: mcp__plugin_wildware-feed_agent-dashboard__post_message
---
