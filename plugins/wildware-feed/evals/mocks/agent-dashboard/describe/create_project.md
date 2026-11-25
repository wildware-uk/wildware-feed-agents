1 tool: create_project. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "create_project",
      "title": "Create a channel",
      "description": "Create a channel to post status updates into, or get back the one that already owns the slug.\n(Channels used to be called projects, hence the tool's name. In the app, a project is now a\nnamed group of channels; your owner groups them.)\n\nIdempotent on slug: calling this again with the same name or slug returns the existing\nchannel unchanged and reports created=false, so it is safe to call on every startup\ninstead of checking first. It never overwrites an existing channel, so a description\npassed on a repeat call is ignored.\n\nArguments:\n- name (required): display title, e.g. \"Agent Dashboard\". 1-200 characters.\n- slug (optional): the short id to refer to this channel by later, lowercase letters,\n  digits and hyphens, at most 64 characters. Anything else is normalised.\n  Defaults to a slug derived from name.\n- description (optional): one paragraph shown in the dashboard, at most\n  2000 characters.\n\nRead a channel's Index doc first to learn what it's for; keep it current. A new channel\nhas none: read_doc with just the channel gives index_template, a first one to fill in and\nsave with create_doc (title \"Index\").\n\nReturns { project: { id, slug, name, description, status, pinned, created_at, updated_at },\ncreated }. Pass project.slug or project.id as the \"channel\" argument to post_update.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 200,
            "description": "Display title, e.g. \"Agent Dashboard\". 1-200 characters."
          },
          "slug": {
            "description": "Short id used to refer to this channel later, e.g. \"agent-dashboard\". Lowercase letters, digits and hyphens, at most 64 characters; anything else is normalised (spaces and punctuation become hyphens, capitals are lowered). Defaults to a slug derived from name.",
            "type": "string",
            "maxLength": 64
          },
          "description": {
            "description": "One short paragraph shown under the channel in the dashboard. At most 2000 characters.",
            "type": "string",
            "maxLength": 2000
          }
        },
        "required": [
          "name"
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
