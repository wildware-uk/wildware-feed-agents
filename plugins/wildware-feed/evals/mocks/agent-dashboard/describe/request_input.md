1 tool: request_input. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "request_input",
      "title": "Ask your owner for something and wait",
      "description": "Ask the human who owns this dashboard for something only they can supply. It returns at\nonce; the answer reaches you later as a channel event.\n\nAsk only when you are blocked and need the answer now. A to-do for a person that can\nwait (approve the TestFlight build, add a DNS record, review this copy) is a card\ninstead: post_update with status \"todo\" and assignees [\"Sam\"], then carry on with other\nwork. When they mark it done, a line in its thread tells you. The prompt appears immediately in a banner at the top of their\ndashboard, above everything else, with the control your `kind` calls for.\n\nPick the kind by what you need back:\n- kind \"text\" -> a string. A commit message, a name, a value you are missing.\n  Optional placeholder, multiline, default, min and max (character bounds).\n- kind \"confirm\" -> true or false. Permission to do something consequential.\n- kind \"buttons\" -> one of your options. \"retry\" / \"skip\" / \"abort\".\n- kind \"choice\" -> one of your options, chosen from a list.\n- kind \"multi_choice\" -> a list of your options. Use min and max to bound how many.\n- kind \"form\" -> { action, text }: your own action buttons plus one editable field, so\n  your owner can change what you drafted and then decide about it in one step. Put the\n  draft in `default`, the buttons in `options`, and name the field with `label`. This\n  is the kind to use for \"here is the Slack message I am about to send\" — asking for\n  approval and asking for edits separately means one of the two is answered about text\n  that has already changed.\n  Or give a form `fields` to fill in: up to 20 inputs on one card, each { id, label,\n  type, hint?, required?, default?, options?, min?, max?, placeholder? }. type is text,\n  textarea, number, email, url, date, select (a dropdown), radio, checkbox (one tick),\n  checkboxes (several; min and max say how many) or toggle. options are a select's,\n  radio's or checkboxes' choices; min and max bound a text's length, a number's value or\n  a date (\"2026-12-31\"). `options` are then the buttons (\"Submit\" if you leave it out),\n  and the answer is { action, values }. For example:\n    { kind: \"form\", question: \"Set up the new project?\", options: [\"Create\", \"Cancel\"],\n      fields: [\n        { id: \"name\", label: \"Project name\", type: \"text\", required: true, max: 40 },\n        { id: \"plan\", label: \"Plan\", type: \"select\", options: [\"Free\", \"Team\"], default: \"Free\" },\n        { id: \"seats\", label: \"Seats\", type: \"number\", min: 1, max: 50, default: 5 },\n        { id: \"regions\", label: \"Regions\", type: \"checkboxes\", options: [\"EU\", \"US\", \"Asia\"], min: 1 },\n        { id: \"notify\", label: \"Email me when it is ready\", type: \"toggle\" } ] }\n\nArguments: kind and question are required. detail is the longer explanation.\noptions is required for buttons, choice, multi_choice and form, and refused for the\nrest. placeholder, multiline, label, default, min, max are the kind-specific knobs\nlisted above; fields is a form's inputs, and takes none of those six.\noption_media makes it a picture question: { option: media_id } puts an uploaded image\non that option (buttons, choice, multi_choice), and your owner picks the picture.\nchannel (a slug or id; `project`, its older name, still works) and update (an update\nid) say what the request is about.\nmessage_id asks *inside a thread*: pass the id of the message you were replying to and\nthe question appears in that conversation, under the words that led to it, rather than\nas a card of its own. Use it whenever the question came out of something you were\ndiscussing — it is the difference between \"what about this?\" answered in context and\na prompt your owner has to reconstruct.\ntimeout_s is how long the request stays answerable, one hour by default.\npriority is \"low\", \"medium\" (the default), \"high\" or \"critical\". \"critical\" PAGES YOUR\nOWNER: their phone rings through silent mode and Do Not Disturb, even at night. Use it\nonly when your owner has explicitly told you to use critical, and only when it is\nabsolutely necessary. Never pick it on your own.\n\nmedia_ids and embeds put things on the card, exactly as they do on an update: the\nscreenshot the question is about, the Slack message you are asking whether to send.\n\"Does this look right\" is a question you cannot ask without the thing being looked at.\nmedia_ids are ids from create_upload whose bytes you have already PUT; embeds are\n{ type, data, source_url? }, and list_embed_types says which looks exist.\n\nrefs shows other cards inside the question: up to 8, each { kind, id }, kind \"update\",\n\"message\" or \"request\". Your owner sees each as a small preview, its first picture or\nvideo playing in place, and taps it to open that card's thread. It is how you ask\nabout something you posted elsewhere without posting it twice: reply on the card for\nthe work with the video (post_message with update_id and media_ids), then call\nrequest_input with refs [{ kind: \"message\", id: <that reply's id> }] and ask \"Does\nthis look right?\". The video sits inside the question. A card you cannot read, or one\nalready removed, is refused.\n\nblocks puts rich blocks on the question, as on post_update: a checklist your owner\nticks, a diff or a table to decide on, a poll. Each is { id, type, title?, ... } by type:\n  checklist { items: [{ id, text, done?, owner? }] } (owner: \"you\", an agent or a person);\n  steps { stages: [{ id, label, state, detail? }], progress?, eta? } (state: pending,\n  running, done, failed, skipped; progress 0-1; eta an ISO time);\n  diff { text } (a unified diff) or { files: [{ path, old_path?, status?, hunks }] };\n  chart { kind: line|bar, series: [{ id, label?, points: [[x, y]] }], x_label?, y_label?,\n  unit? }; table { columns: [{ label, kind? }], rows: [[...]], limit? };\n  log { lines or text, highlight?, tail? }; poll { question, options: [{ id, label }],\n  multi?, closes_at?, closed? }.\nChange one later with update_block; ticks and votes reach you as a channel event.\n\nHOW THE ANSWER REACHES YOU. READ THIS BEFORE YOU CALL IT.\n\nThis call does not wait for your owner. It returns at once with\n{ \"state\": \"pending\", \"request_id\" }. DON'T WAIT FOR THE ANSWER: carry on with other\nwork, and keep answering the messages that reach you. When your owner decides, the\nanswer arrives as a channel answer event carrying the request_id, the state and the\nanswer itself, and that is when you act on it. If you need it later and missed the\nevent (after a restart, say), read it with get_messages({ request_id }): the card there\nhas the question's state and, once answered, its response.\n\nThe state ends as one of these:\n\n  { \"state\": \"answered\", \"request_id\", \"response\": { \"kind\", \"value\" }, \"answered_at\" }\n  { \"state\": \"timeout\",  \"request_id\" }\n  { \"state\": \"cancelled\", \"request_id\" }\n\nOn a team of several people, an answer also says who gave it: answered_by { user_id, name }.\n\nYour owner can also reply to the question rather than answer it — \"why do you want to\ndo that?\". That arrives as a message carrying this request_id; answer it with\npost_message({ request_id }). Talking is not answering, and the question stays open\nuntil they decide.\n\nThe request lives in the dashboard database, not in this connection, so it survives\nyour own restart: its request_id is all you need.\n\nREADING THE ANSWER. `response.value` is typed by `response.kind`: a string for \"text\",\n\"buttons\" and \"choice\"; true or false for \"confirm\"; an array of strings for\n\"multi_choice\"; { \"action\", \"text\" } for \"form\"; and { \"action\", \"values\" } for a form with fields,\nwhere values holds each field by id: a string, a number, true or false, or a list for\ncheckboxes. An optional field left empty is left out; a checkbox or toggle is always\nthere. Narrow on `response.kind` and the\nvalue is whichever of those it says. The server checks every answer against the request\nthat asked for it, so a \"choice\" value is always one of the options you offered and a\n\"multi_choice\" always respects your min and max — you do not need to re-validate it.\n\nFor a \"form\", USE `value.text` AND NOT YOUR DRAFT. The whole point of the kind is that\nyour owner may have rewritten it, and `value.action` tells you only what they decided,\nnot what they decided about. `value.action` is one of the options you offered, so a\n\"Reject\" is a real answer: do not send anything.\n\n\"timeout\" means nobody answered in time and \"cancelled\" means your owner dismissed the\nprompt. NEITHER IS PERMISSION. Do not do the thing you asked about; post an update\nsaying you are blocked, or stop.\n\nOn failure: \"invalid_argument\" means the request contradicts itself — options on a\nconfirm, a choice with no options, a min above its max — and the message says which.\n\"not_found\" means the channel or update you named does not exist.\n\nPermissions: your owner decides, per channel and project, what you may do there. Where you\nhave Read only, this fails with forbidden; a channel you have no access to answers not_found.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "enum": [
              "text",
              "confirm",
              "buttons",
              "choice",
              "multi_choice",
              "form"
            ],
            "description": "What you need back: \"text\" for a string, \"confirm\" for a yes/no, \"buttons\" for one action out of several, \"choice\" for one option from a list, \"multi_choice\" for any number of options, \"form\" for an editable draft plus your own action buttons, or with fields for a form to fill in."
          },
          "question": {
            "type": "string",
            "description": "The one line your owner reads, phrased as a question they can answer without reading your transcript. Up to 500 characters."
          },
          "detail": {
            "description": "The paragraph under the question: what you found, what you are about to do, why you stopped. Up to 4000 characters. Markdown is not rendered here.",
            "type": "string"
          },
          "options": {
            "description": "The options offered, for kind \"buttons\", \"choice\", \"multi_choice\" and \"form\". Required for those four, refused for the others. Distinct, at most 25, 200 characters each. For \"form\" these are your action buttons (\"Approve\", \"Reject\") rather than things to pick between. The answer you get back is one of these exact strings.",
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "placeholder": {
            "description": "kind \"text\" and \"form\": the hint shown in the empty box, e.g. \"fix: the parser\".",
            "type": "string"
          },
          "multiline": {
            "description": "kind \"text\" and \"form\": true gives your owner a textarea rather than a single line. Use it for anything longer than a line — a form carrying a message almost always wants it.",
            "type": "boolean"
          },
          "label": {
            "description": "kind \"form\" only: what to call the editable field, e.g. \"Message\" or \"Commit message\". Defaults to \"Your answer\".",
            "type": "string"
          },
          "default": {
            "description": "Pre-fills the control: the suggested text for \"text\", one of the options for \"buttons\" and \"choice\", \"true\" or \"false\" for \"confirm\", and for \"form\" the draft you want reviewed — put the message you are proposing to send here. Not accepted for \"multi_choice\".",
            "type": "string"
          },
          "min": {
            "description": "kind \"multi_choice\": the fewest options that may be chosen. kind \"text\" and \"form\": the shortest answer, in characters. Not accepted for the other kinds.",
            "type": "integer",
            "minimum": -9007199254740991,
            "maximum": 9007199254740991
          },
          "max": {
            "description": "kind \"multi_choice\": the most options that may be chosen. kind \"text\" and \"form\": the longest answer, in characters (10000 by default). Not accepted for the other kinds.",
            "type": "integer",
            "minimum": -9007199254740991,
            "maximum": 9007199254740991
          },
          "project": {
            "description": "Older name for channel, still accepted. Pass channel instead.",
            "type": "string"
          },
          "update": {
            "description": "The id of the update this follows from, if you just posted one. Supplies the channel when you omit it.",
            "type": "string"
          },
          "message_id": {
            "description": "The thread to ask in: a message_id from get_messages or post_message. Your question appears inside that conversation, where your owner is already reading, instead of as a card of its own with none of the context beside it. Ask here whenever the question came out of something you were discussing. Supplies the channel and the card, so naming it is enough.",
            "type": "string"
          },
          "media_ids": {
            "description": "Files to show with this: ids from create_upload whose bytes you have already PUT, at most 24. Images and video render; anything else is listed as a download. All must be yours and unused, or the whole call is refused.",
            "maxItems": 24,
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "option_media": {
            "description": "Picture questions: an image on an option, so your owner picks the picture itself. Maps an option to a media_id from create_upload (bytes already PUT), e.g. { \"Logo A\": \"01J...\", \"Logo B\": \"01K...\" }. For kind \"buttons\", \"choice\" and \"multi_choice\". Every key must be one of your options; options without a picture show as text. Images only, each used once, and not also in media_ids. The answer is still the option string.",
            "type": "object",
            "propertyNames": {
              "type": "string"
            },
            "additionalProperties": {
              "type": "string"
            }
          },
          "embeds": {
            "description": "Things to show in a registered look — a Slack message, a GitHub comment, a Jira ticket — instead of pasting them as flat text. At most 8. Call list_embed_types for the looks and the values each one reads.",
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
          "timeout_s": {
            "description": "How long the request stays answerable, in seconds. Defaults to 3600 (one hour); between 5 and 86400. After it passes the state becomes \"timeout\" and no answer can arrive.",
            "type": "integer",
            "minimum": -9007199254740991,
            "maximum": 9007199254740991
          },
          "priority": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high",
              "critical"
            ],
            "description": "How much this needs your owner NOW: \"low\", \"medium\" (the default), \"high\" or \"critical\". \"critical\" PAGES YOUR OWNER: their phone rings through silent mode and Do Not Disturb, even at night. Use it only when your owner has explicitly told you to use critical, and only when it is absolutely necessary. Never pick it on your own."
          },
          "channel": {
            "description": "A channel slug or id, so the prompt says what this is about.",
            "type": "string"
          },
          "refs": {
            "description": "Other cards to show inside the question, each { kind, id }, at most 8: say, the reply you just posted with the video in it. Your owner sees each as a small preview and taps it to open its thread. A card you cannot read, or one already removed, refuses the request.",
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
          "fields": {
            "description": "kind \"form\" only: a form to fill in, up to 20 inputs on one card. Each is { id, label, type, hint?, required?, default?, options?, min?, max?, placeholder? }, type one of text, textarea, number, email, url, date, select, radio, checkbox, checkboxes, toggle. id is 1-64 letters, digits, _ . or -; label up to 100 characters; hint up to 300; options (select, radio, checkboxes) up to 25. Checked strictly: an unknown key or type, or anything over a limit, refuses the request.",
            "maxItems": 20,
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": {}
            }
          }
        },
        "required": [
          "kind",
          "question"
        ]
      },
      "annotations": {
        "readOnlyHint": false,
        "destructiveHint": false,
        "openWorldHint": true
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
