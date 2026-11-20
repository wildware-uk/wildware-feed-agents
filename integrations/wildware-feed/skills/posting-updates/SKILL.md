---
name: posting-updates
description: Use when posting to the Wildware Feed timeline - a result, a failure, an outage, a warning before something risky, a screenshot or recording, a Slack message or ticket to show, a checklist, build steps, a diff, a chart, a table, a log or a poll - or when choosing level and priority, or correcting or deleting something already posted.
---

<!-- Generated from plugins/wildware-feed/skills/posting-updates/SKILL.md by plugins/bridge/integrations.mjs. Do not edit. -->

# Posting an update

A card is for something the owner would be worse off not seeing. Answers to their
messages go in the thread with `post_message`, not here.

```
post_update({
  project: "api",
  title: "API down since 03:00",
  body: "Health check returns 500 for every request. Rolling back the 02:50 deploy now.",
  level: "error", priority: "high",
  session_id
})
```

`body` is markdown. Name the language on code fences. Raw HTML shows as text.

## Level and priority are two questions

| | |
| --- | --- |
| `level` | What happened: `info` progress, `success` finished, `warn` look at this, `error` stuck or broken. |
| `priority` | Can it wait: `low` (noise is fine), `medium` (default), `high` (reaches their phone now). |
| `critical` | Pages them through silent mode and Do Not Disturb, even at night. **Only** if the owner has told you, in so many words, to use critical for this case. An outage you found on your own is `high`. |

An error that can wait until morning is `level: "error", priority: "low"`. That is
correct, not a contradiction.

## Show, don't describe

Screenshots, recordings, logs, any file:

```
create_upload({ filename: "login.png", mime: "image/png", bytes: 48213 }) → { media_id, upload_url }
PUT upload_url   (raw bytes; Content-Type: the image/video/audio mime, else application/octet-stream)
post_update({ ..., media_ids: [media_id] })
```

The PUT must carry a Content-Type or the bytes are dropped. Already posted the card?
`attach_media({ update_id, media_ids })`. Up to 24 per card. `media_ids` work the same
on `post_message` and `request_input`.

To quote a Slack message, GitHub comment or ticket, use `embeds` instead of pasting it;
for a live, clickable interface use `apps`. See reference.md in this folder.

## Blocks: things the app draws and keeps live

`blocks` on `post_update`, `post_message` or `request_input` puts up to 8 typed pieces on
the card. The app draws them natively and changes them in place when you call
`update_block`, so progress is one card that moves, not a new card per step.

| Use | When |
| --- | --- |
| `checklist` | A list of things to get done, some waiting on the owner (`owner: "you"`). They can tick lines. |
| `steps` | A run with stages: build, test, deploy. `state` pending, running, done, failed or skipped. |
| `diff` | A change to look at: `text` is `git diff` output. |
| `chart` | Numbers over time or by category: `kind` line or bar. |
| `table` | Rows to compare. The owner sorts by a column. |
| `log` | Output worth keeping. Folds to `highlight` (the error) and the last `tail` lines. |
| `poll` | A choice for the team. Use `request_input` when you need one answer to go on. |

```
u = post_update({ project: "app", title: "Release 1.0.9", body: "Where it stands.",
  blocks: [
    { id: "ship", type: "checklist", items: [
      { id: "notes", text: "Release notes", owner: "you" },
      { id: "tag", text: "Tag the release" } ] },
    { id: "ci", type: "steps", stages: [
      { id: "build", label: "Build", state: "running" },
      { id: "test", label: "Test" } ] } ] })
update_block({ update_id: u.update.id, block_id: "ci",
  patch: { stages: [{ id: "build", state: "done" }, { id: "test", state: "running" }], progress: 0.5 } })
update_block({ update_id, block_id: "build-log", patch: { append: ["line", "line"] } })
```

A patch merges lists by id (only the fields you give change), `remove: [ids]` drops
some, `append` / `append_rows` / a series' `points` add to the end, and `null` clears a
value. When the owner ticks a line or votes, you are told, as you are of an answer or a
reaction; `get_blocks` reads who ticked and who voted. Every key is checked: a typo
refuses the post, so read the error. Shapes and limits are in the same reference as
embeds and apps.

## Correcting yourself

- `edit_update({ update_id, body?, title?, level?, priority? })` when a card stops being
  true. Demote a priority that stopped mattering. New progress is a new card or a reply,
  not an edit.
- `edit_message({ message_id, body })` for a reply that was wrong. Better than "ignore
  that".
- `delete_message({ message_id })` only for noise: a duplicate or a half-sent line. If
  they may have acted on it, correct it instead.

## Facts and labels

- `set_card_field({ update_id, name: "branch", value: "fix/fees" })` for facts the next
  person needs (branch, PR link, environment). Hidden under Details.
- `list_tags({ project })` then `tag_card({ update_id, tag })`. Reuse the project's
  words; `create: true` only when none fits.
- `set_project_theme` once, for a new project, if a colour helps them find it.
