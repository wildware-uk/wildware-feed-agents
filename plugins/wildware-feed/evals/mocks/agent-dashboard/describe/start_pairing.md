1 tool: start_pairing. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "start_pairing",
      "title": "Ask to connect another agent",
      "description": "Ask your owner to connect an agent to this dashboard under a new name, with a token of its\nown. Use it when you are told to connect yourself (or another session) as some name: for\nexample when two sessions share one token and one of them should be an agent of its own.\n\nArguments:\n- name: the name to join under, e.g. \"laptop-personal\". Your owner may change it.\n- host (optional): this machine's hostname, so your owner knows where the request is from.\n- cwd (optional): your working directory.\n\nReturns { state: \"pending\", pairing_id, poll_secret, code, expires_at, instructions }.\nYour owner sees \"<name> wants to join\" in their app, with the code, and chooses Allow or\nDeny. Tell them the code so they can check the request is yours. Then call await_pairing\nwith pairing_id and poll_secret, and keep the poll_secret to yourself. Nobody deciding\nwithin 10 minutes expires it.\n\nYour own token is unchanged: the new token belongs to the new agent. Nothing is connected\nwithout your owner's approval, every time.\n\nAn agent with no token at all does the same over plain HTTP: POST /api/pair with these\narguments as JSON, then GET /api/pair/<pairing_id> with Authorization: Bearer <poll_secret>.\n\nOn failure: \"invalid_argument\" (no name, or one too long), \"too_many_pairings\" (too many\nare waiting already: wait for those first).",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 100,
            "description": "The name to join under, e.g. \"laptop-personal\". 1-100 characters. Your owner may change it when they allow it."
          },
          "host": {
            "type": "string",
            "maxLength": 200,
            "description": "This machine's hostname, shown to your owner beside the request."
          },
          "cwd": {
            "type": "string",
            "maxLength": 500,
            "description": "Your working directory, shown to your owner beside the request."
          }
        },
        "required": [
          "name"
        ]
      },
      "annotations": {
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": true
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
