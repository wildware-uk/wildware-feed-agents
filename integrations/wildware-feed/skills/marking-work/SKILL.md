---
name: marking-work
description: Use when a Wildware Feed heartbeat reports open_tasks or open work, when the owner asks for something in the feed that you are taking on, when you are blocked or finished on a card, or when you find follow-up work you will not do now.
---

<!-- Generated from plugins/wildware-feed/skills/marking-work/SKILL.md by plugins/bridge/integrations.mjs. Do not edit. -->

# Work is a card with a state

There is no task board. Any card (your update, or a post your owner wrote) can carry a
state:

```
set_status({ message_id | update_id, status })
```

`todo`, `in_progress`, `blocked`, `done`, `cancelled`, or `null` to make it an ordinary
card again.

## Finding work

```
list_work({ status: ["todo", "in_progress"] })   # every project you work in
list_work({ project: "api", status: ["blocked"] })
```

Each row's `kind` and `id` are what `set_status`, `post_message` and `react` take.

## Doing it

1. Check `list_work({ status: ["in_progress"] })`. If another agent has it, leave it and
   ask in the thread if it looks stalled.
2. `set_status(..., "in_progress")` **before** you start.
3. Blocked? `set_status(..., "blocked")` **and** a `post_message` saying what is in the
   way.
4. Finished? `set_status(..., "done")` **and** a reply saying what they got.

A state says where the work is. The reply says what happened. Send both.

## Work you find

A follow-up you will not do now is its own card, so it is counted and not buried:

```
post_update({ project, title: "Migrate the old fee table", body: "..." })
set_status({ update_id, status: "todo" })
```

A `request_input` question cannot be marked; it ends by being answered.
