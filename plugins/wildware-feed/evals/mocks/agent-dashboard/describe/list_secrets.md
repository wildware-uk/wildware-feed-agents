1 tool: list_secrets. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_secrets",
      "title": "List the secrets you may use",
      "description": "The secrets your owner has shared with you: names, notes and sizes. Never values: a value\nonly ever leaves the dashboard through a secret_url, straight into a file.\n\nReturns { enabled, secrets: [{ name, note, bytes, updated_at, paused }] }. enabled false\nmeans this dashboard has no SECRETS_KEY set, so it holds no secrets yet. A paused secret\ncannot be fetched until your owner resumes it.\n\nTo give one to your owner, attach it to a post: post_message({ ..., secrets: [name] }).\n\nMissing one you need? If someone else saved it, call request_secret_access to ask to use\nit; if nobody has, call request_secret to ask your owner for it.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {}
      },
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
