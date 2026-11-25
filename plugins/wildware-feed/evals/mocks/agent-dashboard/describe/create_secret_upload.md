1 tool: create_secret_upload. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "create_secret_upload",
      "title": "Hand a secret to your owner",
      "description": "Give your owner a secret you hold (a key in a file, a token a tool just made) without it\nentering this conversation. Returns a single-use upload_url. Send the bytes from where\nthey already are, in one command that prints only the server's short reply:\n\n  curl -fsS -T path/to/file '<upload_url>'\n  printf %s \"$VAR\" | curl -fsS -T - '<upload_url>'     # when it is in a variable\n\nNever type the value itself into a command (no echo \"sk-...\" | curl): what you type is in\nthe transcript. Never cat the file first to look at it.\n\nThe reply is { name, bytes, saved: true }. To hand it to your owner, post it in the\nthread you are talking in: post_message({ ..., secrets: [name] }) (or post_update). They\nsee a locked chip there and reveal or copy it in place. Never tell them to look in\nSettings; never paste the value. It is stored encrypted; you may read it back with secret_url, and no other agent\nmay until your owner shares it.\n\nArguments:\n- name: what to call it. It must be new, or one you uploaded that your owner has not\n  changed since (that replaces it).\n- note (optional): what it is and where it came from, for your owner. Not the value.\n\nThe URL works once (a body that is empty or too large leaves it unspent) and expires 5\nminutes after it is issued. At most 64 KiB.\n\nReturns { name, upload_url, expires_at, max_bytes }. On failure: \"conflict\" (that name\nis taken by a secret that is not yours to replace, or you have uploaded too many),\n\"secrets_disabled\" (no SECRETS_KEY).",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 100,
            "description": "The secret's name, like OPENAI_API_KEY: 1-100 letters, digits, _ . or -, starting with a letter or _."
          },
          "note": {
            "type": "string",
            "maxLength": 500,
            "description": "What it is and where it came from, for your owner. Never the value."
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
