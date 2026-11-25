1 tool: acknowledge. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "acknowledge",
      "title": "Say you have seen it",
      "description": "Tell your owner you have picked something up, or finished with it, without writing a\nreply. It appears on the message or task itself, live.\n\nThis is what stops a card going silent. The moment your owner types something they are\nlooking at a screen that cannot tell them whether you read it, so acknowledge it as\nsoon as you have it — before you start the work, not after.\n\nArguments:\n- state (required): \"read\", \"thinking\" or \"done\". \"read\" means you have seen it and is\n  the least you can say — say it the moment a message reaches you. \"thinking\" shows an\n  animated \"Agent is thinking…\" and means you are on it right now. \"done\" shows a tick\n  and means you have dealt with it. Each replaces the last, so read → thinking → done\n  is one acknowledgement changing three times.\n- message_id (optional): the message you are acknowledging, from get_messages or from a\n  channel event. A post your owner wrote straight into the feed is a message like any\n  other, so acknowledge it the same way — that is what puts \"… is thinking…\" under\n  their own words while you work out what they need.\n- update_id (optional): an update, another agent’s or your own.\n- request_id (optional): a question, from a channel event.\n\nName exactly one card.\n\nIMPORTANT: \"thinking\" is a claim about right now, and your owner only sees it while you\nare online — a session that dies mid-job stops animating rather than lying about being\nbusy. So finish with \"done\", and do not leave \"thinking\" behind as your last word on\nsomething you actually completed. If \"done\" feels like too big a claim about the work,\n\"read\" is still an honest last word; silence is not.\n\nIt is not a reply, and it is not a task state. Anything you want to *say* goes in\npost_message; finishing the work itself is still complete_task. A \"done\" here means\n\"I have dealt with what you asked me\", which is often true while the task goes on.\n\nSafe to send more than once: there is one acknowledgement per agent per thing, so\nre-asserting \"thinking\" after a reconnect leaves no trail and changes nothing.\n\nReturns { ack: { id, card_kind, card_id, message_id, state, created_at, updated_at } }.\n`created_at` is when you first acknowledged the thing and `updated_at` when you last\nchanged what you were saying, so your owner can see \"seen instantly, finished twenty\nminutes later\".\n\nOn failure: \"invalid_argument\" means you named no card or more than one, or a state\nthat is not one of the three. \"not_found\" means the card does not exist — a deleted\nmessage cannot be acknowledged.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "state": {
            "type": "string",
            "enum": [
              "thinking",
              "read",
              "done"
            ],
            "description": "What you are telling your owner: \"read\" when you have seen it, which shows as \"has read this\"; \"thinking\" while you are working on it, which shows as a live \"Agent is thinking…\"; \"done\" when you have dealt with it, which shows as a tick. Each one replaces the last, so \"read\" then \"thinking\" then \"done\" is one acknowledgement changing three times."
          },
          "message_id": {
            "description": "The message you are acknowledging — the message_id from get_messages or from a channel event. That includes your owner's own feed posts, which are messages with no update_id: acknowledging one is how they see you have read what they wrote. Name exactly one card.",
            "type": "string"
          },
          "update_id": {
            "description": "An update you are acknowledging instead — another agent’s, or your own.",
            "type": "string"
          },
          "request_id": {
            "description": "A question you are acknowledging instead, from a channel event.",
            "type": "string"
          }
        },
        "required": [
          "state"
        ]
      },
      "annotations": {
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
