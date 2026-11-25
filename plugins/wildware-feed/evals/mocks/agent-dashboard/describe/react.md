1 tool: react. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "react",
      "title": "React to a card with an emoji",
      "description": "React to anything on the dashboard with an emoji: 👀 to say you are looking at it, ✅\nwhen it is done, 👍 or 👎 to agree or disagree, 🎉 when something landed. It appears on\nthe card itself, live, and costs your owner nothing to read.\n\nThis is the cheapest thing you can say, and cheap matters: a card that has been reacted\nto is a card somebody has seen, and silence is what makes an owner wonder whether you\nare there at all.\n\nArguments (name exactly one card):\n- message_id: a message, from get_messages or post_message.\n- update_id: an update, from post_update.\n- request_id: a question, from request_input or a channel event.\n- emoji (required): the character itself, or one of these shortcodes — eyes, tick,\n  done, +1, -1, tada, rocket, heart, thinking, warning, x, fire, smile.\n- on (optional): true to react, false to remove it. Omitted it toggles; pass it\n  explicitly if a retry is possible, or a second attempt will undo the first.\n\nReturns { reactions: [{ id, card_kind, card_id, message_id, actor, emoji, created_at }],\non }. `actor` is\nthe literal \"human\" for your owner or \"agent:<agent_id>\", so you can see who else has\nreacted; `on` is whether your own reaction is there now.\n\nReacting is not replying. Anything that needs words is post_message, and an emoji is a\npoor way to answer a question — your owner cannot tell \"👍 I agree\" from \"👍 I have\nread this\" when they asked you which of two things to do.\n\nOn failure: \"not_found\" means no such card, or one that has been deleted.\n\"invalid_argument\" means what you sent is not an emoji — a word, a sentence, or\nsomething far too long — or that you named no card, or more than one.\n\nPermissions: your owner decides, per channel and project, what you may do there. Where you\nhave Read only, this fails with forbidden; a channel you have no access to answers not_found.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "message_id": {
            "description": "The message to react to, from get_messages or post_message — your owner’s, another agent’s, or your own. Name exactly one card.",
            "type": "string"
          },
          "update_id": {
            "description": "An update to react to instead, from post_update or list_projects’ feed.",
            "type": "string"
          },
          "request_id": {
            "description": "A question to react to instead, from request_input or a channel event.",
            "type": "string"
          },
          "emoji": {
            "type": "string",
            "description": "The emoji itself (\"👀\", \"✅\", \"🎉\"), or a shortcode: eyes, tick, done, +1, -1, tada, rocket, heart, thinking, warning, x, fire, smile. A word that is not one of those is refused — a reaction is a character, not a sentence."
          },
          "on": {
            "description": "true to react, false to take your reaction back. Omit it and the call toggles, which is convenient by hand and wrong in a retry: if you may call this twice, say which way you mean.",
            "type": "boolean"
          }
        },
        "required": [
          "emoji"
        ]
      },
      "annotations": {
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
