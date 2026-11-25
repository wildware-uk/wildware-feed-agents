1 tool: send_feedback. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "send_feedback",
      "title": "Propose feedback or a feature request",
      "description": "Propose feedback about the dashboard or this plugin, or a feature you need, for the people\nwho build it (it goes to their feedback inbox, Sentry). Your owner decides first: this puts a question on their dashboard showing your\ntext, which an owner or an admin can edit, send, or discard. Nothing leaves your team until\none of them sends it.\n\nUse it when something real got in your way while you worked here: a bug, a confusing tool,\nfriction, or a missing feature. Not for your owner's own project, and not to chat. One idea\nper call, concrete and short: what you tried, what happened, what would have helped. Call\nlist_feedback first and don't send one your team already has.\n\nNever put a secret, a token, a password or private customer data in it: text that looks like\na key is refused.\n\nArguments: kind, title and body are required.\n- kind: \"feedback\" (about something that exists) or \"feature_request\" (something missing).\n- area (optional): feed, threads, voice, secrets, apps, agents (agents and this plugin),\n  billing or other.\n- title: one line, at most 120 characters.\n- body: markdown, at most 5000 characters.\n- media_ids (optional): up to 6 uploads from create_upload, such as a screenshot.\n- update_id, message_id or request_id (optional): the card it is about. Pass one at most.\n- channel (optional): where the question to your owner shows.\n\nReturns { feedback: { id, status: \"pending\", ... }, request_id, state: \"pending\" }. You hear\nyour owner's choice as an answer event on request_id (get_messages({request_id}) reads it later):\nanswered with \"Send to ...\" (or \"Save it\", on a server that sends feedback nowhere) means it\nwent, maybe edited; \"Discard\", dismissed or timed out means it did not. list_feedback shows\nits status later.\n\nOn failure: \"invalid_argument\" for a bad kind, area or length, or text that looks like a\nsecret; \"conflict\" if you already sent one with this title today; \"rate_limited\" after 20 in\na day.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "enum": [
              "feedback",
              "feature_request"
            ],
            "description": "feedback: about something that exists. feature_request: something missing."
          },
          "area": {
            "type": "string",
            "enum": [
              "feed",
              "threads",
              "voice",
              "secrets",
              "apps",
              "agents",
              "billing",
              "other"
            ],
            "description": "What part it is about. agents covers agents and this plugin."
          },
          "title": {
            "type": "string",
            "maxLength": 120,
            "description": "One line saying what it is, at most 120 characters."
          },
          "body": {
            "type": "string",
            "maxLength": 5000,
            "description": "Markdown, at most 5000 characters: what you tried, what happened, what would have helped. No secrets."
          },
          "media_ids": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "maxItems": 6,
            "description": "Up to 6 uploads from create_upload, such as screenshots."
          },
          "update_id": {
            "type": "string",
            "description": "The update it is about, if any. Name at most one card."
          },
          "message_id": {
            "type": "string",
            "description": "The message it is about instead."
          },
          "request_id": {
            "type": "string",
            "description": "The question it is about instead."
          },
          "channel": {
            "type": "string",
            "description": "A channel slug or id: where the question to your owner shows."
          },
          "project": {
            "type": "string",
            "description": "Older name for channel, still accepted. Pass channel instead."
          }
        },
        "required": [
          "kind",
          "title",
          "body"
        ]
      },
      "annotations": {
        "readOnlyHint": false,
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
