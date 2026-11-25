1 tool: update_block. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "update_block",
      "title": "Change a block in place",
      "description": "Change one block on a card you posted, in place: tick a line, mark a stage failed, add log\nlines, add chart points, close a poll. The card stays where it is and nothing new is posted;\nyour owner sees the block change live. Use this instead of editing the card's text or posting\n\"step 3 done\" again.\n\nArguments (name exactly one card):\n- update_id, message_id or request_id: the card the block is on. Only your own cards.\n- block_id (required): the block's id, as you gave it.\n- patch (one of patch, block, remove): what to change. A plain value (title, progress,\n  kind, ...) is replaced, and null clears it. A list with ids (items, stages, series,\n  options) is merged by id: a given id changes only the fields you give, a new id is added\n  at the end, and remove: [ids] takes some away. append (log), append_rows (table) and a\n  series' points (chart) add to the end; a log keeps its newest 1000 lines and a series its\n  newest 500 points. The block is checked again whole afterwards.\n  Examples: { items: [{ id: \"3\", done: true }] }; { stages: [{ id: \"test\", state: \"failed\",\n  detail: \"2 failed\" }], progress: 0.6 }; { append: [\"line\", \"line\"] };\n  { series: [{ id: \"p95\", points: [[12, 340]] }] }; { closed: true }.\n- block (one of patch, block, remove): the whole block, as on post_update. It replaces the\n  block, or adds it when the card has none with that id (at most 8 on a card).\n- remove (one of patch, block, remove): true takes the block off the card.\n\nTwo changes at once never lose one another. A tick or vote by your owner is kept: the\nserver records who ticked a line and who voted, and you cannot write those yourself.\n\nReturns { block: { id, type, rev, updated_at } }, kept small so a long log costs you\nnothing per append; get_blocks reads the whole block. Removing returns { removed: true,\nblock_id }.\n\nOn failure: \"not_found\" means no such card, or no block with that id on it (give block\nto add one). \"invalid_argument\" means the card is not yours, the patch named something\nthat type does not have, or the block would break a limit; nothing is changed.",
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
            "description": "The block's id on that card, as you gave it."
          },
          "patch": {
            "description": "What to change: plain values replaced (null clears), lists with ids merged by id, remove: [ids], append / append_rows / a series' points added to the end.",
            "type": "object",
            "additionalProperties": {}
          },
          "block": {
            "description": "The whole block instead, { id, type, title?, ... } as on post_update: replaces it, or adds it when the card has no block with this id.",
            "type": "object",
            "additionalProperties": {}
          },
          "remove": {
            "description": "true takes the block off the card.",
            "type": "boolean"
          }
        },
        "required": [
          "block_id"
        ]
      },
      "annotations": {
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
