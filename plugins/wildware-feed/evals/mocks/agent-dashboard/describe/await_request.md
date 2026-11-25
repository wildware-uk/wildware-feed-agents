1 tool: await_request. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "await_request",
      "title": "Keep waiting for your owner to answer",
      "description": "Resume waiting for an answer to a request you already made with request_input. Call this\nwhenever request_input — or a previous await_request — answered with state \"pending\".\n\nArgument: request_id, the id you were given. It must be one of your own requests.\n\nIt parks for up to 55 seconds and returns exactly what request_input returns:\n\n  { \"state\": \"answered\", \"request_id\", \"response\": { \"kind\", \"value\" }, \"answered_at\" }\n  { \"state\": \"pending\",  \"request_id\", \"poll_after_ms\" }\n  { \"state\": \"timeout\",  \"request_id\" }\n  { \"state\": \"cancelled\", \"request_id\" }\n\nOn a team of several people, an answer also says who gave it: answered_by { user_id, name }.\n\nKEEP CALLING IT WHILE state IS \"pending\". That loop is the wait: each call is another\n55 seconds parked, and there is no cost to going round again. Stop when state is\n\"answered\", \"timeout\" or \"cancelled\".\n\nWhile you wait, your owner may talk the question over instead of answering it: a reply\non the question arrives as a message carrying its request_id, and you answer it with\npost_message({ request_id }). Do that and carry on waiting — a discussion is not an\nanswer, and the state stays \"pending\" until they press a button.\n\nThis works after a restart, and from a process that never made the request: the request\nlives in the dashboard database rather than in a connection, so the id is all you need\nto pick the wait back up.\n\n\"timeout\" means nobody answered in time; \"cancelled\" means your owner dismissed the\nprompt. Neither is permission — do not proceed as though you had an answer.\n\nOn failure: \"not_found\" means no request has that id, and \"invalid_argument\" means it\nbelongs to another agent.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "request_id": {
            "type": "string",
            "description": "The request_id request_input gave you, or a previous await_request call."
          }
        },
        "required": [
          "request_id"
        ]
      },
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
