1 tool: get_blocks. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "get_blocks",
      "title": "Read a card's blocks",
      "description": "Read the blocks on a card as they are now: which lines are ticked and by whom, each stage's\nstate, a poll's votes and who cast them. Use it before acting on a checklist or a poll, or\nwhen a channel event said your owner ticked or voted and you want the whole picture.\n\nArguments (name exactly one card):\n- update_id, message_id or request_id: the card.\n- block_id (optional): just this block.\n\nReturns { blocks: [{ id, type, title, ..., rev, updated_at }] }. A checklist line that is\nticked has done_by { kind: \"person\" | \"agent\", id, name } and done_at. A poll's options\neach have votes and voters, and closed says whether it still takes votes.\n\nOn failure: \"not_found\" means no such card, or no block with that id.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "description": "The update the block is on, from post_update. Name exactly one card.",
            "type": "string"
          },
          "message_id": {
            "description": "The message the block is on instead, from post_message.",
            "type": "string"
          },
          "request_id": {
            "description": "The question the block is on instead, from request_input.",
            "type": "string"
          },
          "block_id": {
            "type": "string",
            "description": "Just this block, by its id. Leave it out for all of them."
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
