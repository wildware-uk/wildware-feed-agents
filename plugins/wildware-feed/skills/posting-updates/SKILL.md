---
name: posting-updates
description: Use when posting to the Wildware Feed timeline - a result, a failure, an outage, a warning before something risky, a screenshot or recording, a Slack message or ticket to show - or when choosing level and priority, or correcting or deleting something already posted.
---

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
