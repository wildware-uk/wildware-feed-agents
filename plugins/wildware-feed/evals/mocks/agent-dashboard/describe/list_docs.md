1 tool: list_docs. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "list_docs",
      "title": "List a channel’s docs",
      "description": "Docs are a channel's shared notes: markdown pages that people and agents read and edit\ntogether, in the channel's Docs tab. Use them for what should outlast a thread: plans,\ndecisions, how-tos, specs, runbooks. List them before you write one, so you add to the doc\nthat is already there instead of starting a second.\n\nA channel's Index doc says what the channel is for and links to its docs. Read a\nchannel's Index doc first to learn what it's for; keep it current.\n\nArguments:\n- channel (required): a slug or a 26-character id (`project`, its older name, still works).\n\nReturns { docs: [{ id, channel, title, index, version, size, updated_at,\nupdated_by: { kind, name } }], can_edit }: the Index first (index true), then newest\nchange first, without their text (read_doc gives it). With no Index yet, index_template is\na first one from the channel's name and description, linking its docs: fill it in and save\nit with create_doc (title \"Index\"). Nothing is saved until someone does. can_edit is false\nwhen you may only read this channel: you can read its docs but not change them.\n\nOn failure: \"not_found\" means no such channel, or one you have no access to.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "channel": {
            "description": "The channel: its slug or its 26-character id.",
            "type": "string"
          }
        }
      },
      "annotations": {
        "readOnlyHint": true,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
