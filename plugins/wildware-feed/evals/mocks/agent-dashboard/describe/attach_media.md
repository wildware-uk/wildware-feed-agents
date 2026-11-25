1 tool: attach_media. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "attach_media",
      "title": "Attach media to an update",
      "description": "Attach already-uploaded media to an update you have already posted. Use this when the\nupload finished after the post — for a video, say — and post_update could not carry the\nids at the time.\n\nArguments:\n- update_id (required): the 26-character id post_update returned.\n- media_ids (required): one to 24 ids from create_upload whose bytes\n  you have already PUT to their upload_url.\n\nSafe to retry: attaching the same id twice is not an error. Ids you do not own, and ids\nalready attached to another update, are reported in skipped and change nothing.\n\nReturns { update_id, attached, skipped }. On failure: error \"not_found\" means the update\ndoes not exist or has been deleted, and \"invalid_argument\" means the list was empty, too\nlong, or contained something that is not an id.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "type": "string",
            "description": "The 26-character id of the update to attach to, as returned by post_update. The update must still exist and must not have been deleted."
          },
          "media_ids": {
            "minItems": 1,
            "maxItems": 24,
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Ids from create_upload whose bytes you have already PUT, at most 24. Ids that are not yours, or that are already on another update, come back as skipped rather than failing the call."
          }
        },
        "required": [
          "update_id",
          "media_ids"
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
