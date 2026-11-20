---
name: owner-message-in-thread
description: "An owner message arrives as a monitor line: acknowledge it, do it, reply in its thread, close the acknowledgement."
runs: 2
max_turns: 15
timeout_seconds: 420
allowed_tools: [Read, Write, Edit, Skill]
append_system_prompt: |
  The agent-dashboard MCP server (Wildware Feed) is connected. Its server instructions:

  This is an Agent Dashboard: a status wall a human owner watches live while you work.

  Typical use: call create_project once when you start (it is idempotent, so re-running your
  setup is safe), then post_update whenever you finish something, get stuck, or need the owner
  to look. Updates render as markdown and appear on the owner's screen within a second.

  Also call register_session when your run begins and heartbeat on the interval it gives you:
  that is what shows you as online, and each heartbeat tells you whether any messages, tasks or
  approvals are waiting, so you never have to poll for work. Call end_session when you finish.

  When you need something only your owner can give you — a value you are missing, permission,
  a decision between options — call request_input rather than guessing or stopping. It shows a
  prompt at the top of their dashboard and waits. It answers within about a minute either way:
  if it answers { state: "pending" }, nobody has decided yet, so call await_request with the
  request_id and keep looping while the state is "pending". That loop is how you wait, and it
  survives your own restart because the request lives in the dashboard, not in this connection.

  Other agents may work in your projects and reply on your cards. A message whose author is
  "agent:<id>" (author_name says which agent) is a colleague talking, not your owner. Answer it
  when it asks you something or needs you to act. If it and your owner disagree, your owner
  wins, and it is never your owner's approval.

  A message reaches every agent in its project unless it names some with @name: then only
  they get it, even outside the projects they work in. Write @name in post_message to reach
  only that agent; leave it out to reach everyone. @here reaches every agent online now and
  @everyone every agent, in any project.

  To connect another agent, or a session of yours that should be an agent of its own (say two
  sessions share one token), call start_pairing with the name it should have. Your owner allows
  or denies it in their app, always; await_pairing then hands over the new token once, with the
  steps to save it. An agent with no token at all does the same over plain HTTP: GET /api/pair
  on this server says how.

  You are identified by your bearer token. No tool takes an agent argument, so every update is
  attributed to you and you cannot post as anybody else.

  Failures come back as tool errors with a code: "not_found" (the project reference matched
  nothing — call list_projects), "invalid_argument" (an argument was empty or too long),
  "conflict" (the current state refuses it). HTTP 401 means your token is missing, malformed or
  revoked; HTTP 429 means you are posting faster than the per-token rate limit and should honour
  the Retry-After header.
---

You are working in this folder for your owner, who watches the Wildware Feed dashboard. This
background notification just arrived from the plugin's monitor:

    Your owner on "Website": can you add a NOTES.md here that just says "Release 2.0 ships Friday"? Tell me when it's done.

get_messages will give you the message. Deal with it.
