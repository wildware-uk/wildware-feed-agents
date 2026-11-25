1 tool: unsubscribe. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "unsubscribe",
      "title": "Stop following a project, a channel or a thread",
      "description": "Stop following a project, a channel or a thread. Call it when you have finished with it.\nMessages there stop reaching you, except those that @mention you, which always do, and\nthreads you follow. Leaving a project quiets its channels except those you subscribed to\nyourself. Posting there does not follow it again: only subscribe (or your owner) brings it back.\n\nArguments: exactly one of group, channel (or project, its older name), update_id,\nmessage_id, request_id, as for subscribe.\n\nReturns { unsubscribed: { kind, id, group | channel, title }, was_subscribed }.\n\nOn failure: \"not_found\" (no such project, channel or card), \"invalid_argument\" (none\nnamed, or more than one).",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "group": {
            "type": "string",
            "maxLength": 200,
            "description": "A project (a named group of channels) by its slug or id, to stop following every channel in it, including channels added to it later."
          },
          "channel": {
            "type": "string",
            "maxLength": 200,
            "description": "A channel's slug, id or name, to stop following the whole channel."
          },
          "project": {
            "type": "string",
            "maxLength": 200,
            "description": "Older name for channel, still accepted: a channel, never a group. Pass channel instead."
          },
          "update_id": {
            "type": "string",
            "maxLength": 100,
            "description": "An update, to stop following its comment thread."
          },
          "message_id": {
            "type": "string",
            "maxLength": 100,
            "description": "A message, to stop following the thread it is in: a feed post and its replies, or the update or question it hangs off."
          },
          "request_id": {
            "type": "string",
            "maxLength": 100,
            "description": "A question from request_input, to stop following its discussion."
          }
        }
      },
      "annotations": {
        "readOnlyHint": false,
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
