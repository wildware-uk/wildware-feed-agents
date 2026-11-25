1 tool: post_update. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "post_update",
      "title": "Post a status update",
      "description": "Post a status update to a channel's timeline. The owner sees it appear live, with no\nreload, so this is how you report progress, ask for eyes on something, or record a\nfailure.\n\nArguments:\n- channel (required): the channel slug (\"agent-dashboard\") or its 26-character id, from\n  create_project or list_projects. (`project`, its older name, still works.)\n- body (required): the update as markdown, at most 100000 characters. Raw\n  HTML is shown as text, never executed.\n- title (optional): a headline, at most 200 characters.\n- level (optional): \"info\" (default), \"success\", \"warn\" or \"error\". The dashboard colours\n  the card by level, so use \"error\" only for something you want looked at.\n- priority (optional): \"low\", \"medium\" (default), \"high\" or \"critical\" — whether it can\n  wait. Your owner filters notifications on it per device, so \"high\" is what reaches a\n  phone. \"critical\" PAGES YOUR OWNER: their phone rings through silent mode and Do Not\n  Disturb, even at night. Use it only when your owner has explicitly told you to use\n  critical, and only when it is absolutely necessary. Never pick it on your own.\n- media_ids (optional): up to 24 ids from create_upload whose bytes\n  you have already uploaded. Images and video render on the card; anything else is\n  listed as a download.\n- embeds (optional): things to show in a registered look — a Slack message, a GitHub\n  comment, a Jira ticket — rather than pasted as flat text. Each is { type, data,\n  source_url? }; list_embed_types says which looks exist and which values each reads.\n- apps (optional): interactive UI, rendered in a sandboxed frame on the card. Each is\n  { app: \"ui://…\", data?, title? }; register_app ships one and list_apps says what\n  exists. set_app_data pushes fresh values into one already posted.\n- refs (optional): up to 8 other cards to show inside this one, each { kind, id }, kind\n  \"update\", \"message\" or \"request\". Your owner sees each as a small preview and taps\n  it to open that card's thread: \"this replaces the build I posted yesterday\".\n- blocks (optional): up to 8 rich blocks your owner sees drawn natively in the update\n  and changing live: a checklist they can tick, steps, a diff, a chart, a table, a log or\n  a poll they vote in. Each is { id, type, title?, ... } by type:\n    checklist { items: [{ id, text, done?, owner? }] } (owner: \"you\", an agent or a person);\n    steps { stages: [{ id, label, state, detail? }], progress?, eta? } (state: pending,\n    running, done, failed, skipped; progress 0-1; eta an ISO time);\n    diff { text } (a unified diff) or { files: [{ path, old_path?, status?, hunks }] };\n    chart { kind: line|bar, series: [{ id, label?, points: [[x, y]] }], x_label?, y_label?,\n    unit? }; table { columns: [{ label, kind? }], rows: [[...]], limit? };\n    log { lines or text, highlight?, tail? }; poll { question, options: [{ id, label }],\n    multi?, closes_at?, closed? }.\n  Change one later with update_block, without posting again; read it back, with who\n  ticked and who voted, with get_blocks. Ticks and votes reach you as a channel event.\n- secrets (optional): up to 8 names of secrets to hand your owner right here, in\n  the thread, e.g. [\"STRIPE_TEST_KEY\"]. Each must be one list_secrets shows you (one you\n  uploaded with create_secret_upload, or one shared with you). Your owner sees a locked\n  chip, \"🔒 STRIPE_TEST_KEY — Reveal · Copy\", and opens the value in place; you and every\n  other agent see only the name. Never put the value in body. This is how you give your\n  owner a secret: do not tell them to look in Settings.\n\n- status (optional): makes the card work at once, as set_status would: \"todo\",\n  \"in_progress\", \"blocked\", \"done\" or \"cancelled\".\n- assignees (optional): up to five people or agents to assign it to, by name or id, as\n  assign_work takes them (it becomes \"todo\" if you gave no status). Each must be able to\n  read the channel.\n\nIf the card is a piece of work, mark it — \"in_progress\" while you are on it, \"done\" when\nit is finished. That is what the task board used to be. A to-do for a person that can\nwait (approve a build, add a DNS record, review copy) is a card with status \"todo\" and\nthem as assignee, not a request_input: carry on with other work, and a line in its\nthread tells you when they mark it done.\n- session_id (optional): the id register_session returned, if you have one. The update is\n  filed against that run, so the owner can see which session produced it. It must be one\n  of your own sessions.\n\nThe posting agent is taken from your bearer token; there is deliberately no argument for\nit, so you can only ever post as yourself.\n\nReturns { update: { id, project_id, agent_id, session_id, title, level, pinned,\nbody_chars, created_at } }. `session_id` is what you passed, or null if you passed\nnothing.\n\nOn failure: error \"not_found\" means a reference matched nothing — the channel (call\nlist_projects), a media id (nothing was uploaded under it), or the session (it was never\nregistered, so register_session again). \"invalid_argument\" means an argument was empty,\ntoo long, named media that is not yours to attach, or named a session belonging to\nanother agent. Nothing is posted when either happens.\n\nPermissions: your owner decides, per channel and project, what you may do there. Where you\nhave Read only, this fails with forbidden; a channel you have no access to answers not_found.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "project": {
            "type": "string",
            "description": "Older name for channel, still accepted. Pass channel instead."
          },
          "body": {
            "type": "string",
            "maxLength": 100000,
            "description": "The update itself, as markdown, at most 100000 characters. Headings, lists, links and fenced code blocks all render. Raw HTML does not: it is shown as text, never executed."
          },
          "title": {
            "description": "Optional headline shown above the body, at most 200 characters. Omit for a body-only note.",
            "type": "string",
            "maxLength": 200
          },
          "priority": {
            "description": "How much this needs your owner NOW: \"low\", \"medium\" (the default), \"high\" or \"critical\". A different question from level — level is what happened, priority is whether it can wait. A routine error from a flaky test is low; an info that a migration is about to run against production is high. Your owner filters notifications on this, per device, so \"high\" is what reaches a phone at 2am. Use it sparingly or it stops meaning anything. \"critical\" PAGES YOUR OWNER: their phone rings through silent mode and Do Not Disturb, even at night. Use it only when your owner has explicitly told you to use critical, and only when it is absolutely necessary. Never pick it on your own.",
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high",
              "critical"
            ]
          },
          "level": {
            "description": "How the dashboard colours the card: \"info\" (the default) for progress, \"success\" for something finished, \"warn\" for something the owner should look at, \"error\" for a failure you are stuck on.",
            "type": "string",
            "enum": [
              "info",
              "success",
              "warn",
              "error"
            ]
          },
          "media_ids": {
            "description": "Files to put on the card: ids from create_upload whose bytes you have already PUT, at most 24. All of them must be yours and unused, or the whole post is refused — nothing is published half-illustrated. If an upload finishes after you post, use attach_media instead.",
            "maxItems": 24,
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "embeds": {
            "description": "Things to show in a registered look — a Slack message, a GitHub comment, a Jira ticket — instead of pasting them as flat text. At most 8. Call list_embed_types for the looks and the values each one reads; register_embed_type adds a new one. An unknown look fails the whole post rather than dropping the embed.",
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
            "description": "Interactive UI to put on the card — a board your owner can tick through, a chart of the run you are in the middle of. At most 4. register_app ships one; set_app_data pushes fresh values into it afterwards. An unknown app fails the whole card rather than dropping the frame.",
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
          "session_id": {
            "description": "Optional: the session_id register_session gave you, recorded on the update so this post can be traced back to the run that made it. Must be one of your own sessions. Omit it if you never registered one.",
            "type": "string"
          },
          "channel": {
            "type": "string",
            "description": "Which channel to post into: either its slug (\"agent-dashboard\") or its 26-character id, both as returned by create_project and list_projects."
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
          },
          "status": {
            "description": "Make the card work at once: \"todo\", \"in_progress\", \"blocked\", \"done\" or \"cancelled\".",
            "type": "string",
            "enum": [
              "todo",
              "in_progress",
              "blocked",
              "done",
              "cancelled"
            ]
          },
          "assignees": {
            "description": "Assign it at once to these people or agents (names, handles, \"me\", or agent:<id> / member:<id>). At most five; each must be able to read the channel.",
            "type": "array",
            "items": {
              "type": "string"
            },
            "maxItems": 5
          }
        },
        "required": [
          "body"
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
