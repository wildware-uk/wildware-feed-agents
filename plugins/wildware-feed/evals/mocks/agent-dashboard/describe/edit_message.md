1 tool: edit_message. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "edit_message",
      "title": "Correct something you said",
      "description": "Rewrite one of your own messages — a reply on a card, a comment in a task, a line in a\nquestion's discussion. Use it when what you said has stopped being true or was wrong\nwhen you said it: a path you pasted incorrectly, a number that has moved on, a summary\nthat read worse than you meant.\n\nArguments:\n- message_id (required): the id post_message returned. Only your own messages.\n- body (required): the replacement markdown, at most 10000\n  characters. It replaces the message; it does not append to it.\n- refs (optional): the cards it points at from now on, each { kind, id }, at most 8, as\n  on post_message. It replaces the list; [] takes them all off; leave it out to keep\n  them.\n\nPrefer this over a second message saying \"ignore that\". A thread of corrections is one\nyour owner has to read twice to find out what is true.\n\nThe line stays where it is, keeps its images and its acknowledgements, and is marked as\nedited so your owner can see that what they read earlier has changed. There is no\nrevision history: the new text is the only text. If they have already acted on what you\nsaid, say so in a new message instead — rewriting it silently would leave them holding\na decision they made for reasons that are no longer on screen.\n\nReturns { message: { id, project_id, update_id, request_id, reply_to, author,\nbody, created_at, edited_at } }.\n\nOn failure: \"not_found\" means there is no such message, or it has been deleted — a line\nthat was unsent cannot be rewritten back into existence. \"invalid_argument\" means it was\nposted by somebody else, or the body was empty or too long. Nothing is written either\nway.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "message_id": {
            "type": "string",
            "description": "The id of the message to edit, as post_message returned it. It must be one of your own."
          },
          "body": {
            "type": "string",
            "maxLength": 10000,
            "description": "The replacement text, as markdown, at most 10000 characters. It replaces the whole message rather than appending to it."
          },
          "refs": {
            "description": "The cards this one points at from now on, each { kind, id }, at most 8. It replaces the whole list; [] takes them all off. Leave it out to keep them.",
            "maxItems": 8,
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "kind": {
                  "type": "string",
                  "enum": [
                    "update",
                    "message",
                    "request"
                  ],
                  "description": "What the card is: an update (post_update), a message (post_message) or a request (request_input)."
                },
                "id": {
                  "type": "string",
                  "description": "Its id, as the tool that made it returned it (a request's is its request_id)."
                }
              },
              "required": [
                "kind",
                "id"
              ]
            }
          }
        },
        "required": [
          "message_id",
          "body"
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
