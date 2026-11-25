1 tool: edit_request. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "edit_request",
      "title": "Correct a question you are waiting on",
      "description": "Rewrite a request_input prompt that is still waiting for an answer. Use it when the\nquestion was wrong or has moved on while you waited: a draft with a mistake in it, an\noption that turned out not to be available, an explanation that missed something your\nowner needs in order to decide.\n\nArguments:\n- request_id (required): the id request_input gave you. Yours only.\n- question (optional): the replacement question, at most 500\n  characters.\n- detail (optional): the replacement explanation, at most 4000\n  characters, or null to remove it.\n- options (optional): the replacement options, for buttons, choice, multi_choice and a\n  form`s action buttons. Replaces the whole list.\n- default (optional): the replacement pre-filled value — for a form, the draft sitting\n  in the field. Null clears it.\n- refs (optional): the cards it shows from now on, each { kind, id }, at most 8, as on\n  request_input. It replaces the list; [] takes them all off.\n\nAt least one of them must be given. The kind cannot change: it decides which control\nyour owner is looking at. If that is what is wrong, withdraw_request and ask again.\n\nNothing is settled by an edit: the answer still arrives as a channel answer event on the\nsame request_id. The card stays where it is and is marked as edited, because\nan owner half way through deciding has to be able to see that the question moved.\n\nOne thing to weigh: your owner may already be typing into that field. Editing the\ndefault replaces what is on their screen only if they have not touched it — but a\nquestion that changes under somebody mid-answer is disorienting, so if they have\nstarted, prefer to say what changed in a reply on the question (post_message with its\nrequest_id) and leave the prompt alone.\n\nReturns { request: { id, kind, question, detail, options, project_id, update_id,\nmessage_id, expires_at } }.\n\nOn failure: \"not_found\" means no request has that id; \"invalid_argument\" means it is not\nyours, that you passed values this kind does not take, or that you changed nothing;\n\"conflict\" means it has already ended — answered, dismissed, withdrawn or timed out.\nA conflict is worth reading rather than retrying: if they answered while you were\nediting, that answer stands: it arrives as an answer event, and get_messages({ request_id })\nshows it.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "request_id": {
            "type": "string",
            "description": "The request_id request_input gave you. It must be one of your own requests."
          },
          "question": {
            "description": "The replacement question, at most 500 characters. Omit to leave it.",
            "type": "string",
            "maxLength": 500
          },
          "detail": {
            "description": "The replacement explanation under the question, at most 4000 characters. Omit to leave it; pass null to remove it.",
            "anyOf": [
              {
                "type": "string",
                "maxLength": 4000
              },
              {
                "type": "null"
              }
            ]
          },
          "options": {
            "description": "The replacement options, for the kinds that have them — buttons, choice, multi_choice and a form`s action buttons. Omit to leave them. They replace the whole list, and a kind with no options refuses them.",
            "type": "array",
            "items": {
              "type": "string",
              "maxLength": 200
            }
          },
          "default": {
            "description": "The replacement pre-filled value: for a form, the draft in the field — this is the one to use when you have spotted a mistake in what you drafted. Omit to leave it; pass null to clear it.",
            "anyOf": [
              {
                "type": "string",
                "maxLength": 10000
              },
              {
                "type": "null"
              }
            ]
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
          "request_id"
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
