1 tool: request_secret_access. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "request_secret_access",
      "title": "Ask to use a secret someone else saved",
      "description": "Ask your owner to let you use a secret that already exists but is not shared with you:\none another agent saved, or one your owner keeps for other agents. They see a card in the\nthread, \"<you> asks to use secret <NAME>: <reason>\", with the secret's note, who saved it,\nand Allow and Deny buttons. The value is never on the card and never comes back here.\n\nAllow shares the secret with you, as sharing it in Settings would; then fetch it with\nsecret_url, straight into a file. Only a person (an owner or an admin) can allow it.\n\nUse request_secret instead for a secret nobody has saved yet.\n\nPass message_id (or update_id, or request_id) to ask inside the thread you are talking in, where your\nowner is already reading. With none of them the card goes in channel.\n\nArguments:\n- name: the secret's name, exactly as it was saved, like TURNSTILE_SECRET.\n- reason: why you need it, in one line your owner can judge at a glance. Never a value.\n- channel (or project, its older name), update_id, message_id, request_id, timeout_s: where\n  to ask and how long it stays answerable.\n\nIt waits like request_input: it answers within about a minute either way. On { state:\n\"pending\" } call await_request with the request_id, and keep calling it while the state\nis \"pending\". On \"answered\", response.value is true when they allowed it and false when\nthey denied it. Denied, \"timeout\" or \"cancelled\" means you may not use it: do not try to\nget it another way.\n\nIf you can already use it, it answers { state: \"already_shared\", name } and makes no card.\n\nOn failure: \"not_found\" (no secret of that name: ask for it with request_secret, or no such\nchannel or thread), \"secrets_disabled\" (no SECRETS_KEY).",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 100,
            "description": "The secret's name, like TURNSTILE_SECRET: 1-100 letters, digits, _ . or -, starting with a letter or _."
          },
          "reason": {
            "type": "string",
            "maxLength": 300,
            "description": "Why you need it, in one line. Up to 300 characters. Never put a secret here."
          },
          "channel": {
            "description": "A channel slug or id, for a card that belongs to no thread.",
            "type": "string"
          },
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "update_id": {
            "description": "The update whose thread to ask in. Supplies the channel.",
            "type": "string"
          },
          "message_id": {
            "description": "The thread to ask in: a message_id from get_messages or post_message. The card shows inside that conversation. Supplies the channel.",
            "type": "string"
          },
          "request_id": {
            "description": "A question of yours whose thread to ask in: the card goes where that question is.",
            "type": "string"
          },
          "timeout_s": {
            "description": "How long the request stays answerable, in seconds. Defaults to 3600 (one hour); between 5 and 86400.",
            "type": "integer",
            "minimum": -9007199254740991,
            "maximum": 9007199254740991
          }
        },
        "required": [
          "name",
          "reason"
        ]
      },
      "annotations": {
        "readOnlyHint": false,
        "destructiveHint": false,
        "openWorldHint": true
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
