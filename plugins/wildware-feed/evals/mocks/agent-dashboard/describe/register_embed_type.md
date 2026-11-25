1 tool: register_embed_type. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "register_embed_type",
      "title": "Register an embed look",
      "description": "Teach the dashboard how to draw a kind of thing, so you can show your owner a Slack\nmessage, a GitHub comment, a Jira ticket or anything else looking roughly like where it\ncame from instead of pasting it as flat text.\n\nTwo steps: register the look once, then pass `embeds` to post_update or post_message as\noften as you like. Correcting the look later restyles every embed already posted in it.\n\nCall list_embed_types first — slack-message, github-comment, jira-issue,\nconfluence-page and linked-page already exist, and reusing one is better than\nregistering a near-copy.\n\n## The spec\n\nIt is a DECLARATION, not markup. HTML, CSS and template languages are all refused:\nan embed is drawn on your owner's dashboard, so the only thing that can be safely\naccepted from you is a description of which blocks to draw in which colours. Every\nvalue you send is rendered as text.\n\n```json\n{\n  \"theme\": {\n    \"accent\": \"#611f69\", \"background\": \"#ffffff\", \"foreground\": \"#1d1c1d\",\n    \"muted\": \"#616061\", \"border\": \"#e2e2e2\",\n    \"font\": \"sans\", \"radius\": \"sm\"\n  },\n  \"frame\": { \"border\": true, \"stripe\": false, \"padding\": \"roomy\", \"indent\": true },\n  \"blocks\": [\n    { \"type\": \"header\", \"avatar\": \"{{avatar}}\", \"title\": \"{{username}}\",\n      \"meta\": \"{{time}}\", \"shape\": \"rounded\", \"size\": \"md\", \"layout\": \"inline\" },\n    { \"type\": \"markdown\", \"value\": \"{{text}}\", \"size\": \"md\" },\n    { \"type\": \"chips\", \"value\": \"{{reactions}}\", \"style\": \"pill\" },\n    { \"type\": \"footer\", \"value\": \"{{channel}}\", \"url\": \"{{permalink}}\" }\n  ]\n}\n```\n\nThat is the built-in slack-message look, and it is worth reading as an example of the\npoint: it carries no badge, because a Slack message does not have one. Copying a source\nmeans copying its shape, not labelling the card with its name.\n\nColours must be hex literals (#rgb or #rrggbb). font is one of sans, serif, mono;\nradius is one of none, sm, md, lg. Everything in theme is optional, and an\nomitted colour is inherited from the dashboard rather than forced to white.\n\n## frame — the card, rather than what is in it\n\n- border  (default true)  — draw the outer edge.\n- stripe  (default false) — an accent bar down the left. Most sources have none.\n- padding (default normal) — one of tight, normal, roomy.\n- indent  (default false) — line the body up under the header's WORDS rather than under\n  its avatar. This is Slack's shape, and leaving it off is the single thing that makes a\n  Slack card read as a quotation rather than as the message.\n\n## chrome — saying where the card came from\n\n- mark  — one of slack, github, gitlab, jira, confluence, linear, notion, figma, link. Drawn small in the card's top corner. Use\n  this: a dashboard is a wall of quotations from several places at once, and the mark is\n  how a reader tells them apart at a glance. It costs the look nothing, because it is\n  drawn over the card rather than in it.\n- image — a media_id or an https image URL, for a source we draw no mark for. Upload your\n  tool's logo with create_upload and name it here. It wins over mark when you give both.\n- label — a badge bar across the top, with an optional emoji `icon` beside it. Usually\n  wrong if you are copying a real source, because a Slack message has no \"Slack\" bar on\n  it — prefer `mark`. Worth it for a look with no brand of its own, where naming the site\n  is the only thing that says where the card is from.\n\nThe mark and the label both link to the source_url you pass when you post.\n\n## Blocks (at most 24, drawn in order)\n\n- header  — { avatar?, title?, subtitle?, meta?, shape?, size?, layout?, bar? }.\n  avatar is a media_id from create_upload, or an https image URL.\n  shape is one of circle, rounded, square — Slack's is rounded, GitHub's is\n  circle. size is one of sm, md, lg. layout \"inline\" puts the title and\n  everything beside it on one line, which is Slack's; \"stacked\" (the default) puts the\n  subtitle under the title with the meta on the right. bar:true draws the header as a\n  tinted band above the body, which is a GitHub comment exactly.\n- heading — { value, level? }. A page title. level is 1 or 2.\n- text    — { value, tone?, size? }. Plain text, newlines kept, never interpreted.\n  tone is normal, muted or accent; size is sm, md or lg.\n- markdown— { value, size? }. Rendered as markdown, same as an update body.\n- code    — { value, language? }. A fenced block in a monospace face.\n- quote   — { value }. Indented, with a rule down the left.\n- fields  — { items: [{ label, value }], layout? }. What a ticket sidebar is.\n  layout is \"rows\" (a label/value table) or \"inline\".\n  - chips   — { value, style? }. style is one of pill, lozenge, tag: a pill is\n  a Slack reaction, a lozenge is a Jira status, a tag is a label. Send a list, or one\n  comma-separated string.\n- image   — { value, alt? }. A media_id or an https image URL.\n- divider — {}\n- footer  — { value?, url? }. A last line, optionally linking out.\n  Every block type: header, heading, text, markdown, code, quote, fields, chips, image, divider, footer.\n\n## Filling one in\n\nAny string in the spec may carry {{name}}, which is replaced with the value you send\nunder that name when you post. A block whose values all come out empty is not drawn,\nso one look covers a message that has reactions on it and one that does not.\n\n{{source_url}} is filled from the source_url you pass when you post, so a footer can\nlink back without you sending the URL twice. The badge along the top links there too.\n\nArguments:\n- slug (required): lowercase-hyphenated, at most 60 characters.\n- name (required): what a human calls it, at most 80 characters.\n- spec (required): the object above.\n\nReturns { slug, name, built_in, blocks }. On failure: \"invalid_argument\" names the\nfield that did not hold up — an unknown block type, a colour that is not a hex literal,\na spec with no blocks. \"conflict\" means that slug is already somebody else's look, or\nis one this dashboard ships; pick another slug.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "slug": {
            "type": "string",
            "maxLength": 60,
            "description": "How you will name this look when you post one, e.g. \"slack-message\". Lowercase words joined by hyphens. Registering the same slug again replaces the look, which is what you want at the start of a run — but only if you registered it: the ones this dashboard ships cannot be redefined."
          },
          "name": {
            "type": "string",
            "maxLength": 80,
            "description": "What to call it for a human, e.g. \"Slack message\"."
          },
          "spec": {
            "type": "object",
            "propertyNames": {
              "type": "string"
            },
            "additionalProperties": {},
            "description": "The look itself: { theme, chrome, blocks }. See the description for the whole vocabulary. It is a declaration, never HTML or CSS."
          }
        },
        "required": [
          "slug",
          "name",
          "spec"
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
