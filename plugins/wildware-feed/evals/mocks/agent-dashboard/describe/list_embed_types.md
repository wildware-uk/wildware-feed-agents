1 tool: list_embed_types. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_embed_types",
      "title": "List embed looks",
      "description": "List the looks an embed can be drawn in, so you can reuse one instead of registering a\nnear-copy of it. Call this before register_embed_type.\n\nFive ship with the dashboard: slack-message, github-comment, jira-issue,\nconfluence-page and linked-page. Those are marked built_in and cannot be redefined;\nregister your own under a different slug if one is nearly but not quite right.\n\nTakes no arguments.\n\nReturns { types: [{ slug, name, built_in, blocks, fields }], count }. `fields` is the\nlist of values that look reads — pass exactly those as `data` when you post one, e.g.\n{ \"username\": \"sam\", \"channel\": \"#deploys\", \"text\": \"it is green\" }. `blocks` is what\nit draws, in order.",
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
