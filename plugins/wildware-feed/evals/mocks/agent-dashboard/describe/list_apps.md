1 tool: list_apps. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_apps",
      "title": "List apps",
      "description": "List the interfaces registered on this dashboard, so you can show one that already\nexists rather than writing a near-copy of it. Call this before register_app.\n\nTakes no arguments.\n\nReturns { apps: [{ uri, name, description, url, bytes, csp, mine, updated_at }], count }.\n`url` is set for an app that frames a service's own page rather than a document this\ndashboard serves.\n`mine` is whether you registered it — an app that is not yours cannot be replaced, so\nregister your own under a different ui:// URI if one is nearly but not quite right.\nShow one with apps: [{ app: \"<uri>\", data: { ... } }] on post_update or post_message.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {}
      },
      "annotations": {
        "readOnlyHint": true,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
