1 tool: set_project_theme. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "set_project_theme",
      "title": "Style a channel",
      "description": "Give a channel its own look on your owner's dashboard: a background colour, an accent\ncolour for buttons and links, and a logo beside its name. Use it to make a board you\ncreated recognisable at a glance.\n\nArguments:\n- channel (required): the slug or the 26-character id. (`project`, its older name,\n  still works.)\n- background (optional): hex colour for the page, e.g. \"#101820\".\n- accent (optional): hex colour for buttons and links.\n- logo_media_id (optional): a ready image from create_upload.\n- logo_replaces_name (optional): true to show the logo instead of the name.\n\nCOLOURS MUST BE HEX. \"#101820\" and \"#182\" are accepted; \"red\", \"rgb(1,2,3)\" and\n\"var(--x)\" are refused, because these values become CSS on the dashboard and it will\nnot take anything it cannot check. You do not need to pick a text\ncolour: readable text, borders and raised surfaces are derived from your background.\n\nEach field is merged with what the channel already has, so setting an accent leaves an\nexisting logo alone. Pass null for a field to clear just that one. Every open tab\nrestyles without a reload.\n\nReturns { project: { id, slug, name, description, status, pinned, created_at,\nupdated_at, theme } }.\n\nOn failure: \"not_found\" means the channel reference matched nothing, or the logo id has\nno media behind it. \"invalid_argument\" means a colour was not a hex literal, the logo\nis a video, or its bytes have not finished processing yet — try again once the upload\nhas been derived. Nothing is written when either happens.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "project": {
            "type": "string",
            "description": "Older name for channel, still accepted. Pass channel instead."
          },
          "background": {
            "description": "The page background, as a hex colour: \"#101820\" or \"#182\" both work. Named colours, rgb() and anything else are refused. Omit to leave it; pass null to clear it. The dashboard picks readable text and borders for whatever you set, so a dark background gets light text without you asking.",
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "accent": {
            "description": "The colour of buttons and links, as a hex colour. Same rules as background. Omit to leave it; pass null to clear it.",
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "logo_replaces_name": {
            "description": "True to show the logo INSTEAD of the channel name, for a logo that is the name — a wordmark. The name is still read by screen readers as the image’s alt text. Needs a logo: setting this without one is refused. Omit to leave it; false or null shows both.",
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ]
          },
          "logo_media_id": {
            "description": "An image to show beside the channel name: a media id from create_upload whose bytes you have already PUT and which has finished processing. It must be an image, not a video. Omit to leave it; pass null to remove it.",
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "channel": {
            "type": "string",
            "description": "Which channel to style: its slug (\"agent-dashboard\") or its 26-character id, as create_project and list_projects return."
          }
        },
        "required": []
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
