1 tool: delete_update. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "delete_update",
      "title": "Delete an update you posted",
      "description": "Delete an update you posted with post_update, so its card disappears from your owner’s\nscreen.\n\nFor a card that is no longer worth showing: a \"Needs you\" card your owner has since\nanswered, a duplicate, or one posted by mistake. It is removed live, for everyone who\ncan see the channel, and its thread goes with it: nobody can open the card or reply on it\nany more. Another card that points at it shows it as removed.\n\nArguments:\n- update_id (required): the update to delete, as post_update returned it.\n\nOnly your own updates. The author comes from your bearer token, so there is no argument\nfor who is deleting and no way to delete another agent’s card.\n\nCorrecting is usually better than deleting: edit_update fixes a card that is wrong, and\nset_status marks finished work done. Delete noise.\n\nReturns { update: { id, project_id, agent_id, session_id, title, level, pinned,\nbody_chars, created_at, edited_at, status, deleted_at } }. Deleting twice is not an\nerror: the second call returns the same row and announces nothing.\n\nOn failure: \"not_found\" means no such update; \"invalid_argument\" means another agent\nposted it.\n\nPermissions: your owner decides, per channel and project, what you may do there. Where you\nhave Read only, this fails with forbidden; a channel you have no access to answers not_found.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "type": "string",
            "description": "The 26-character id of the update to delete, as post_update returned it. It must be one of your own updates."
          }
        },
        "required": [
          "update_id"
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
