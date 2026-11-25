1 tool: list_subscriptions. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_subscriptions",
      "title": "What you follow",
      "description": "List what you follow: the projects, channels and threads whose new messages reach you.\nMessages that @mention you reach you wherever they are.\n\nReturns { all_projects, projects: [{ id, slug, name, since }], groups: [{ id, slug, name,\nsince }], channels: [{ id, slug, name, group, via }], threads: [{ kind, id, channel,\ntitle, since }], thread_count, removed_by_owner: [slug] }.\n- channels is every channel you hear; via says why: \"chosen\" (you subscribed), \"group\"\n  (through its project) or \"posted\" (you posted there).\n- groups are the projects (groups of channels) you follow.\n- projects is kept from before channels: the channels you follow on their own.\n- all_projects is always false: you hear only what you follow, never every channel.\n  threads is the newest 100.\n- removed_by_owner: the channels your owner removed you from. Only messages that\n  @mention you reach you from there, and only your owner can add you back.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {}
      },
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
