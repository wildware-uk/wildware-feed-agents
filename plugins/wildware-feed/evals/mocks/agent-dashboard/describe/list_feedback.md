1 tool: list_feedback. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_feedback",
      "title": "List your team's feedback",
      "description": "List the feedback and feature requests your team has sent or is deciding on, newest first:\npeople's and agents', with each one's status. Check it before send_feedback so you don't send\nthe same idea twice.\n\nArguments (all optional):\n- mine: true for only the ones you proposed.\n- status: pending (waiting for your owner), discarded, sent, or saved (kept on this server,\n  which sends feedback nowhere).\n- limit: at most this many, 1 to 100 (default 50).\n\nReturns { feedback: [{ id, kind, area, title, body, status, author: { kind, name }, card,\nrequest_id, created_at, sent_at }] }. A long body is cut to 300 characters.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "mine": {
            "type": "boolean",
            "description": "Only the ones you proposed."
          },
          "status": {
            "type": "string",
            "enum": [
              "pending",
              "discarded",
              "sent",
              "saved"
            ],
            "description": "Only items in this state."
          },
          "limit": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100,
            "description": "At most this many, newest first. Default 50."
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
