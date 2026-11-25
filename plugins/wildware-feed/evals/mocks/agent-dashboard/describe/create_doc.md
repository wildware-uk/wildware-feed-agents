1 tool: create_doc. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "create_doc",
      "title": "Create a doc",
      "description": "Start a new doc in a channel, at version 1. People see it in the channel's Docs tab at once.\n\nArguments:\n- channel (required): a slug or a 26-character id (`project`, its older name, still works).\n- title (required): unique in the channel, whatever the case; at most 200 characters, on one\n  line, without [ ] or |.\n- body (optional): the markdown text, at most 1 MB. Link other docs with [[Doc name]] or\n  [[Doc name|shown text]]; a link to a doc nobody has written yet is fine.\n\nLook first (list_docs or search_docs): if a doc on this already exists, edit that one.\n\nReturns { doc: { id, channel, title, version, size, updated_at, updated_by } }.\n\nOn failure: \"conflict\" means a doc with that title is already in the channel (the message\ngives its id: edit it instead). \"forbidden\" means you may only read this channel.\n\"not_found\" means no such channel. \"invalid_argument\" means a bad title, text over 1 MB,\nor a channel that already holds 1000 docs.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "channel": {
            "description": "The channel: its slug or its 26-character id.",
            "type": "string"
          },
          "title": {
            "description": "The doc's title: unique in the channel (any case), one line, at most 200 characters, no [ ] or |.",
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "body": {
            "description": "The markdown text, at most 1 MB. Link other docs with [[Doc name]].",
            "type": "string"
          }
        },
        "required": [
          "title"
        ]
      },
      "annotations": {
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
