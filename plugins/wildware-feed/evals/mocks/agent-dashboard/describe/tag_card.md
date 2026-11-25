1 tool: tag_card. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "tag_card",
      "title": "Put one of the channel’s words on a card",
      "description": "Label a card with one of the channel`s tags — \"bug\", \"feature\", \"needs design\",\nwhatever this channel uses. Your owner sees it on the card and can filter by it.\n\nArguments (name exactly one card):\n- update_id: an update, from post_update.\n- message_id: a post or a reply, from get_messages or a channel event.\n- request_id: a question you raised with request_input.\n- tag (required): the word, or an id from list_tags.\n- on (optional): true to put it on, false to take it off. Omit to toggle.\n- create (optional): define the word for this channel if it is not defined yet.\n\nCall list_tags first. A channel with \"bug\" does not need \"bugs\" as well, and the\npoint of a shared vocabulary is that the same thing has one name.\n\nA card may carry at most 8 tags — a card wearing a dozen labels says\nnothing. A tag belongs to a channel, so a card can only ever wear its own channel`s\nwords.\n\nReturns { card: { kind, id }, tag: { id, name, colour }, on }.\n\nOn failure: \"not_found\" means no such card, or a word this channel has not defined\n(pass create: true, or check list_tags). \"invalid_argument\" means you named no card or\nmore than one, a word belonging to another channel, or a card that is already full.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "description": "The update to label, from post_update.",
            "type": "string"
          },
          "message_id": {
            "description": "A post or a reply to label instead, from get_messages or a channel event.",
            "type": "string"
          },
          "request_id": {
            "description": "A question of yours to label instead.",
            "type": "string"
          },
          "tag": {
            "type": "string",
            "description": "The word, e.g. \"bug\", or a tag id from list_tags. Matched case-insensitively, so \"Bug\" and \"bug\" are the same tag."
          },
          "on": {
            "description": "true to put it on, false to take it off. Omit to toggle it.",
            "type": "boolean"
          },
          "create": {
            "description": "Define the word for this channel if it does not have it yet. Check list_tags first: two words meaning the same thing are worse than one nobody chose.",
            "type": "boolean"
          }
        },
        "required": [
          "tag"
        ]
      },
      "annotations": {
        "idempotentHint": true,
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
