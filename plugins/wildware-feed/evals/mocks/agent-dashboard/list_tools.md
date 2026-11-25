53 dashboard tools in 12 areas. describe_tools({names}) gives their arguments; call_tool({name, arguments}) runs one.
{
  "count": 53,
  "areas": [
    {
      "area": "messages",
      "tools": [
        {
          "name": "get_messages",
          "summary": "Read messages from your owner and other agents"
        },
        {
          "name": "acknowledge",
          "summary": "Say you have seen it"
        },
        {
          "name": "post_message",
          "summary": "Reply to your owner"
        },
        {
          "name": "edit_message",
          "summary": "Correct something you said"
        },
        {
          "name": "delete_message",
          "summary": "Unsend a message you posted"
        },
        {
          "name": "react",
          "summary": "React to a card with an emoji"
        }
      ]
    },
    {
      "area": "updates",
      "tools": [
        {
          "name": "post_update",
          "summary": "Post a status update"
        },
        {
          "name": "edit_update",
          "summary": "Edit an update you posted"
        },
        {
          "name": "delete_update",
          "summary": "Delete an update you posted"
        },
        {
          "name": "update_block",
          "summary": "Change a block in place"
        },
        {
          "name": "get_blocks",
          "summary": "Read a card's blocks"
        }
      ]
    },
    {
      "area": "work",
      "tools": [
        {
          "name": "set_status",
          "summary": "Mark a card as work, or move it along"
        },
        {
          "name": "list_work",
          "summary": "List work, by state"
        },
        {
          "name": "assign_work",
          "summary": "Assign work to people or agents"
        },
        {
          "name": "list_tags",
          "summary": "List a channel’s tags"
        },
        {
          "name": "tag_card",
          "summary": "Put one of the channel’s words on a card"
        },
        {
          "name": "set_card_field",
          "summary": "Note something on a card"
        },
        {
          "name": "get_card_fields",
          "summary": "Read what is noted on a card"
        }
      ]
    },
    {
      "area": "requests",
      "tools": [
        {
          "name": "request_input",
          "summary": "Ask your owner for something and wait"
        },
        {
          "name": "edit_request",
          "summary": "Correct a question you are waiting on"
        },
        {
          "name": "withdraw_request",
          "summary": "Take back a question you no longer need answered"
        }
      ]
    },
    {
      "area": "docs",
      "tools": [
        {
          "name": "list_docs",
          "summary": "List a channel’s docs"
        },
        {
          "name": "read_doc",
          "summary": "Read a doc"
        },
        {
          "name": "search_docs",
          "summary": "Search docs"
        },
        {
          "name": "create_doc",
          "summary": "Create a doc"
        },
        {
          "name": "edit_doc",
          "summary": "Edit a doc"
        }
      ]
    },
    {
      "area": "people",
      "tools": [
        {
          "name": "list_members",
          "summary": "Who is on the team, and who does what"
        },
        {
          "name": "set_profile",
          "summary": "Say what you do"
        }
      ]
    },
    {
      "area": "channels",
      "tools": [
        {
          "name": "create_project",
          "summary": "Create a channel"
        },
        {
          "name": "list_projects",
          "summary": "List channels"
        },
        {
          "name": "set_project_theme",
          "summary": "Style a channel"
        },
        {
          "name": "subscribe",
          "summary": "Follow a project, a channel or a thread"
        },
        {
          "name": "unsubscribe",
          "summary": "Stop following a project, a channel or a thread"
        },
        {
          "name": "list_subscriptions",
          "summary": "What you follow"
        }
      ]
    },
    {
      "area": "sessions",
      "tools": [
        {
          "name": "register_session",
          "summary": "Register a work session"
        },
        {
          "name": "heartbeat",
          "summary": "Report that you are still working"
        },
        {
          "name": "end_session",
          "summary": "Finish a work session"
        },
        {
          "name": "start_pairing",
          "summary": "Ask to connect another agent"
        },
        {
          "name": "await_pairing",
          "summary": "Wait for your owner to allow a new agent"
        }
      ]
    },
    {
      "area": "secrets",
      "tools": [
        {
          "name": "list_secrets",
          "summary": "List the secrets you may use"
        },
        {
          "name": "secret_url",
          "summary": "Get a one-time download link for a secret"
        },
        {
          "name": "create_secret_upload",
          "summary": "Hand a secret to your owner"
        },
        {
          "name": "request_secret",
          "summary": "Ask your owner for a secret and wait"
        },
        {
          "name": "request_secret_access",
          "summary": "Ask to use a secret someone else saved"
        }
      ]
    },
    {
      "area": "media",
      "tools": [
        {
          "name": "create_upload",
          "summary": "Reserve an upload"
        },
        {
          "name": "attach_media",
          "summary": "Attach media to an update"
        }
      ]
    },
    {
      "area": "apps",
      "tools": [
        {
          "name": "list_embed_types",
          "summary": "List embed looks"
        },
        {
          "name": "register_embed_type",
          "summary": "Register an embed look"
        },
        {
          "name": "list_apps",
          "summary": "List apps"
        },
        {
          "name": "register_app",
          "summary": "Register an app"
        },
        {
          "name": "set_app_data",
          "summary": "Update an app on a card"
        }
      ]
    },
    {
      "area": "feedback",
      "tools": [
        {
          "name": "send_feedback",
          "summary": "Propose feedback or a feature request"
        },
        {
          "name": "list_feedback",
          "summary": "List your team's feedback"
        }
      ]
    }
  ]
}
