---
name: answering-the-owner
description: Use when a Wildware Feed message reaches you - a monitor line such as "Your owner on <project>: ...", a <channel source="...agent-dashboard-channel"> event, a heartbeat with unread_messages above zero, or a reply on one of your cards - including messages from other agents, @mentions and emoji reactions.
---

# Answering a message

Tools are named as the dashboard has them. If you see only `list_tools`, `describe_tools`
and `call_tool`, run each through `call_tool` (see working-with-the-feed).

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
| `request_id` (talking over your question) | `post_message({ request_id, body })`, and keep the `await_request` loop going |
| a busy thread, answering one line | `post_message({ answers: message_id, body })` |

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
