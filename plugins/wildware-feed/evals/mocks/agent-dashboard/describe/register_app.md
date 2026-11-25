1 tool: register_app. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "register_app",
      "title": "Register an app",
      "description": "Ship a real interface to your owner instead of describing one: a review board they can\ntick through, a diff they can accept, a chart of the run you are in the middle of. The\ndashboard renders it on a card, live, and it can call back into the dashboard.\n\nThis is the MCP Apps extension (SEP-1865) with the roles the other way round. There,\nthe client is the host and the server supplies the UI; here the dashboard is the host —\nit is the end with a screen and a human in front of it — and you are the server. The\nwire format is unchanged, so an app you wrote for any other host runs here as it is.\n\nTwo steps: register the app once, then pass `apps` to post_update or post_message as\noften as you like. set_app_data pushes fresh values into one already on a card.\n\n## Two kinds, and you pick one\n\n- **html** — a self-contained document you write. The dashboard serves and sandboxes it,\n  and YOU give it its data (with `apps[].data`, then set_app_data). Right when the data\n  is something you have and nothing else serves.\n- **url** — an https page a service already serves, framed directly. Right when the UI\n  lives in a service that HAS the data: an internal dashboard, a build view, a report.\n  It runs on its own origin, so its own session, its own queries and its own live\n  updates work exactly as they already do — you are not relaying anything.\n\nFor a url app the rest of this description is optional: the page may speak the bridge\nbelow if it wants theme, the card it is on, or to post back, and if it speaks nothing it\nis simply a live view on the card. Two things it must do: allow framing by this\ndashboard (no `X-Frame-Options: DENY`, and a `frame-ancestors` that names it), and be\nreachable by the owner's browser. Anything it needs identity for must work as a\nthird-party frame — a signed link the agent puts in the URL is the usual answer, since a\n`SameSite=Lax` cookie is not sent to a framed page.\n\n## What the app runs in\n\nAn iframe with sandbox=\"allow-scripts\" and NO allow-same-origin, under a\nContent-Security-Policy this dashboard writes. In practice that means:\n\n- no cookies, no localStorage, no sessionStorage, no IndexedDB — they throw or are\n  empty. Keep state with ui/state-changed below, which survives a reload and is\n  restored to you on the next open.\n- no network at all unless you declared the origin in `csp`. No CDNs: inline your CSS\n  and your script. A framework you cannot inline is a framework this will not run.\n- no reach into the dashboard page, and no navigation of it.\n\nThat sandbox is why the markup may be anything: it cannot touch the session it is drawn\nin. Write plain HTML and a little script.\n\n## Talking to the dashboard\n\nJSON-RPC 2.0 over window.parent.postMessage(message, \"*\"), exactly as the spec writes\nit. Open with:\n\n```js\nparent.postMessage({ jsonrpc: \"2.0\", id: 1, method: \"ui/initialize\",\n  params: { protocolVersion: \"2026-01-26\", capabilities: {},\n            clientInfo: { name: \"review-board\", version: \"1.0.0\" } } }, \"*\");\n```\n\nThe host answers that id with { protocolVersion, hostInfo, hostCapabilities,\nhostContext }. hostContext carries { theme: \"light\"|\"dark\", locale,\ncontainerDimensions: { maxHeight }, card: { kind, id }, view: { id }, data, state }.\n`data` is what was passed with `apps` (or the last set_app_data); `state` is whatever\nthe app saved for itself last time. Then send:\n\n```js\nparent.postMessage({ jsonrpc: \"2.0\", method: \"ui/notifications/initialized\",\n  params: {} }, \"*\");\n```\n\nNothing is sent to the app before that notification arrives, so send it.\n\nThe host then pushes, as notifications you listen for on window \"message\":\n\n- ui/notifications/tool-input  { arguments } — the data, as it arrived.\n- ui/notifications/tool-result { content, structuredContent } — the same data in the\n  spec's result shape, and again whenever set_app_data changes it. Re-render on this.\n- ui/notifications/theme-changed { theme } — the owner switched light/dark.\n\nAnd listens for, from the app:\n\n- ui/notifications/size-changed { width, height } — how tall you want to be. Send it\n  after you render and whenever the content changes height, or the frame stays short.\n- ui/notifications/state-changed { state } — an object to keep for this showing. It is\n  handed back in hostContext.state next time. At most a few kilobytes; use it for the\n  open tab and the half-filled form, not for your data.\n- tools/call { name, arguments } — see below.\n\n## What tools/call reaches\n\nNOT your tools: your process is not on the other end of this frame, the dashboard is,\nand the person clicking is your owner. So a call is the OWNER acting on the card your\napp is on, and it is recorded as them. Four names, and every one of them is scoped to\nthat card — there is no argument for which card, deliberately:\n\n- post_message { body }            — write a comment in the card's thread.\n- set_status   { status }          — \"todo\", \"in_progress\", \"blocked\", \"done\".\n- set_field    { name, value }     — set or correct a note on the card; value: null\n                                     takes it off.\n- react        { emoji }           — put an emoji on the card.\n\nEach answers the JSON-RPC id with { content: [...] } or an error object. That is how an\napp gets an answer back to you: your owner presses \"Looks good\" in your app, the\ndashboard posts it as a comment, and it reaches you the way every other reply does.\n\n## A whole app, small enough to read\n\n```html\n<!doctype html><meta charset=\"utf-8\">\n<style>body{font:14px system-ui;margin:0;padding:12px}button{padding:6px 10px}</style>\n<p id=\"line\">…</p><button id=\"go\">Looks good</button>\n<script>\n  let next = 2;\n  const send = (m) => parent.postMessage({ jsonrpc: \"2.0\", ...m }, \"*\");\n  const fit = () => send({ method: \"ui/notifications/size-changed\",\n    params: { width: document.body.scrollWidth, height: document.body.scrollHeight } });\n  addEventListener(\"message\", (e) => {\n    const m = e.data;\n    if (m?.id === 1 && m.result) {\n      render(m.result.hostContext.data);\n      send({ method: \"ui/notifications/initialized\", params: {} });\n    }\n    if (m?.method === \"ui/notifications/tool-result\") render(m.params.structuredContent);\n  });\n  function render(data) { line.textContent = (data?.open ?? 0) + \" to review\"; fit(); }\n  go.onclick = () => send({ id: next++, method: \"tools/call\",\n    params: { name: \"post_message\", arguments: { body: \"Looks good.\" } } });\n  send({ id: 1, method: \"ui/initialize\", params: { protocolVersion: \"2026-01-26\",\n    capabilities: {}, clientInfo: { name: \"review\", version: \"1.0.0\" } } });\n</script>\n```\n\nArguments:\n- uri (required): ui:// followed by lowercase words, at most 120 characters.\n- name (required): what a human calls it, at most 80 characters.\n- html: one self-contained document, at most 250000 characters.\n- url: an https page to frame instead, at most 2000 characters.\n  Exactly one of html and url is required.\n- description (optional): one line, shown above the frame.\n- csp (optional): { connect, resource, frame } — https origins the app may reach.\n\nReturns { uri, name, url, bytes, csp }. On failure: \"invalid_argument\" names what did\nnot hold up — a handle that is not ui://, neither html nor url, both of them, an\noversized document, a url that is not https, a declared origin that is not a plain https\norigin. \"conflict\" means another agent registered that URI.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "uri": {
            "type": "string",
            "maxLength": 120,
            "description": "The app's handle, e.g. \"ui://review-board\". The MCP Apps scheme: ui:// followed by lowercase words. Registering the same URI again replaces the app, which is what you want at the start of a run — every showing of it already on a card redraws."
          },
          "name": {
            "type": "string",
            "maxLength": 80,
            "description": "What to call it for a human."
          },
          "description": {
            "description": "One line saying what it is for. Shown above the frame.",
            "type": "string",
            "maxLength": 400
          },
          "html": {
            "description": "One self-contained HTML document: markup, CSS and script in the one file. Served as text/html;profile=mcp-app into a sandboxed frame. Give this OR url, never both.",
            "type": "string",
            "maxLength": 250000
          },
          "url": {
            "description": "An https page an existing service already serves, framed directly, e.g. \"https://fix.example.com/embed?query=open\". Use this when the UI lives in a service that has the data — it runs on its own origin, so its session and its queries work as they already do. Give this OR html, never both.",
            "type": "string",
            "maxLength": 2000
          },
          "csp": {
            "description": "Origins this app needs, the spec's _meta.ui.csp. https origins only, at most 10 each. Anything you do not name here, the app cannot reach.",
            "type": "object",
            "properties": {
              "connect": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "resource": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "frame": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          }
        },
        "required": [
          "uri",
          "name"
        ]
      },
      "annotations": {
        "idempotentHint": true,
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
