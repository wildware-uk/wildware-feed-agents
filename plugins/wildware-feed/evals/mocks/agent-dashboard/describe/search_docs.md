1 tool: search_docs. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "search_docs",
      "title": "Search docs",
      "description": "Find docs whose title or text contains some words (any case), in one channel or in every\nchannel you can read. Title matches come first, then the newest. Search before you write a\ndoc, and when someone asks about something the team may have written down.\n\nArguments:\n- query (required): the words to find, as they appear.\n- channel (optional): one channel's slug or id. Omit for every channel you can read.\n- limit (optional): at most this many, 1 to 100 (default 20).\n\nReturns { docs: [{ id, channel, title, version, size, updated_at, updated_by, snippet }] }.\nsnippet is a little of the text around the first match. read_doc gives the whole doc.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "query": {
            "description": "The words to find in a title or text, any case.",
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "channel": {
            "description": "Only this channel: its slug or id. Omit for every channel you can read.",
            "type": "string"
          },
          "limit": {
            "description": "At most this many results, 1 to 100. Default 20.",
            "type": "integer",
            "minimum": 1,
            "maximum": 100
          }
        },
        "required": [
          "query"
        ]
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
