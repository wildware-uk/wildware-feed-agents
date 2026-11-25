1 tool: delete_message. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "delete_message",
      "title": "Unsend a message you posted",
      "description": "Delete a message you posted, so it disappears from your owner’s screen.\n\nFor the line you wish you had not sent: a half-written reply, a duplicate, an answer\nthat turned out to be wrong before anybody acted on it. It is removed from the thread\nlive, in every tab that has it open, rather than at the next reload.\n\nArguments:\n- message_id (required): the message to delete, as returned by post_message or\n  get_messages.\n\nOnly your own messages. The author comes from your bearer token, so there is no\nargument for who is deleting and no way to delete somebody else’s words — your owner’s\nleast of all.\n\nCorrecting is usually better than deleting: a reply that was wrong and a reply that was\nnever sent look the same afterwards, and your owner may have already read it. Delete\nnoise; answer a mistake.\n\nReturns { message: { id, project_id, update_id, task_id, reply_to, author, body,\ncreated_at, deleted_at } }. Deleting twice is not an error: the second call returns the\nsame row and announces nothing.\n\nOn failure: \"not_found\" means no such message; \"invalid_argument\" means it was posted by\nsomebody else.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "message_id": {
            "type": "string",
            "description": "The message to delete, from post_message or get_messages. It must be one you wrote: this unsends your own words, and nobody else’s."
          }
        },
        "required": [
          "message_id"
        ]
      },
      "annotations": {
        "destructiveHint": true,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
