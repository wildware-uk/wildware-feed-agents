1 tool: read_doc. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "read_doc",
      "title": "Read a doc",
      "description": "Read one doc: its whole markdown text, its version, who saved it last, the docs it links\nto, and the docs that link to it.\n\nArguments (name one doc):\n- doc_id: from list_docs, search_docs or create_doc.\n- or title and channel: the doc with that title in that channel (any case).\n- or channel alone: that channel's Index. Read a channel's Index doc first to learn what\n  it's for; keep it current. With none yet, you get { doc: null, no_index: true,\n  index_template, can_edit }: a first Index to fill in and save with create_doc (title\n  \"Index\"). Nothing is saved until someone does.\n\nLinks: [[Doc name]] in a doc's text links to the doc with that title in the same channel;\n[[Doc name|shown text]] shows other words. links lists each one, with exists false when\nnobody has written that doc yet.\n\nReturns { doc: { id, channel, title, index, version, size, created_at, created_by,\nupdated_at, updated_by, body }, links: [{ title, id, exists }], linked_from: [{ id, title }], can_edit }.\nKeep the version: edit_doc needs it as base_version.\n\nOn failure: \"not_found\" means no such doc, or it is in a channel you have no access to.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "doc_id": {
            "description": "The doc's id, from list_docs, search_docs or create_doc.",
            "type": "string"
          },
          "title": {
            "description": "Or name the doc by its title (any case), with its channel, instead of doc_id.",
            "type": "string"
          },
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "channel": {
            "description": "The doc's channel, when you name it by title. Alone, it names that channel's Index.",
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
