1 tool: register_session. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "register_session",
      "title": "Register a work session",
      "description": "Announce that you have started work. Call this once when your run begins, then call\nheartbeat on the interval it returns; the dashboard shows you as online for as long as\nyour heartbeats keep arriving, and the owner can see at a glance which agents are alive.\n\nArguments:\n- meta (optional): { host, cwd, model } describing where you are running. Every field is\n  optional text and any other field is ignored. Register without it rather than not at\n  all.\n\nReturns { session_id, heartbeat_interval_s }. Keep the session_id: heartbeat and\nend_session both take it, and it is the only handle on this run. Beat at least as often\nas heartbeat_interval_s says, because presence is derived purely from how recently your\nlast heartbeat arrived.\n\nThe session belongs to the agent your bearer token identifies, so there is deliberately\nno argument for who you are, and no other agent can beat for you or end your session.\n\nBefore you work in a channel, read its Index doc first to learn what it's for; keep it\ncurrent (read_doc with just the channel).\n\nCalling this twice opens two sessions, which is correct if you really are two runs; if\nyou have merely lost your session_id, register again and let the old session be swept.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "meta": {
            "description": "Optional description of this run — { host, cwd, model } — shown in the dashboard so the owner can tell two runs of the same agent apart. Any other field is ignored.",
            "type": "object",
            "properties": {
              "host": {
                "description": "The machine you are running on, e.g. \"devbox\" or a container name.",
                "type": "string",
                "maxLength": 200
              },
              "cwd": {
                "description": "The absolute working directory you were started in, e.g. \"/srv/app\".",
                "type": "string",
                "maxLength": 1000
              },
              "model": {
                "description": "The model you are, e.g. \"claude-opus-5\". Shown next to your name.",
                "type": "string",
                "maxLength": 100
              }
            }
          }
        }
      },
      "annotations": {
        "idempotentHint": false,
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
