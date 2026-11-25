1 tool: await_pairing. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "await_pairing",
      "title": "Wait for your owner to allow a new agent",
      "description": "Wait for your owner to allow or deny a pairing started with start_pairing (or over HTTP).\n\nArguments: pairing_id and poll_secret, as start_pairing gave them.\n\nIt waits up to 25 seconds and returns one of:\n\n  { \"state\": \"pending\", \"pairing_id\", \"code\", \"expires_at\" }\n  { \"state\": \"approved\", \"agent\", \"token\", \"mcp_url\", \"authorization_header\",\n    \"claude_code_command\", \"instructions\" }\n  { \"state\": \"denied\" }   { \"state\": \"expired\" }   { \"state\": \"collected\" }\n\nKEEP CALLING IT WHILE state IS \"pending\". That loop is the wait.\n\nOn \"approved\" save the token at once. If that answer was lost, call again with the same\nsecret: it shows the same token until the token is first used, for up to 10 minutes after it\nwas collected, and never after. Save it straight into the MCP\nconfig of the agent it is for, as the header Authorization: Bearer <token> on its\nagent-dashboard server (in Claude Code, run claude_code_command from that agent's\ndirectory), then reconnect and call register_session. Never post the token anywhere.\n\n\"collected\" means the token was already handed over and used, or it is too late to show it\nagain. \"denied\" and \"expired\" are not\npermission: do not try to connect another way.\n\nOn failure: \"not_found\" (no such pairing, or the poll secret is wrong).",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "pairing_id": {
            "type": "string",
            "maxLength": 100,
            "description": "The pairing_id start_pairing gave you."
          },
          "poll_secret": {
            "type": "string",
            "maxLength": 100,
            "description": "The poll_secret start_pairing gave you."
          }
        },
        "required": [
          "pairing_id",
          "poll_secret"
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
