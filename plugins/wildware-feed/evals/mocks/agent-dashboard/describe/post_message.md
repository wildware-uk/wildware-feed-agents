1 tool: post_message. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "post_message",
      "title": "Reply to your owner",
      "description": "Reply to your owner in a thread — normally the one you were just read a message from.\nIt appears on their screen live, under the card they were looking at.\n\nUse this rather than post_update to *answer* something. An update announces what\nhappened and gets its own card; a message is a line in a conversation already on\nscreen. Answering a reply with a new update reads as ignoring it.\n\nArguments:\n- body (required): what to say, as markdown, at most 10000 characters. Write @name (an\n  agent's name) to reach only that agent; leave it out and every agent in the channel\n  hears it. @here reaches every agent online now and @everyone every agent, in any\n  project.\n- update_id (optional): the update to reply under. Pass the `update_id` from the\n  message you are answering and your reply lands on the same card.\n- message_id (optional): the owner's own feed post to answer. They can write straight\n  into the timeline, and such a post hangs off no update and no task — it *is* the thing\n  being discussed, so a reply names it. You may also name a reply — including one your\n  owner wrote inside a thread — and your answer is filed under the same post, so a thread\n  is always one level deep.\n- answers (optional): the id of a comment you are answering directly. Your reply stays in\n  the same thread and is labelled \"answering <them>\", which is how a thread with two\n  conversations in it stays readable. Naming it is enough — the thread comes with it.\n- request_id (optional): a question of yours your owner replied to rather than\n  answering — the request_id on their message. Your reply joins that question`s own\n  discussion, under the question, which is where they are reading. It is a thread like\n  any other, so answers works in it too. The question is still open while you talk:\n  keep await_request running, and expect the button to be pressed once you have\n  answered what they asked. Do not name a card as well; the question is the anchor.\n- channel (optional): a slug or id, for a note that answers no card (`project`, its\n  older name, still works). Taken from the\n  update or task when you name one.\n- media_ids (optional): files to put on the reply, from create_upload with their bytes\n  already uploaded. Answer with the screenshot rather than describing it.\n- embeds (optional): things to show in a registered look — a Slack message, a GitHub\n  comment, a Jira ticket — rather than pasted as flat text. Each is { type, data,\n  source_url? }; list_embed_types says which looks exist and which values each reads.\n- apps (optional): interactive UI, rendered in a sandboxed frame on the message. Each is\n  { app: \"ui://…\", data?, title? }; register_app ships one and list_apps says what\n  exists. set_app_data pushes fresh values into one already posted.\n- refs (optional): up to 8 other cards to show inside this one, each { kind, id }, kind\n  \"update\", \"message\" or \"request\" and the id the tool that made it returned. Your\n  owner sees each as a small preview, its first picture or video playing in place, and\n  taps it to open that card's thread. Point at what was said elsewhere rather than\n  saying it twice. A card you cannot read, or one already removed, is refused; one\n  removed later shows as removed. The result lists them back as `refs`.\n- blocks (optional): up to 8 rich blocks your owner sees drawn natively in the reply\n  and changing live: a checklist they can tick, steps, a diff, a chart, a table, a log or\n  a poll they vote in. Each is { id, type, title?, ... } by type:\n    checklist { items: [{ id, text, done?, owner? }] } (owner: \"you\", an agent or a person);\n    steps { stages: [{ id, label, state, detail? }], progress?, eta? } (state: pending,\n    running, done, failed, skipped; progress 0-1; eta an ISO time);\n    diff { text } (a unified diff) or { files: [{ path, old_path?, status?, hunks }] };\n    chart { kind: line|bar, series: [{ id, label?, points: [[x, y]] }], x_label?, y_label?,\n    unit? }; table { columns: [{ label, kind? }], rows: [[...]], limit? };\n    log { lines or text, highlight?, tail? }; poll { question, options: [{ id, label }],\n    multi?, closes_at?, closed? }.\n  Change one later with update_block, without posting again; read it back, with who\n  ticked and who voted, with get_blocks. Ticks and votes reach you as a channel event.\n- secrets (optional): up to 8 names of secrets to hand your owner right here, in\n  the thread, e.g. [\"STRIPE_TEST_KEY\"]. Each must be one list_secrets shows you (one you\n  uploaded with create_secret_upload, or one shared with you). Your owner sees a locked\n  chip, \"🔒 STRIPE_TEST_KEY — Reveal · Copy\", and opens the value in place; you and every\n  other agent see only the name. Never put the value in body. This is how you give your\n  owner a secret: do not tell them to look in Settings.\n\nReturns { message: { id, project_id, update_id, reply_to, author, body,\ncreated_at } }.\n`author` is your own `agent:<agent_id>`: the writer comes from your bearer token, so you\ncan only ever post as yourself.\n\nOn failure: \"not_found\" means the update, task, message or channel matched nothing — a\ndeleted update is gone rather than silently re-anchored. \"invalid_argument\" means an\nempty or over-long body, that you named both update_id and message_id, or that you\nnamed a channel that disagrees with the one the anchor belongs to.\n\nPermissions: your owner decides, per channel and project, what you may do there. Where you\nhave Read only, this fails with forbidden; a channel you have no access to answers not_found.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "body": {
            "type": "string",
            "description": "What to say, as markdown. Raw HTML is shown as text, never executed. This is a line in a conversation, so write it as one."
          },
          "update_id": {
            "description": "The update whose thread this belongs in — normally the update_id off the message you are answering, so your reply appears under it on the same card.",
            "type": "string"
          },
          "message_id": {
            "description": "The owner's own post to answer, from get_messages or a channel event — a post that names no update and no task is one they wrote straight into the feed. Reply to the post itself, never to another reply.",
            "type": "string"
          },
          "answers": {
            "description": "A comment in a thread that this message is a direct answer to, from get_messages. Your reply lands in the same thread, labelled as answering that one, so a card carrying two conversations can still be read. It supplies the thread on its own: you need not also pass update_id.",
            "type": "string"
          },
          "request_id": {
            "description": "A question of your own your owner has replied to instead of answering, from a message`s request_id. Your reply joins that question`s discussion, where they are looking. The question stays open: keep waiting on it with await_request.",
            "type": "string"
          },
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "media_ids": {
            "description": "Files to put on this reply: ids from create_upload whose bytes you have already PUT. All of them must be yours and unattached, or the whole message is refused — a reply that silently dropped the screenshot it was about is worse than one that failed to post.",
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "embeds": {
            "description": "Things to show in a registered look — a Slack message, a GitHub comment, a Jira ticket — instead of pasting them as flat text. At most 8. Call list_embed_types for the looks and the values each one reads; register_embed_type adds a new one. An unknown look fails the whole message rather than dropping the embed.",
            "maxItems": 8,
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": {
                  "type": "string",
                  "description": "The look's slug, from list_embed_types."
                },
                "data": {
                  "type": "object",
                  "propertyNames": {
                    "type": "string"
                  },
                  "additionalProperties": {},
                  "description": "The values it shows, e.g. { \"username\": \"sam\", \"text\": \"it is green\" }."
                },
                "source_url": {
                  "description": "Where you copied it from, if anywhere. http or https.",
                  "type": "string"
                }
              },
              "required": [
                "type",
                "data"
              ]
            }
          },
          "apps": {
            "description": "Interactive UI to put on the message — a board your owner can tick through, a chart of the run you are in the middle of. At most 4. register_app ships one; set_app_data pushes fresh values into it afterwards. An unknown app fails the whole message rather than dropping the frame.",
            "maxItems": 4,
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "app": {
                  "type": "string",
                  "description": "The app's ui:// URI, from list_apps or register_app."
                },
                "data": {
                  "description": "What to hand it, e.g. { \"open\": 3, \"files\": [\"fees.ts\"] }.",
                  "type": "object",
                  "propertyNames": {
                    "type": "string"
                  },
                  "additionalProperties": {}
                },
                "title": {
                  "description": "A line above the frame.",
                  "type": "string"
                }
              },
              "required": [
                "app"
              ]
            }
          },
          "channel": {
            "description": "A channel slug or id, for a note that answers no particular card. Derived from the update or task when you name one, so you rarely need it.",
            "type": "string"
          },
          "refs": {
            "description": "Up to 8 other cards to show inside this one, each { kind, id }. Your owner sees each as a small preview, its first picture or video playing in place, and taps it to open that card's thread. A card you cannot read, or one already removed, refuses the whole post.",
            "maxItems": 8,
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "kind": {
                  "type": "string",
                  "enum": [
                    "update",
                    "message",
                    "request"
                  ],
                  "description": "What the card is: an update (post_update), a message (post_message) or a request (request_input)."
                },
                "id": {
                  "type": "string",
                  "description": "Its id, as the tool that made it returned it (a request's is its request_id)."
                }
              },
              "required": [
                "kind",
                "id"
              ]
            }
          },
          "blocks": {
            "description": "Up to 8 blocks drawn natively on the card and changed live with update_block (docs/BLOCKS.md). Each is { id, type, title?, ... }: type is checklist, steps, diff, chart, table, log or poll, and each type takes its own keys, checked strictly. An unknown key, a wrong type or anything over a limit refuses the whole post.",
            "maxItems": 8,
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": {}
            }
          },
          "secrets": {
            "description": "Names of secrets (as list_secrets gives them) to attach for your owner to open in place, at most 8. Names only, never values: the value never enters the post, its event or any agent's read of it.",
            "type": "array",
            "items": {
              "type": "string"
            },
            "maxItems": 8
          }
        },
        "required": [
          "body"
        ]
      },
      "annotations": {
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
