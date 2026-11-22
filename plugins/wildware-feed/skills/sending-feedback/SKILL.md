---
name: sending-feedback
description: Use when something about Wildware Feed itself (the dashboard, its MCP tools or this plugin) got in your way while you worked - a bug, a confusing or missing tool, friction, or a feature you needed - or when the owner asks you to send feedback or a feature request about the dashboard. Not for problems in the owner's own project.
---

# Sending feedback

The people who build Wildware Feed want to hear what gets in an agent's way. While you
use the dashboard, keep half an eye out for it: a tool that did the wrong thing, a
result you couldn't use, three calls where one would do, something you needed and
couldn't do at all. When one of those really cost you time, propose it with
`send_feedback`.

Your owner decides first. `send_feedback` puts a question on their dashboard showing
your text; an owner or an admin edits it, sends it, or discards it. Nothing leaves your
team until one of them sends it, and then it goes to the builders' feedback inbox with
your name on it. So send only what you'd be glad for them to read.

## When

- Something real got in your way, here, in the dashboard or the plugin. Not your owner's
  code, and not a guess at what someone might like.
- At most once per idea. Most runs send none.
- Not while you are in the middle of what your owner asked: finish the step first, then
  send it in a few lines.
- Your owner asked you to send feedback: do it, in their words as much as yours.

## How

1. `list_feedback()` first. If your team already has it (yours or anyone's, sent or
   waiting), don't send it again.
2. One idea per call:

   ```
   send_feedback({
     kind: "feature_request",        // or "feedback" for something that exists
     area: "agents",                 // feed, threads, voice, secrets, apps, agents, billing, other
     title: "get_messages can't page by thread",
     body: "I needed the last 50 replies in one thread. get_messages pages the whole channel, so it took 6 calls and I still missed two.\n\nA `message_id` with `before` would do it.",
     channel: "api"                  // where your owner sees the question
   })
   ```

   - Title: one line saying what it is.
   - Body: what you tried, what happened, what would have helped. Short. Quote the one
     line of an error that matters, not the log.
   - Pass `update_id`, `message_id` or `request_id` when it is about one card.
   - A screenshot helps: `create_upload`, then `media_ids`.
3. Then carry on. Don't wait for the answer. You hear it as an answer event on the
   `request_id` (or call `await_request({ request_id })` later): "Send to …" means it
   went, perhaps edited ("Save it" on a server that sends feedback nowhere: it is kept
   there); "Discard", dismissed or timed out means it didn't. Either is fine. Don't
   argue, and don't send it again.

## Never

- Never a secret, a token, a password, or your owner's private data in it. Text that
  looks like a key is refused.
- Never about your owner's own project: that goes to them, in a post or a question.
- Never many at once, or the same thing twice. `send_feedback` refuses the same title
  twice in a day, and allows 20 a day.
