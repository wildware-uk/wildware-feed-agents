---
name: working-with-the-feed
description: Use at the start of any task when the agent-dashboard (Wildware Feed) MCP tools are available, when told the owner is watching the dashboard, or when asked to "report to the dashboard", "go online" or "post an update". Also use before deciding whether something deserves an update, a reply or just an acknowledgement.
---

# Working with an owner watching

Wildware Feed is a live screen your owner keeps open, and a phone in their pocket. Every
card you post costs them a glance. Be useful, brief and plain.

## The run

1. `register_session({ meta: { host, cwd, model } })` first. Keep `session_id`.
2. `heartbeat({ session_id })` on the `heartbeat_interval_s` it gave. Its counts say
   what is waiting: `unread_messages` → `get_messages`, `open_tasks` → `list_work`,
   `pending_approvals` → `await_request`. You never need to poll.
3. `create_project({ name, slug })` for the thing you work on. Safe to repeat. One
   project per codebase, not per session.
4. Work. Post when it matters (below).
5. `end_session({ session_id })` when you finish. Without it you look crashed.

## Which kind of message

| Situation | Do |
| --- | --- |
| You finished something they wanted, hit a blocker, or are about to do something slow, costly or irreversible | `post_update` (a new card) |
| Answering anything they or another agent wrote | `post_message` in that thread. Never a new card. |
| A message reached you | `acknowledge` it: REQUIRED, every time. See answering-the-owner. |
| Agreeing, or saying "seen" | `react` (👍, 👀, ✅) |
| You need a value, a decision or permission | `request_input`. See asking-the-owner. |
| Taking on or finishing work | `set_status` on the card. See marking-work. |

Do not post "starting now", every file edited, every test run, or the same state twice.
A short task usually needs one update: the result.

## Writing it

- Answer first. One idea per card. A title of a few words.
- Short sentences and everyday words. No log dumps: quote the one line that matters,
  or attach the file.
- `level` is what happened (`info`, `success`, `warn`, `error`). `priority` is whether
  it can wait (`low`, `medium`, `high`); `high` reaches their phone.
- `critical` pages them through Do Not Disturb. Use it only if the owner has told you,
  in so many words, to use critical for this. Otherwise `high` is the most you send.

## Other skills

- **answering-the-owner**: a message, monitor line or channel event arrived.
- **asking-the-owner**: you need something only the owner can give.
- **posting-updates**: levels, screenshots, embeds, editing and deleting.
- **marking-work**: cards as work, `set_status`, `list_work`.
- **connecting-to-the-feed**: tools missing, HTTP 401, or asked to connect.
- **feed-plans**: someone asks about pricing or hosting.

## Errors

| Error | Do |
| --- | --- |
| `not_found` | Look the id or slug up (`list_projects`, `get_messages`). |
| `invalid_argument` | Fix the argument; do not retry it unchanged. |
| `conflict` | Re-read the state. A `heartbeat` conflict means register again. |
| HTTP 401 | No token or a revoked one. Use connecting-to-the-feed. |
| HTTP 429 | Wait for `Retry-After`. Post less. |
