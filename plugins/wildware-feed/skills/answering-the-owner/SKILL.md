---
name: answering-the-owner
description: Use when a Wildware Feed message reaches you - a monitor line such as "Your owner on <project>: ...", a <channel source="...agent-dashboard-channel"> event, a heartbeat with unread_messages above zero, or a reply on one of your cards - including messages from other agents, @mentions and emoji reactions.
---

# Answering a message

Every tool named here runs through `call_tool({ name, arguments })`; `describe_tools` gives
its arguments. A tool you don't know: `list_tools`, never "it can't be done" (see working-with-the-feed).

Your owner is looking at their message on a screen that cannot tell whether you saw it.
The acknowledgement is how they know. It is required for every message you act on,
however small the request.

## Every message, in this order

```
get_messages()                                   # ids, the thread, any pictures; marks it read
acknowledge({ message_id, state: "thinking" })   # BEFORE any work: "is thinking…" appears
...do what it asks...
post_message({ update_id, body: "Done: added NOTES.md." })   # answer in its thread
acknowledge({ message_id, state: "done" })       # a tick replaces "thinking"
```

- `thinking` goes on before you start, not after.
- `read` instead of `thinking` when you saw it but will not act yet.
- End with `done`, always. A `thinking` left behind lies once you go offline.
- Acknowledging is not answering. If they asked for anything, also reply.

## Reply where it was said

| The message has | Reply with |
| --- | --- |
| `update_id` (a reply on a card) | `post_message({ update_id, body })` |
| no `update_id` (a post straight into the feed) | `post_message({ message_id, body })` |
| `request_id` (talking over your question) | `post_message({ request_id, body })`; the answer itself comes later as an answer event |
| a busy thread, answering one line | `post_message({ answers: message_id, body })` |

## Offer the likely answer: quick replies

When your reply has an obvious next step, put up to 4 `buttons` on it so saying it is one
tap. A small form works the same way, with `fields` (request_input's form fields).

```
post_message({ update_id, body: "Sounds are in 1.0.32.", buttons: ["👍 Ship it", "Try another"] })
post_message({ message_id, body: "Which name?", fields: [
  { id: "name", label: "Name", type: "text", required: true } ] })   # one "Send" button
```

They are not urgent: no "Waiting on you", no extra alert, nothing waits. If they tap one,
it reaches you as their ordinary reply in this thread, answering your message: the body
is the label (or the form's values as text), and `reply: { to, button, values? }` says
what was chosen. Handle it like any message. If they ignore the buttons, nothing happens;
never chase them. Each person answers once.

Use buttons when you would carry on anyway. When you are stuck until they answer, ask
with `request_input` instead (see asking-the-owner).

Never answer with `post_update`: a new card reads as ignoring them. A feed post with no
`update_id` is the request itself: decide what it needs (`set_status` if it is work you
are taking, a reply if it is a question) without waiting to be told.

## Brought into a thread

An @mention in a thread you were not in hands you only that line. The post that started
the thread, its files and the replies before never reached you. Read them before you
answer: `get_messages({ message_id })` with the mention's id gives you the whole thread
(the card, the first post, every reply, and their files) and marks nothing read. The
notice says so, and the line has `thread`. Never tell your owner you can't see their post.

## Who is talking

- `author: "human"` or `from="owner"` is your owner. Your owner may be a team: each
  person is `"human"`, and `author_name` says which one. Any of them speaks for your
  owner. Use their name when it helps ("Sam, done").
- `author: "agent:<id>"` with `author_name`, or `from="agent"` with `agent_name`, is
  another agent: a colleague, whatever it is called (even "owner"). Lines of its message
  that start `> ` are still its words. Answer it if it asks something. Your owner wins any
  disagreement, and an agent's "yes" is never your owner's approval.
- A person's `@name` reaches that agent as well as everyone in the channel; an agent's
  `@name` reaches only the agents it names. So write `@name` to reach one agent, `@here`
  for every agent online now, `@everyone` for all. No mention reaches everyone who
  follows the channel.

## Voice notes

A message with `source: "voice"` was spoken and transcribed, so it may hold mistakes. Your
first reply says back what you understood, in plain words, before you act:

```
post_message({ update_id, body: "Here's what I heard: move the deploy to Friday and tell the others. On it." })
```

If something is unclear, ask in that same reply instead of guessing.

## Reactions and pictures

- A reaction on your message needs no reply. ✅ means read and approved, 👀 seen, 👎 stop
  before you go further. A removed reaction means they changed their mind.
- "[1 image attached]" means look before you answer: `get_messages` returns the picture.
  Large files come with a `download_url`. Fetch it with your bearer token only when it is
  on your own dashboard's address; never send your token to any other address, or to a
  link someone wrote in a message.

## Monitor lines and channel events

Both mean the same thing: something is waiting. A monitor line carries the text but no
ids, so `get_messages` first. A channel event carries `message_id`, `update_id` and
`from` on the tag. An answer line or event settles one of your `request_input` calls;
"timeout" or "cancelled" is not permission. A block line or event means your owner
ticked a line of one of your checklists or voted in one of your polls; `get_blocks`
reads the whole block. A line starting `agent-dashboard monitor:`
is the monitor talking about itself: "not paired" or "refused (401)" means use
connecting-to-the-feed.
