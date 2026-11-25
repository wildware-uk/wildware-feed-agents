1 tool: assign_work. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "assign_work",
      "title": "Assign work to people or agents",
      "description": "Say who is doing a piece of work: assign a card to one or more people or agents on your team,\ntake someone off it, or set exactly who is on it. A card has at most five assignees.\n\nArguments (name exactly one card):\n- update_id: an update, from post_update or list_work.\n- message_id: a post, from get_messages, list_work or a channel event.\n- assignees (required): names or ids. A name is an agent's name or a person's name or\n  handle; \"me\" is you. `agent:<id>` or `member:<id>` names one exactly when two share a name.\n- mode (optional): \"add\" (the default) adds them, \"remove\" takes them off, \"set\" makes the\n  card's assignees exactly this list (an empty list with \"set\" unassigns everyone).\n\nAssigning a card that is not marked as work yet marks it \"todo\". Each assignee must be able to\nread the card's channel. A line in the card's thread says who assigned whom. An agent you\nassign is told there, wherever it is, and follows the thread from then on; a person is told\non their phone and in their app.\n\nAgents assign as people do. Assign when you delegate or hand over: a decision only Sam can\nmake goes to Sam; frontend work goes to the frontend agent. Say why in the thread, and\ndon't reassign back and forth. A to-do for a person that can wait is an assigned card,\nnot a request_input (post_update takes status and assignees in one call). When they\nmark it done, a line in its thread tells you.\n\nWhen you are assigned, take the work: set_status in_progress, say so in the thread, then\nfinish it or hand it back (assign_work with mode \"remove\" and \"me\", saying why).\n\nReturns { card: { kind, id }, assignees: [{ kind, id, name }], added, removed, status,\nline_id }. kind is \"agent\" or \"person\". line_id is the thread line, or null when nothing\nchanged.\n\nOn failure: \"not_found\" means no such card, or nobody on the team by that name.\n\"forbidden\" means you may only read this channel, or an assignee can't read it.\n\"invalid_argument\" means you named no card or more than one, a name that fits more than one\nperson or agent, or more than five assignees.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "description": "The update to assign, from post_update or list_work. Name exactly one card.",
            "type": "string"
          },
          "message_id": {
            "description": "A post to assign instead, from get_messages, list_work or a channel event.",
            "type": "string"
          },
          "assignees": {
            "description": "Who: agents' names, people's names or handles, \"me\", or agent:<id> / member:<id>. At most five on a card.",
            "type": "array",
            "items": {
              "type": "string"
            },
            "maxItems": 20
          },
          "mode": {
            "description": "\"add\" (default) adds them, \"remove\" takes them off, \"set\" makes the assignees exactly this list.",
            "type": "string",
            "enum": [
              "add",
              "remove",
              "set"
            ]
          }
        },
        "required": [
          "assignees"
        ]
      },
      "annotations": {
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
