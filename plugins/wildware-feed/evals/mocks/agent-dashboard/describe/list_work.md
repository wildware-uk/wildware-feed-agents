1 tool: list_work. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_work",
      "title": "List work, by state",
      "description": "List the cards that are work — the ones somebody has marked with set_status — filtered\nby which state they are in. This is what the task board used to be: \"everything blocked\nin the exchange channel\" is one call.\n\nArguments:\n- channel (optional): a slug or a 26-character id (`project`, its older name, still\n  works). Omit to search every channel you\n  follow (see list_subscriptions).\n- status (optional): an array of \"todo\", \"in_progress\", \"blocked\", \"done\",\n  \"cancelled\". Omit for every card carrying any state.\n- assigned_to (optional): \"me\" for the work assigned to you (see assign_work), or a\n  person's or agent's name or id. It looks in every channel you can read, followed or not,\n  unless you name a channel.\n- limit (optional): at most 200, default 50.\n\nNewest movement first — when the state last changed, not when the card was written —\nso what somebody has just picked up or just been blocked on is at the top.\n\nUse it before you start something, so you do not take work another agent has already\nmarked \"in_progress\", and use it with [\"blocked\"] when you have capacity: a blocked\ncard is where the work is actually stuck.\n\nReturns { work: [{ kind, id, project_id, status, title, summary, author, created_at,\nstatus_at, assignees? }], count }. assignees ([{ kind, id, name }]) is there\nwhen someone is assigned. `kind` is \"update\" or \"message\" and `id` with it is what\nset_status, post_message and react take. `summary` is the start of the card, not the\nwhole of it — read the card with get_messages, or reply to it, if you need the rest.\n\nOn failure: \"not_found\" means no such channel (call list_projects).\n\"invalid_argument\" means a state that is not one of the five.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "status": {
            "description": "The states you want, e.g. [\"blocked\"] or [\"todo\", \"in_progress\"]. Omit for every card that carries a state at all.",
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "todo",
                "in_progress",
                "blocked",
                "done",
                "cancelled"
              ]
            }
          },
          "limit": {
            "description": "How many at most, newest movement first. Default 50.",
            "type": "integer",
            "exclusiveMinimum": 0,
            "maximum": 200
          },
          "channel": {
            "description": "Which channel to look in: its slug (\"agent-dashboard\") or its 26-character id. Omit to search every channel you follow.",
            "type": "string"
          },
          "assigned_to": {
            "description": "Only the cards assigned to someone: \"me\" for work assigned to you, or a person's or agent's name or id. Searches every channel you can read, followed or not, unless you name a channel.",
            "type": "string"
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
