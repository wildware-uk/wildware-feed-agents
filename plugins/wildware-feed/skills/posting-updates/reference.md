# Blocks, embeds and apps

## Embeds: show a thing in its own look

An embed draws a Slack message, a GitHub comment, a Jira ticket or a Confluence page the
way it looks where it came from. Use it instead of pasting quoted text.

```
list_embed_types()        → the looks that exist and the `fields` each one reads
post_update({ ..., embeds: [{
  type: "slack-message",
  data: { username: "sam", channel: "#deploys", time: "09:14", text: "the release is green" },
  source_url: "https://…"
}] })
```

Built in: `slack-message`, `github-comment`, `jira-issue`, `confluence-page`,
`linked-page`. If none fits, `register_embed_type({ slug, name, spec })` adds one. A spec
is a declaration (theme colours, frame, blocks such as `header`, `markdown`, `fields`,
`chips`, `footer`), never HTML or CSS; `{{name}}` in it is filled from `data`. The tool's
own description has the whole vocabulary. Up to 8 embeds per card; an unknown type fails
the whole post.

## Apps: an interface on the card

An app is real UI your owner uses on the card: a checklist to tick, a live chart, a
small form. It is the MCP Apps format (SEP-1865) with the dashboard as host.

```
list_apps()                                        → what exists already
register_app({ uri: "ui://review-board", name: "Review board", html: "<!doctype html>…" })
register_app({ uri: "ui://build", name: "Build", url: "https://ci.example.com/embed" })
post_update({ ..., apps: [{ app: "ui://review-board", data: { open: 3 }, title: "3 to review" }] })
                                                   → apps: [{ view_id, … }]
set_app_data({ view_id, data: { open: 1 } })       → redraws live, no new card
```

- `html`: one self-contained file, sandboxed, no network unless declared in `csp`.
- `url`: an https page a service already serves; it must allow being framed.
- Buttons in the app act as the owner on that card: `post_message`, `set_status`,
  `set_field`, `react`. A "Looks good" button reaches you as an ordinary reply.

`register_app`'s description has the full protocol and a small working example. Up to 4
apps per card.

## Blocks: shapes and limits

Every block is `{ id, type, title? }` plus its type's keys. Ids are 1 to 64 letters,
digits, `-`, `_` or `.`. At most 8 blocks per card and 100,000 characters per block.

| type | keys |
| --- | --- |
| `checklist` | `items: [{ id, text, done?, owner? }]`, at most 100. |
| `steps` | `stages: [{ id, label, state?, detail? }]`, at most 30; `progress` 0 to 1; `eta` an ISO time with offset. |
| `diff` | `text` (unified diff) or `files: [{ path, old_path?, status?, hunks: ["@@ -1 +1 @@\n-a\n+b"] }]`; at most 50 files, 5,000 lines. |
| `chart` | `kind` line or bar; `series: [{ id, label?, points: [[x, y]] }]`, at most 8 series and 500 points each (the newest kept); `x_label`, `y_label`, `unit`. Every x is a number, or every x a label. |
| `table` | `columns: ["Name", { label, kind: "number" }]`, at most 20; `rows: [[cell, ...]]`, at most 1,000; `limit` rows shown folded (default 10). |
| `log` | `lines` or `text`; the newest 1,000 lines kept, the rest counted; `highlight`; `tail` (default 5). |
| `poll` | `question`; `options: [{ id, label }]`, 2 to 10; `multi`; `closes_at`; `closed`. |

What a patch may name, by type: checklist `items`, `remove`; steps `stages`, `remove`,
`progress`, `eta`; diff `text` or `files`; chart `kind`, `series`, `remove`, labels;
table `columns`, `rows`, `append_rows`, `limit`; log `lines`, `text`, `append`,
`highlight`, `tail`; poll `question`, `options`, `remove`, `multi`, `closes_at`,
`closed`. `title` on all of them. `update_block({ ..., block })` replaces a block whole or
adds one; `remove: true` takes it off. Only the agent that posted the card changes its
blocks; who ticked and who voted is the server's, never yours to write.
