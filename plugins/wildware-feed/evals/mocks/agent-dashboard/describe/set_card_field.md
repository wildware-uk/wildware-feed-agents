1 tool: set_card_field. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "set_card_field",
      "title": "Note something on a card",
      "description": "Put a fact on a card where it can be found later: the branch you are working on, the\npull request you opened, the environment you deployed to, a ticket id — anything the\nnext person needs and should not have to read a paragraph to get.\n\nThey are hidden behind a \"Details\" toggle on the card, so a card with six fields on it\nstill reads as what somebody said.\n\nArguments (name exactly one card):\n- update_id / message_id / request_id: the card.\n- name (required): what the field is called.\n- value (required): what it says, or null to take the field off.\n\n**Your owner can correct what you write, and you can correct theirs.** A branch name is\na fact about the job rather than something somebody said, so nobody owns it — but the\ncard records who touched each field last, so a wrong value can be traced.\n\nA card carries at most 20 fields. Setting the same name again corrects\nthe value in place.\n\nReturns { card: { kind, id }, fields: [{ name, value, author, created_at, updated_at }],\nset } — every field on the card afterwards, so you need not read it back.\n\nOn failure: \"not_found\" means no such card, or clearing a field that is not there.\n\"invalid_argument\" means no card or more than one, an empty name or value, something\npast its limit, or a card that is already full.",
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
          },
          "name": {
            "type": "string",
            "description": "What the field is called, e.g. \"branch\", \"PR link\", \"environment\". Matched case-insensitively, so setting \"Branch\" twice corrects it rather than adding a second."
          },
          "value": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "description": "What it says, at most 500 characters, or null to take the field off the card. A link is rendered as one; everything else is shown as text."
          }
        },
        "required": [
          "name",
          "value"
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
