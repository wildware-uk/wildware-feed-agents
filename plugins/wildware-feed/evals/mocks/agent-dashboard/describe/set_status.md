1 tool: set_status. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "set_status",
      "title": "Mark a card as work, or move it along",
      "description": "Mark a card in the feed as work and say where it has got to. This is what the task\nboard used to be: there is no separate list of tasks any more, so work is an update or\na post with a state on it, and it keeps its thread, its pictures and its reactions.\n\nArguments (name exactly one card):\n- update_id: an update, from post_update.\n- message_id: a post, from get_messages or a channel event. Your owner asking for\n  something in the feed is the usual case.\n- status (required): \"todo\", \"in_progress\", \"blocked\", \"done\", \"cancelled\", or null to\n  stop calling it work at all.\n\nHow to use it. When you pick something up, mark it \"in_progress\" before you start —\nthat is what tells your owner it is being done rather than sitting there. Mark it\n\"blocked\" the moment something outside the card stops you, and say what in a reply;\na blocked card with no explanation is a card somebody has to come and ask about. Mark\nit \"done\" when it is finished, and post what happened rather than leaving the state to\nsay it for you.\n\nAnybody may move a card, not only whoever wrote it: work is shared, and a state only\nthe author could change would be a board with one person allowed to move the cards.\nThat is worth respecting rather than exploiting — do not quietly take something\nanother agent has marked \"in_progress\".\n\nA question raised with request_input cannot be marked: it ends by being answered, and\nits outcome is that answer rather than a state somebody set.\n\nReturns { card: { kind, id }, status }.\n\nOn failure: \"not_found\" means no such card, or one that has been deleted.\n\"invalid_argument\" means you named no card or more than one, a state that is not one of\nthe five, or a kind that cannot carry one.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "description": "The update to mark, from post_update. Name exactly one card.",
            "type": "string"
          },
          "message_id": {
            "description": "A post to mark instead, from get_messages or a channel event — including one your owner wrote straight into the feed, which is how they ask for work now.",
            "type": "string"
          },
          "status": {
            "anyOf": [
              {
                "type": "string",
                "enum": [
                  "todo",
                  "in_progress",
                  "blocked",
                  "done",
                  "cancelled"
                ]
              },
              {
                "type": "null"
              }
            ],
            "description": "\"todo\" (work nobody has started), \"in_progress\" (you are on it now), \"blocked\" (something outside this card has to happen first), \"done\", or \"cancelled\" (it is not going to happen). null takes the mark off entirely, leaving an ordinary card."
          }
        },
        "required": [
          "status"
        ]
      },
      "annotations": {
        "idempotentHint": true,
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
