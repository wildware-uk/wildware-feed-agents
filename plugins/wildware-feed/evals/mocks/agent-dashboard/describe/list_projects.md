1 tool: list_projects. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_projects",
      "title": "List channels",
      "description": "List the dashboard's channels (they used to be called projects), pinned first and then\nnewest. Call this to find the slug to post an update into. Your owner groups channels\ninto projects; each channel says which one it is in.\n\nArguments:\n- status (optional): \"active\" or \"archived\". Omit to get both.\n\nReturns { projects: [{ id, slug, name, description, status, pinned, created_at,\nupdated_at, group }], count, groups: [{ id, slug, name, status, channels }] }.\n`projects` are the channels. `group` is the project the channel is in ({ id, slug, name },\nor null), and `groups` lists the projects with the slugs of their channels. An empty list is a normal answer, not an error: use\ncreate_project first.\n\nOnly channels you have access to are listed: your owner can make a channel or project\nprivate, or keep you out of one.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "status": {
            "description": "Filter by lifecycle state. Omit to get both active and archived channels.",
            "type": "string",
            "enum": [
              "active",
              "archived"
            ]
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
