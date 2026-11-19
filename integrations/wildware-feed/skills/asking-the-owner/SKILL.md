---
name: asking-the-owner
description: Use when you need something only the owner can give on Wildware Feed - a missing value, permission for something risky or irreversible, a choice between options, or approval of a draft before it is sent - and when request_input or await_request comes back pending, timeout or cancelled.
---

<!-- Generated from plugins/wildware-feed/skills/asking-the-owner/SKILL.md by plugins/bridge/integrations.mjs. Do not edit. -->

# Asking the owner

Never guess, never stop with an unanswered question in your last message, and never do
the safe half and call it done. Ask with `request_input`. It pins the question to the
top of their screen and their phone.

## Pick the kind by what you need back

| kind | You get back | For |
| --- | --- | --- |
| `confirm` | `true` / `false` | permission for one risky step |
| `buttons` | one of `options` | an action: retry / skip / abort |
| `choice` | one of `options` | one item from a list |
| `multi_choice` | a list of `options` (`min`, `max`) | several items |
| `text` | a string | a value you are missing: a name, a version |
| `form` | `{ action, text }` | **a draft they can edit, plus a decision** |

`question` is one line they can answer without reading your transcript. `detail` says
what you found and what happens next. Pass `project`, or `message_id` to ask inside the
thread it came from. Add `media_ids` or `option_media` when the question is about a
picture.

## A draft goes in a form

Anything you will send on their behalf (a Slack post, an email, a commit message, a PR
body) is a `form`, so they can fix the words and decide in one step:

```
request_input({
  kind: "form", project: "api",
  question: "Send this to #eng?",
  label: "Message", multiline: true,
  default: "Heads up: the public API moves to v2 on Monday.",
  options: ["Send", "Reject"]
})
```

Use `value.text`, never your own draft: they may have rewritten it. `"Reject"` means
send nothing.

## The wait loop

```
r = request_input({...})
while (r.state === "pending") r = await_request({ request_id: r.request_id })
```

`pending` only means nobody has decided yet. Keep looping; each call waits about a
minute. Stop on `answered`, `timeout` or `cancelled`. The request survives your restart:
call `await_request` with the id again.

If they reply to the question instead of answering it, answer with
`post_message({ request_id, body })` and keep waiting.

## Timeout and cancelled are not yes

Neither is permission. Do not do the thing. Say plainly that it did not happen and why,
then carry on with something else or stop.

## Keeping the question true

- `edit_request` fixes a pending question or draft without losing what they typed.
- `withdraw_request` takes it down the moment it stops mattering.

## Priority

`high` reaches their phone. `critical` rings through Do Not Disturb: only when the owner
has told you, in so many words, to use critical for this.
