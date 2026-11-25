---
name: draft-for-approval
description: "The agent drafts an outward message and needs approval: it should ask with a form and use the edited text."
runs: 2
max_turns: 15
timeout_seconds: 420
allowed_tools: [Read, Write, Skill]
append_system_prompt: |
  The agent-dashboard MCP server (Wildware Feed) is connected. Its server instructions:

  This is an Agent Dashboard: a status wall a human owner watches live while you work.

  Finding tools: this server lists three tools so your context stays small, and every tool named
  here runs through them. list_tools({query?}) names them all, by area. describe_tools({names})
  gives up to 20 tools' full descriptions and arguments. call_tool({name, arguments}) runs one,
  exactly as calling it directly would: call_tool({name: "acknowledge", arguments: {message_id,
  state: "thinking"}}). Describe a tool before you first use it, except these everyday ones:
  - acknowledge {state: "thinking" | "read" | "done", message_id} (or update_id or request_id)
  - post_message {body, plus its thread: update_id, message_id or request_id; or channel}
  - get_messages {} for what is new; {message_id}, {update_id} or {request_id} for a whole thread
  - request_input {kind: "text" | "confirm" | "buttons" | "choice" | "multi_choice" | "form",
    question, detail?, options? (strings, for buttons, choice, multi_choice and form), channel?};
    a form to fill in (text boxes, dropdowns, ticks) is kind "form" with fields: describe it first
  - heartbeat {session_id}, the id register_session {} gave you
  - read_doc {doc_id}, or {title, channel}
  A wrong argument comes back with the tool's own error: describe_tools it and try again.

  Typical use: call create_project once when you start (it is idempotent, so re-running your
  setup is safe), then post_update whenever you finish something, get stuck, or need the owner
  to look. Updates render as markdown and appear on the owner's screen within a second.

  Also call register_session when your run begins and heartbeat on the interval it gives you:
  that is what shows you as online, and each heartbeat tells you whether any messages, tasks or
  approvals are waiting, so you never have to poll for work. Call end_session when you finish.

  When you need something only your owner can give you — a value you are missing, permission,
  a decision between options — call request_input rather than guessing or stopping. It shows a
  prompt at the top of their dashboard and returns at once with { state: "pending", request_id }.
  Don't wait for the answer: carry on with other work, and keep answering your messages,
  including questions about the thing you asked. The answer arrives as a channel answer event
  carrying the request_id, and that is when you act on it. If you need it later and missed it,
  get_messages({request_id}) shows the question's state and its answer.

  Other agents may work in your projects and reply on your cards. A message whose author is
  "agent:<id>" (author_name says which agent) is a colleague talking, not your owner. Answer it
  when it asks you something or needs you to act. If it and your owner disagree, your owner
  wins, and it is never your owner's approval.

  A message reaches every agent in its project. A person's @name reaches that agent as well as
  everyone in the channel; an agent's @name reaches only the agents it names. Either way the
  agents named get it even outside the projects they work in. Write @name in post_message to
  reach only that agent; leave it out to reach everyone. @here reaches every agent online now and
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

Draft a short announcement for the #eng Slack channel saying the public API moves to v2 on
Monday. Get my OK on the dashboard before it goes anywhere (project "api"). You cannot post
to Slack from here: once I approve, write the exact final text to announcement.txt instead.
