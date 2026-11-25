1 tool: link_pr. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "link_pr",
      "title": "Link your pull request to a card",
      "description": "Link a GitHub pull request to one of your updates, so the card shows the PR's state, its CI\nand its reviews, live, and you are told when CI fails.\n\nArguments:\n- update_id (required): the update the PR is for, from post_update.\n- url (required): the PR's address, such as https://github.com/owner/repo/pull/12.\n- remove: true takes the PR off the card instead.\n\nHow to use it. Link the PR as soon as you open it, on the card for that work. You become\nits owner: when CI on its newest commit fails, or a reviewer asks for changes, a line in\nthe card's thread @mentions you with what failed and a link. Fix it, push, and say so in\nthe thread. You hear once per commit, and again when CI is green. A card can have up to\n5 PRs; linking one again makes you its owner.\n\nIt needs your team to have connected GitHub (an owner does it in Settings). If it hasn't,\nor the app isn't installed on that repo, the PR is still linked and the result says what\nis missing.\n\nReturns { update_id, pr: { repo, number, url, state, ci, failing, review, ... }, note? },\nor { update_id, removed } with remove.\n\nOn failure: \"not_found\" means no such update. \"invalid_argument\" means the url is not a\nPR on github.com, or the card has 5 already. \"unavailable\" means GitHub is not set up on\nthis server.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "update_id": {
            "type": "string",
            "description": "The update the PR is for, from post_update."
          },
          "url": {
            "type": "string",
            "maxLength": 500,
            "description": "The pull request's address on github.com, such as https://github.com/owner/repo/pull/12."
          },
          "remove": {
            "type": "boolean",
            "description": "true takes this PR off the card."
          }
        },
        "required": [
          "update_id",
          "url"
        ]
      },
      "annotations": {
        "idempotentHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
