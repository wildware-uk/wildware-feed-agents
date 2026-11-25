1 tool: request_secret. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "request_secret",
      "title": "Ask your owner for a secret and wait",
      "description": "Ask your owner for a secret you need (an API key, a password, a token). They type or\npaste it into a masked box in their app; it is stored encrypted under name, and you\nlearn only that it is ready. Then fetch it with secret_url.\n\nPass message_id (or update) to ask inside the thread you are talking in: the masked box\nshows right there, under that message, as well as at the top of their feed.\n\nAlways use this, never request_input or post_message, to ask for a secret: an answer\nthere would put the value in this conversation.\n\nArguments: question, and either name (one secret) or fields (several).\n- name: what it will be stored as, like STRIPE_TEST_KEY. It must be new, or one already\n  shared with you (then the answer replaces its value).\n- fields: when one job needs several secrets (a key and its secret, a username and its\n  password), ask for them all at once: up to 10, each { name, label?, hint?, multiline?,\n  optional? }. Your owner sees ONE card with a masked box for each and one Save all\n  button, and each value is stored as its own secret under its name, as name would be.\n  label is the words above a box, hint the line under it, multiline a box for several\n  lines (a private key), optional a box they may leave empty. Ask for related secrets\n  together like this, never one request after another.\n- question: what you need it for, in one line your owner can answer at a glance.\n- detail, channel (or project, its older name), update, message_id, timeout_s: as for\n  request_input.\n- priority (optional): \"low\", \"medium\" (default), \"high\" or \"critical\". \"critical\"\n  PAGES YOUR OWNER: their phone rings through silent mode and Do Not Disturb, even at\n  night. Use it only when your owner has explicitly told you to use critical, and only\n  when it is absolutely necessary. Never pick it on your own.\n\nLike request_input, it returns at once with { state: \"pending\", request_id }. Don't wait:\ncarry on, and the outcome arrives as a channel answer event on that request_id\n(get_messages({ request_id }) reads it later). On \"answered\", response.value is the secret's NAME, never its value. With fields it\nis the list of names saved, and response.skipped lists the optional ones left empty.\nNothing is saved unless all of it is. A\n\"timeout\" or \"cancelled\" means you did not get it.\n\nOn failure: \"conflict\" (that name is taken by a secret not shared with you: pick\nanother), \"secrets_disabled\" (no SECRETS_KEY).",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 100,
            "description": "The secret's name, like OPENAI_API_KEY: 1-100 letters, digits, _ . or -, starting with a letter or _."
          },
          "question": {
            "type": "string",
            "description": "What you need it for, in one line. Up to 500 characters. Never put a secret here."
          },
          "detail": {
            "description": "The paragraph under the question: what you found, what you are about to do, why you stopped. Up to 4000 characters. Markdown is not rendered here.",
            "type": "string"
          },
          "channel": {
            "description": "A channel slug or id, so the prompt says what this is about.",
            "type": "string"
          },
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "update": {
            "description": "The id of the update this follows from, if you just posted one. Supplies the channel when you omit it.",
            "type": "string"
          },
          "message_id": {
            "description": "The thread to ask in: a message_id from get_messages or post_message. Your question appears inside that conversation, where your owner is already reading, instead of as a card of its own with none of the context beside it. Ask here whenever the question came out of something you were discussing. Supplies the channel and the card, so naming it is enough.",
            "type": "string"
          },
          "timeout_s": {
            "description": "How long the request stays answerable, in seconds. Defaults to 3600 (one hour); between 5 and 86400. After it passes the state becomes \"timeout\" and no answer can arrive.",
            "type": "integer",
            "minimum": -9007199254740991,
            "maximum": 9007199254740991
          },
          "priority": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high",
              "critical"
            ],
            "description": "How much this needs your owner NOW: \"low\", \"medium\" (the default), \"high\" or \"critical\". \"critical\" PAGES YOUR OWNER: their phone rings through silent mode and Do Not Disturb, even at night. Use it only when your owner has explicitly told you to use critical, and only when it is absolutely necessary. Never pick it on your own."
          },
          "fields": {
            "description": "Several secrets in one request, instead of name: up to 10, each { name, label?, hint?, multiline?, optional? }. Your owner fills them all in on one card and saves them together; each is stored as its own secret.",
            "type": "array",
            "minItems": 1,
            "maxItems": 10,
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string",
                  "maxLength": 100,
                  "description": "The secret's name, like AWS_SECRET_ACCESS_KEY: 1-100 letters, digits, _ . or -, starting with a letter or _. Each name once."
                },
                "label": {
                  "description": "The words above its box, like \"Secret access key\". Up to 100 characters. Never put a secret here.",
                  "type": "string"
                },
                "hint": {
                  "description": "One line under its box: where to find it, what it looks like. Up to 500 characters. Never put a secret here.",
                  "type": "string"
                },
                "multiline": {
                  "description": "A box for several lines, like a private key.",
                  "type": "boolean"
                },
                "optional": {
                  "description": "Your owner may leave it empty; then it is not saved, and response.skipped names it.",
                  "type": "boolean"
                }
              },
              "required": [
                "name"
              ]
            }
          }
        },
        "required": [
          "question"
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
