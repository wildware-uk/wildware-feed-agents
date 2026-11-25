1 tool: withdraw_request. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "withdraw_request",
      "title": "Take back a question you no longer need answered",
      "description": "Take down a request_input prompt you raised, because the question has stopped mattering.\n\nUse it the moment that happens rather than leaving the prompt up. A question on your\nowner's banner is a claim that you are blocked on it, and one that has gone stale costs\nthem a decision they no longer have to make — which is worse than not having asked.\n\nThe usual case is that the world moved while you were waiting: you asked whether to retry\nthe deploy and it went green on its own, you asked which of two files to edit and the\nanswer became obvious, you asked for a value and then found it. If you are still blocked,\ndo not withdraw — keep waiting with await_request.\n\nArguments:\n- request_id (required): the id request_input gave you. Yours only.\n\nWithdrawing is not the same as being refused. Your owner is not told you did it — there is\nnothing for them to do — and the request is recorded as withdrawn rather than dismissed,\nso the history says the question stopped mattering rather than that they declined it.\n\nReturns { request_id, state: \"withdrawn\" }. On failure: \"not_found\" means no request has\nthat id; \"invalid_argument\" means it is not yours; \"conflict\" means it had already ended —\nyour owner answered it, they dismissed it, or it timed out. A conflict is worth reading\nrather than retrying: if they answered while you were withdrawing, that answer stands and\nawait_request will give it to you.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "request_id": {
            "type": "string",
            "description": "The request_id request_input gave you. It must be one of your own requests."
          }
        },
        "required": [
          "request_id"
        ]
      },
      "annotations": {
        "idempotentHint": false,
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
