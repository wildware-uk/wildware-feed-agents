1 tool: edit_doc. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "edit_doc",
      "title": "Edit a doc",
      "description": "Change a doc, based on the version you read. Every save keeps the one before it, so people\ncan see who changed what and put an old version back.\n\nArguments (name one doc):\n- doc_id: from list_docs, search_docs or create_doc.\n- or title and channel: the doc with that title in that channel (any case).\n- base_version (required): the version you read with read_doc (or got back from your last\n  edit). If someone saved after it, nothing is saved and you get \"conflict\": read_doc again,\n  make your change to the new text, and try again with the new version.\n- edits: find-and-replace changes, applied in order: [{ old_str, new_str }]. Each old_str must\n  be found exactly once in the text, as the edits before it left it; copy it exactly,\n  spaces and line breaks too, with enough around it to be unique. If any edit doesn't fit,\n  none is made. new_str \"\" deletes old_str. Prefer edits: they leave other people's changes\n  alone and cost little.\n- or body: the whole new text, replacing all of it. Use it for a rewrite, or a doc that is\n  short.\n- new_title (optional): rename the doc. Links to the old title stop finding it.\n\nReturns { doc: { id, channel, title, version, size, updated_at, updated_by } }. Use the new\nversion as base_version for your next edit.\n\nOn failure: \"conflict\" means the doc changed since base_version (or new_title is another\ndoc's). \"invalid_argument\" means an old_str found never or more than once, both edits and\nbody, or text over 1 MB; nothing was saved. \"forbidden\" means you may only read this\nchannel. \"not_found\" means no such doc.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "doc_id": {
            "description": "The doc's id, from list_docs, search_docs or create_doc.",
            "type": "string"
          },
          "title": {
            "description": "Or name the doc by its title (any case), with its channel, instead of doc_id.",
            "type": "string"
          },
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "channel": {
            "description": "The doc's channel, when you name it by title.",
            "type": "string"
          },
          "base_version": {
            "description": "The version your change is based on: the one read_doc gave you, or your last edit returned.",
            "type": "integer",
            "minimum": 1
          },
          "edits": {
            "description": "Find-and-replace edits, in order, all or none. Each old_str must be found exactly once.",
            "type": "array",
            "minItems": 1,
            "maxItems": 50,
            "items": {
              "type": "object",
              "properties": {
                "old_str": {
                  "description": "Text in the doc to change, copied exactly; found exactly once.",
                  "type": "string",
                  "minLength": 1
                },
                "new_str": {
                  "description": "What to put in its place; \"\" deletes it.",
                  "type": "string"
                }
              },
              "required": [
                "old_str",
                "new_str"
              ]
            }
          },
          "body": {
            "description": "Or the whole new text, replacing all of it. At most 1 MB.",
            "type": "string"
          },
          "new_title": {
            "description": "A new title for the doc, if you are renaming it.",
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          }
        },
        "required": [
          "base_version"
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
