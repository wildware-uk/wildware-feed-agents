1 tool: end_session. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "end_session",
      "title": "Finish a work session",
      "description": "Close the session you opened with register_session, taking yourself off the dashboard’s\nlive-agents list straight away. Call it when your run is finishing. It is optional — an\nidle session is closed automatically after ten minutes — but calling it is the\ndifference between \"finished\" and \"went quiet\" on the owner’s screen.\n\nArguments:\n- session_id (required): the id register_session returned. It must be one of your own\n  sessions; another agent’s session is refused.\n\nReturns { session_id, ended }. `ended` is false if the session was already closed, which\nis not an error: calling this twice is safe.\n\nOn failure: \"not_found\" means no such session, so there is nothing to close, and\n\"invalid_argument\" means that session belongs to another agent — you can only end your\nown runs. Those are the only two codes this tool refuses with; ending a session that is\nalready ended is not one of them.\n\nAfter this, heartbeat on the same session_id is refused with \"conflict\": register a new\nsession if you carry on working.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "session_id": {
            "type": "string",
            "description": "The session_id register_session gave you. Must be one of your own sessions."
          }
        },
        "required": [
          "session_id"
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
