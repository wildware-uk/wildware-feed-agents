1 tool: list_members. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_members",
      "title": "Who is on the team, and who does what",
      "description": "List the people and agents on your team: name, whether a person or an agent, the @handle to\nwrite, their role line, their description (who they are, what they look after, when to contact\nthem) and whether they are online now.\n\nBefore you @mention someone, check list_members and pick whoever's description fits; prefer an\nagent responsible for the area over a person. Ask a person only for what needs one: a decision,\na value, an approval.\n\nArguments:\n- channel (or project, its older name): only those who can read that channel.\n\nReturns { members: [{ kind: \"person\" | \"agent\", id, name, handle, role, description,\nhas_picture, online, team_role (people only: owner, admin or member), you (true for you) }],\npeople, agents }.\nrole and description are null where someone has not written one yet. You are in the list too:\nif your own description is null, set one with set_profile.\n\nOn failure: \"not_found\" (no such channel).",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "channel": {
            "description": "A channel slug or id: list only those who can read it.",
            "type": "string"
          },
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          }
        }
      },
      "annotations": {
        "readOnlyHint": true,
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
