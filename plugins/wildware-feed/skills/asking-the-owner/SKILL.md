---
name: asking-the-owner
description: Use when you need something only the owner can give on Wildware Feed - a missing value, permission for something risky or irreversible, a choice between options, or approval of a draft before it is sent - and when request_input or await_request comes back pending, timeout or cancelled.
---

# Asking the owner

Never guess, never stop with an unanswered question in your last message, and never do
the safe half and call it done. Ask with `request_input`. It pins the question to the
top of their screen and their phone.

## Need it now, or can it wait?

`request_input` is for when you are **blocked and need the answer now**. A to-do for a
person that can wait is a card assigned to them instead, so it sits on their board and
you carry on:

```
post_update({
  channel: "ios", title: "Approve the TestFlight build",
  body: "Build 42 is in TestFlight. Approve it when you have tried it.",
  status: "todo", assignees: ["Sam"]
})
```

Approve a build, add a DNS record, review some copy: cards. Then do other work. When they
mark it done, a line in its thread tells you ("marked this done"), wherever you are; pick
up what was waiting on it then. See marking-work.

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
what you found and what happens next. Pass `channel`, or `message_id` to ask inside the
thread it came from. Add `media_ids` or `option_media` when the question is about a
picture.

## A draft goes in a form

Anything you will send on their behalf (a Slack post, an email, a commit message, a PR
body) is a `form`, so they can fix the words and decide in one step:

```
request_input({
  kind: "form", channel: "api",
  question: "Send this to #eng?",
  label: "Message", multiline: true,
  default: "Heads up: the public API moves to v2 on Monday.",
  options: ["Send", "Reject"]
})
```

Use `value.text`, never your own draft: they may have rewritten it. `"Reject"` means
send nothing.

## Point at what you already posted

To ask about something on another card, show that card inside the question with `refs`
rather than posting it twice. Each ref is `{ kind, id }`: kind `update`, `message` or
`request`, and the id the tool that made it returned. Up to 8.

```
r = post_message({ update_id, body: "Here it is running.", media_ids: [video] })
request_input({
  kind: "confirm", channel: "web",
  question: "Does the new login flow look right?",
  refs: [{ kind: "message", id: r.message.id }]
})
```

Your owner sees the reply small inside the question, video and all, and a tap opens its
thread. `post_message`, `post_update` and the `edit_*` tools take `refs` too; an edit's
list replaces the old one. A card you cannot read, or one already removed, is refused.

## The wait loop

```
r = request_input({...})
while (r.state === "pending") r = await_request({ request_id: r.request_id })
```

`pending` only means nobody has decided yet. Keep looping; each call waits about a
minute. Stop on `answered`, `timeout` or `cancelled`. On a team, an answer also says who
gave it: `answered_by: { user_id, name }`. The request survives your restart:
call `await_request` with the id again.

If they reply to the question instead of answering it, answer with
`post_message({ request_id, body })` and keep waiting.

## Timeout and cancelled are not yes

Neither is permission. Do not do the thing. Say plainly that it did not happen and why,
then carry on with something else or stop.

## Keeping the question true

- `edit_request` fixes a pending question or draft without losing what they typed.
- `withdraw_request` takes it down the moment it stops mattering.

## With the Claude Code plugin: prompts reach the dashboard too

The plugin sends your permission prompts and `AskUserQuestion` to your owner's dashboard
as well as the terminal, so they can answer from their phone. The first answer counts,
from either place. You do nothing different:

- Do not repeat an `AskUserQuestion` with `request_input`: it is already on their screen.
- A denial that says "Your owner refused this on the Wildware Feed dashboard" is their no.
  Do not try the same thing another way; ask with `request_input` if you still need it.
- Refused tool calls are listed for them on a low-priority card on their own. Do not post
  about each one.

The owner turns this off with the plugin's `prompts` setting.

## Priority

`high` reaches their phone. `critical` rings through Do Not Disturb: only when the owner
has told you, in so many words, to use critical for this.
