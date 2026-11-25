1 tool: heartbeat. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "heartbeat",
      "title": "Report that you are still working",
      "description": "Tell the dashboard you are still alive, and find out whether anything is waiting for\nyou. Call this on the interval register_session returned. Presence is derived from your\nlast heartbeat alone, so an agent that stops beating is shown as offline shortly\nafterwards, and a session left idle for ten minutes is closed.\n\nArguments:\n- session_id (required): the id register_session returned. It must be one of your own\n  sessions; another agent’s session is refused.\n\nReturns { ok, unread_messages, open_tasks, pending_approvals }. The three counts are\npiggybacked so you never have to poll for work: while they are zero there is nothing\nfor you, and when one is not, call the tool for that kind of work.\n\nopen_tasks is your own todo and claimed tasks, plus any work the owner has broadcast to\na channel you follow — offered to the channel's agents rather than assigned to one of\nthem. So a rise you were not expecting may be a task nobody holds: list_tasks marks\nthose `broadcast: true`, and whoever claims first gets it.\n\nOn failure there are three codes, and each has a different answer. \"not_found\" means no\nsuch session: call register_session and use the id it returns. \"invalid_argument\" means\nthat session belongs to another agent, so you sent an id that is not yours — beat on your\nown. \"conflict\" means your session has ended (you ended it, or it was idle too long), so\nregister a new one and use its id from then on. Any other failure is a bug in the\ndashboard rather than in your call.",
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
