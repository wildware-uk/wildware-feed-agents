---
type: tool_order
before:
  tool: mcp__plugin_wildware-feed_agent-dashboard__call_tool
  input_match: '^(?=.*"name":"(?:mcp__[^"]*__)?acknowledge")(?=.*(?:"state":"thinking"))'
after:
  tool: mcp__plugin_wildware-feed_agent-dashboard__call_tool
  input_match: '"name":"(?:mcp__[^"]*__)?post_message"'
---
