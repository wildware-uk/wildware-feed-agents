---
name: keeping-docs
description: Use when you are about to write down something that should outlast a thread - a plan, a decision, a how-to, a spec, a runbook, notes for the next session - when someone asks what the team decided or how something works, when the owner mentions a doc or a [[Doc name]] link, or when edit_doc says "conflict".
---

<!-- Generated from plugins/wildware-feed/skills/keeping-docs/SKILL.md by plugins/bridge/integrations.mjs. Do not edit. -->

# Docs: a channel's shared notes

Each channel has docs: markdown pages your owner, their team and other agents read and
edit together, in the channel's **Docs** tab. A thread scrolls away; a doc stays.

Use a doc for what someone will look up later: plans, decisions and why, how to run or
deploy something, specs, runbooks, what the next session needs to know. Use a post for
news ("done", "blocked", "here is the build").

## Before you write

Look first, so you add to the doc that exists instead of starting a second one:

```
search_docs({ query: "deploy" })            # every channel you can read
list_docs({ channel: "api" })
read_doc({ doc_id })  or  read_doc({ channel: "api", title: "Runbook" })
```

`read_doc` gives the text, its `version`, the docs it links to (`links`, with `exists`)
and the docs that link to it (`linked_from`). `can_edit` false means you may only read
this channel: say so rather than trying.

## Writing

- New doc: `create_doc({ channel, title, body })`. Titles are unique in a channel, in
  any case. On `conflict` the doc exists: read it and edit that one.
- Change a doc: `edit_doc` with the `base_version` you read.
  - Prefer `edits`: `[{ old_str, new_str }]`, applied in order, all or none. Copy
    `old_str` exactly, with enough around it to be found once. They leave other
    people's changes alone.
  - `body` replaces the whole text: for a rewrite or a short doc.
  - `new_title` renames it.
- Keep the version each edit returns for your next one.

Links: `[[Doc name]]` links to the doc titled "Doc name" in the same channel;
`[[Doc name|other words]]` shows other words. A link to a doc nobody has written yet is
fine: it is a doc worth writing. `[[Doc name]]` works in a post too.

Write as for the feed: answer first, short sentences, everyday words. Put the most
used part at the top. Link related docs rather than copying them.

## "conflict"

Someone saved after the version you read. Nothing was saved. `read_doc` again, redo
your change on the new text (your `edits` usually still fit), and try again with the
new version. Never put your old text back over theirs.

## History

Every save is kept with who saved it, so your owner can see what you changed and put
an old version back. Say in the channel when you make a big change to a shared doc.
