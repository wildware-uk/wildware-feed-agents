# Embeds and apps

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
