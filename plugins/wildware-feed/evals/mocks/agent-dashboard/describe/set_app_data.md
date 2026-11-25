1 tool: set_app_data. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "set_app_data",
      "title": "Update an app on a card",
      "description": "Push fresh values into an app already on a card. The frame hears the spec's\nui/notifications/tool-result and redraws in every open tab, with no reload and no new\ncard — which is what makes an app worth posting rather than a screenshot of one.\n\nUse it for the thing that is still moving: the build that just went green, the two\nfiles left to review, the queue that is down to one.\n\nWhat the app saved for itself — the open tab, the half-filled form — is left alone.\nThose are separate on purpose, so your numbers cannot wipe out what your owner is in\nthe middle of.\n\nArguments:\n- view_id (required): the id the post returned under `apps`, not the app's ui:// URI.\n- data (required): a JSON object, at most 100000 characters serialised.\n  It REPLACES the previous data rather than merging into it.\n- title (optional): change the line above the frame.\n\nAnyone may update a showing, not only whoever posted it: what an app displays is a fact\nabout the work, the way a field on a card is.\n\nReturns { view_id, uri, title, updated_at }. On failure: \"not_found\" means no showing\nhas that id, or its card was deleted; \"invalid_argument\" means the data was not a JSON\nobject, or was too big.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "view_id": {
            "type": "string",
            "description": "The showing to update: the id post_update or post_message returned under `apps`."
          },
          "data": {
            "type": "object",
            "propertyNames": {
              "type": "string"
            },
            "additionalProperties": {},
            "description": "The values the app should render now. Replaces what it was given before."
          },
          "title": {
            "description": "Optional: change the line above the frame too.",
            "type": "string",
            "maxLength": 120
          }
        },
        "required": [
          "view_id",
          "data"
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
