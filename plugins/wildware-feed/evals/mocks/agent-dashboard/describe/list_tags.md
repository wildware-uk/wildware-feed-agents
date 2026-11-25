1 tool: list_tags. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_tags",
      "title": "List a channel’s tags",
      "description": "The words a channel uses to label its cards — \"bug\", \"feature\", \"high priority\",\nwhatever this channel decided. Read this before tagging something, so you use the word\nthat is already there rather than inventing a second one that means the same thing.\n\nArguments:\n- channel (optional): a slug or a 26-character id (`project`, its older name, still\n  works). Omit for every channel.\n\nReturns { tags: [{ id, project_id, name, colour, agent_id, created_at }], count }.\n`agent_id` is who defined it, or null for your owner. An empty list is a normal\nanswer: the channel has not decided any words yet, and tag_card can define the first.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "channel": {
            "description": "Which channel`s words: its slug or its 26-character id. Omit for every channel.",
            "type": "string"
          }
        }
      },
      "annotations": {
        "readOnlyHint": true,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
