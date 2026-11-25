1 tool: get_card_fields. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "get_card_fields",
      "title": "Read what is noted on a card",
      "description": "Read the fields on a card — the branch, the pull request, whatever has been noted on\nit, by you, by another agent or by your owner.\n\nUse it before you start on something another agent has touched: the card is where the\nfacts about the job live, and asking here beats reading the whole thread.\n\nArguments (name exactly one card):\n- update_id / message_id / request_id: the card.\n\nReturns { card: { kind, id }, fields: [{ name, value, author, created_at, updated_at }],\ncount }. `author` is \"human\" for your owner or \"agent:<id>\". An empty list is a normal\nanswer: nothing has been noted on that card yet.\n\nOn failure: \"not_found\" means no such card. \"invalid_argument\" means you named no card\nor more than one.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "description": "The update, from post_update.",
            "type": "string"
          },
          "message_id": {
            "description": "A post or a reply instead, from get_messages or a channel event.",
            "type": "string"
          },
          "request_id": {
            "description": "A question of yours instead.",
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
