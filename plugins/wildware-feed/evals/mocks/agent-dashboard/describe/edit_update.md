1 tool: edit_update. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "edit_update",
      "title": "Edit an update you posted",
      "description": "Correct an update you have already posted. Use it when what you said has stopped being\ntrue — a step you reported as running has finished, a number was wrong, a level was too\nalarming or not alarming enough.\n\nArguments:\n- update_id (required): the id post_update returned. Only your own updates.\n- body (optional): the replacement markdown, at most 100000 characters. It\n  replaces the body; it does not append to it.\n- title (optional): the replacement headline, at most 200 characters, or\n  null to remove it.\n- level (optional): \"info\", \"success\", \"warn\" or \"error\".\n- priority (optional): \"low\", \"medium\", \"high\" or \"critical\". Demote something that has\n  stopped mattering rather than leaving it shouting. Changing it to \"critical\" marks the\n  card critical but sends no page: only a new post_update or request_input pages your\n  owner. Even so, use critical only when your owner has explicitly told you to.\n- refs (optional): the cards it points at from now on, each { kind, id }, at most 8, as\n  on post_update. It replaces the list; [] takes them all off.\n\nAt least one of body, title, level, priority or refs must be given.\n\nThe card keeps its place in the timeline and is marked as edited, so the owner can see\nthat what they read earlier has changed. There is no revision history: the new text is\nthe only text. If the update is wrong in a way a correction cannot fix, post a new one\nrather than rewriting history the owner has already acted on.\n\nPrefer this over posting a near-duplicate card. Do not use it to keep one card as a\nrunning log — the timeline is a sequence of things that happened, and an owner who\nscrolled past your card will not see it change.\n\nReturns { update: { id, project_id, agent_id, session_id, title, level, pinned,\nbody_chars, created_at, edited_at } }.\n\nOn failure: \"not_found\" means there is no such update, or it has been deleted — a\ndeleted card cannot be edited back into existence. \"invalid_argument\" means the update\nbelongs to another agent, the body was empty or too long, or you passed no fields to\nchange. Nothing is written when either happens.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "type": "string",
            "description": "The 26-character id of the update to edit, as post_update returned it. It must be one of your own updates."
          },
          "body": {
            "description": "The replacement body, as markdown, at most 100000 characters. Omit to leave the body alone. This replaces the whole body rather than appending to it.",
            "type": "string",
            "maxLength": 100000
          },
          "title": {
            "description": "The replacement headline, at most 200 characters. Omit to leave it alone; pass null to remove the headline entirely.",
            "anyOf": [
              {
                "type": "string",
                "maxLength": 200
              },
              {
                "type": "null"
              }
            ]
          },
          "priority": {
            "description": "How much this needs your owner NOW: \"low\", \"medium\" (the default), \"high\" or \"critical\". A different question from level — level is what happened, priority is whether it can wait. A routine error from a flaky test is low; an info that a migration is about to run against production is high. Your owner filters notifications on this, per device, so \"high\" is what reaches a phone at 2am. Use it sparingly or it stops meaning anything. Changing it to \"critical\" marks the card critical but sends no page: only a new post_update or request_input pages your owner. Even so, use critical only when your owner has explicitly told you to.",
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high",
              "critical"
            ]
          },
          "level": {
            "description": "The corrected level: \"info\", \"success\", \"warn\" or \"error\". Omit to leave it alone. Use this when something you reported as in progress has finished, or has failed.",
            "type": "string",
            "enum": [
              "info",
              "success",
              "warn",
              "error"
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
          "update_id"
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
