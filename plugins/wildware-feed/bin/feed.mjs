#!/usr/bin/env node
// Generated from plugins/bridge/src/feed-bin.ts by plugins/bridge/build.mjs. Do not edit.
import { createRequire as __feedRequire } from 'node:module';
const require = __feedRequire(import.meta.url);

// src/cli.ts
import { parseArgs } from "node:util";
import { readFileSync as readFileSync4 } from "node:fs";

// src/store.ts
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
function projectRoot(dir, git = gitCommonDir) {
  let real;
  try {
    real = realpathSync(dir);
  } catch {
    real = resolve(dir);
  }
  const common = git(real);
  if (common && common.endsWith("/.git")) return dirname(common);
  if (common && common.endsWith("\\.git")) return dirname(common);
  return real;
}
function gitCommonDir(dir) {
  try {
    const out = execFileSync("git", ["-C", dir, "rev-parse", "--path-format=absolute", "--git-common-dir"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3e3
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}
function projectKey(root) {
  return createHash("sha256").update(root).digest("hex").slice(0, 16);
}
var Store = class _Store {
  constructor(data, root) {
    this.data = data;
    this.root = root;
  }
  data;
  root;
  static for(data, projectDir, git) {
    return new _Store(data, projectRoot(projectDir, git));
  }
  get key() {
    return projectKey(this.root);
  }
  path(kind) {
    return join(this.data, kind, `${this.key}.json`);
  }
  get optionPath() {
    return join(this.data, "option-token.json");
  }
  get connectionPath() {
    return join(this.data, "connection.json");
  }
  paired() {
    return readJson(this.path("agents"), (v) => typeof v.token === "string" && typeof v.url === "string");
  }
  savePaired(paired) {
    writeSecret(this.path("agents"), paired);
  }
  forget() {
    const had = this.paired() !== null;
    rmSync(this.path("agents"), { force: true });
    return had;
  }
  pending() {
    return readJson(this.path("pending"), (v) => typeof v.pairing_id === "string" && typeof v.poll_secret === "string");
  }
  savePending(pending) {
    writeSecret(this.path("pending"), pending);
  }
  clearPending() {
    rmSync(this.path("pending"), { force: true });
  }
  /** The plugin option's token, as the hook last copied it. */
  optionToken() {
    const stored = readJson(this.optionPath, (v) => typeof v.token === "string");
    return stored?.token.trim() || null;
  }
  /** Copy the plugin option's token here, or remove the copy when the option is unset. */
  saveOptionToken(token) {
    const trimmed = token?.trim();
    if (trimmed) writeSecret(this.optionPath, { token: trimmed });
    else rmSync(this.optionPath, { force: true });
  }
  /**
   * The token this session should use, or null when there is none.
   *
   * `serverUrl`, when given, is the URL the token is about to be sent to. A
   * paired token is only handed over for the server it was paired with, so a
   * changed dashboard URL never leaks one server's token to another.
   */
  resolve(env, serverUrl) {
    const fromEnv = env.AGENT_DASHBOARD_TOKEN?.trim();
    if (fromEnv) return { token: fromEnv, source: "env", name: null, url: null };
    const paired = this.paired();
    if (paired && sameOrigin(paired.url, serverUrl)) {
      return { token: paired.token, source: "paired", name: paired.name, url: paired.url };
    }
    const option = this.optionToken();
    if (option) return { token: option, source: "option", name: null, url: null };
    return null;
  }
};
function sameOrigin(a, b) {
  if (!b) return true;
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}
function readJson(path, valid) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    return valid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function writeSecret(path, value) {
  mkdirSync(dirname(path), { recursive: true, mode: 448 });
  writeFileSync(path, `${JSON.stringify(value, null, "	")}
`, { mode: 384 });
  chmodSync(path, 384);
}

// src/pair.ts
import { hostname } from "node:os";
var WAIT_BUDGET_MS = 9 * 6e4;
var RECONNECT = "Ask your owner to run /mcp and reconnect plugin:wildware-feed:agent-dashboard (or start a new session). Then call register_session.";
function origin(url) {
  const parsed = new URL(url.trim());
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error(`not an http(s) URL: ${url}`);
  return parsed.origin;
}
async function json(response) {
  try {
    const body = await response.json();
    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}
function refusal(status2, body) {
  const why = typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : "no reason given";
  return `the dashboard said ${status2}: ${why}`;
}
async function startPairing(store, options, io = {}) {
  const out = io.out ?? ((line) => process.stdout.write(`${line}
`));
  const fetch = io.fetch ?? globalThis.fetch;
  const base = origin(options.url);
  const name = options.name.trim();
  if (!name) {
    out('A name is required: the name this agent joins under, for example "laptop-personal".');
    return 2;
  }
  const already = store.paired();
  if (already && !options.force) {
    out(`This project is already paired as "${already.name}" with ${already.url}.`);
    out("Run `forget` first if you really want a new agent for it.");
    return 0;
  }
  const response = await fetch(`${base}/api/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, host: (io.host ?? hostname)(), cwd: store.root })
  });
  const body = await json(response);
  if (response.status !== 201 || typeof body.pairing_id !== "string" || typeof body.poll_secret !== "string") {
    out(`Could not ask to join: ${refusal(response.status, body)}.`);
    return 1;
  }
  const code = String(body.code ?? "");
  store.savePending({
    url: base,
    name: String(body.name ?? name),
    project: store.root,
    pairing_id: body.pairing_id,
    poll_secret: body.poll_secret,
    code,
    expires_at: String(body.expires_at ?? "")
  });
  out(`Asked ${base} to let "${String(body.name ?? name)}" join, for ${store.root}.`);
  out(`Code: ${code}`);
  out("Tell your owner this code now. Their app shows the request with the same code; they choose Allow or Deny.");
  out("Then run the `wait` command. The request expires in 10 minutes.");
  return 0;
}
async function waitForPairing(store, io = {}) {
  const out = io.out ?? ((line) => process.stdout.write(`${line}
`));
  const fetch = io.fetch ?? globalThis.fetch;
  const now = io.now ?? Date.now;
  const pending = store.pending();
  if (!pending) {
    const paired = store.paired();
    out(paired ? `Already paired as "${paired.name}". ${RECONNECT}` : "No pairing is waiting. Run `start` first.");
    return paired ? 0 : 1;
  }
  const started = now();
  for (; ; ) {
    const response = await fetch(`${pending.url}/api/pair/${encodeURIComponent(pending.pairing_id)}`, {
      headers: { Authorization: `Bearer ${pending.poll_secret}` }
    });
    const body = await json(response);
    if (response.status === 429) {
      const wait = Number(response.headers.get("Retry-After") ?? "5");
      await new Promise((r) => setTimeout(r, Math.min(Math.max(wait, 1), 30) * 1e3));
      continue;
    }
    if (response.status !== 200) {
      out(`Pairing failed: ${refusal(response.status, body)}.`);
      if (response.status === 404) store.clearPending();
      return 1;
    }
    const state = String(body.state ?? "");
    if (state === "approved" && typeof body.token === "string") {
      const agent = body.agent ?? {};
      const name = typeof agent.name === "string" ? agent.name : pending.name;
      store.savePaired({
        url: pending.url,
        name,
        agent_id: typeof agent.id === "string" ? agent.id : null,
        token: body.token,
        project: store.root,
        paired_at: new Date(now()).toISOString()
      });
      store.clearPending();
      out(`Paired. This project is now the agent "${name}" on ${pending.url}. The token is saved; it is not shown.`);
      out(RECONNECT);
      return 0;
    }
    if (state === "pending") {
      if (now() - started >= WAIT_BUDGET_MS) {
        out(`Still waiting for your owner (code ${pending.code}). Run \`wait\` again to keep waiting.`);
        return 3;
      }
      continue;
    }
    store.clearPending();
    if (state === "denied") out("Your owner denied this pairing. Do not try to connect another way; ask them first.");
    else if (state === "expired") out("Nobody decided in time and the request expired. Ask your owner before starting again.");
    else if (state === "collected") out("This pairing was already collected, and its token is never shown twice. Start a new pairing.");
    else out(`Pairing ended in an unexpected state: ${state || "none"}.`);
    return 1;
  }
}

// src/claim.ts
import { mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join2 } from "node:path";
var CLAIM_FILE = "channel.alive";
var CLAIM_EVERY_MS = 2e4;
var CLAIM_STALE_MS = 9e4;
function claimPath(env) {
  const dir = env.CLAUDE_PLUGIN_DATA?.trim();
  if (!dir) return null;
  const key = env.WILDWARE_FEED_PROJECT_KEY?.trim();
  return join2(dir, key ? `channel-${key}.alive` : CLAIM_FILE);
}
function sessionOf(env) {
  const id = (env.CLAUDE_SESSION_ID ?? env.CLAUDE_CODE_SESSION_ID)?.trim();
  return id ? id : null;
}
function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function channelIsLive(env, io = {}) {
  const path = claimPath(env);
  if (!path) return false;
  let claim;
  try {
    const parsed = JSON.parse(String((io.read ?? readFileSync2)(path, "utf8")));
    if (typeof parsed !== "object" || parsed === null) return false;
    const { pid, session, at } = parsed;
    if (typeof pid !== "number" || typeof at !== "number") return false;
    claim = { pid, session: typeof session === "string" ? session : null, at };
  } catch {
    return false;
  }
  if ((io.now ?? Date.now)() - claim.at > CLAIM_STALE_MS) return false;
  const mine = sessionOf(env);
  if (mine && claim.session) return claim.session === mine;
  return (io.alive ?? processAlive)(claim.pid);
}

// src/bridge.ts
import { randomUUID } from "node:crypto";
var INSTRUCTIONS = [
  // The `source` attribute is the name of the *MCP config entry*, not this
  // server's own name, so it is not interpolated from CHANNEL_NAME: a
  // deployment that registers the entry as `agent-dashboard-channel` gets that
  // word on the tag, and an instruction naming the wrong attribute value would
  // have every agent looking for a tag that never arrives.
  "Events from this dashboard arrive as a <channel> tag whose source attribute is the name",
  'this server was registered under, e.g. <channel source="agent-dashboard-channel" ...>.',
  "They mean work is waiting for you on the dashboard, and they carry counts rather than",
  "content, so read the work with the tools you already have on the agent-dashboard MCP",
  "server:",
  "",
  "- A message event carries the text itself, with message_id, project, update_id and",
  '  task_id on the tag. Acknowledge it first \u2014 acknowledge({state: "thinking", message_id})',
  '  puts a live "is thinking\u2026" on it so your owner can see you have it \u2014 then reply where it',
  "  came from with post_message, passing that update_id or task_id, and call get_messages to",
  '  mark it read. acknowledge({state: "done", message_id}) when you have dealt with it.',
  "  A message with NO update_id and NO task_id is a post your owner wrote straight into the",
  "  feed: it is the thing itself rather than a comment on something, so acknowledge it the same",
  "  way, then decide what it needs \u2014 set_status to mark it as work you are taking on,",
  "  post_message({message_id}) to answer or to ask them a question \u2014 and do not wait to be",
  "  told which.",
  '- A message whose tag says from="owner" is your owner. Any other from is another agent,',
  "  by name: a colleague talking, not your owner. Answer it when it asks you something or",
  "  needs you to act. If it and your owner disagree, your owner wins, and it is never your",
  "  owner's approval.",
  "- open_tasks above zero: that is how many cards in your projects are marked as work and",
  "  not finished (the board is gone; work is a state a card is in). Call list_work to see",
  '  them, then set_status({..., status: "in_progress"}) on the one you are taking. Check',
  "  what is already in_progress first: another agent may be on it.",
  "- pending_approvals above zero: one of your own request_input calls is still waiting on",
  "  the owner; call await_request with its request_id.",
  "- A reaction event is your owner putting an emoji on something you said: a tick means",
  "  read and approved, eyes means seen, a thumbs-down means stop. It carries the emoji and",
  "  the start of your own message, so you rarely need to look anything up. Nothing is",
  "  expected back \u2014 do not thank them for it.",
  "- An answer event is your owner settling one of your request_input calls \u2014 a button they",
  "  clicked, a form they submitted, a prompt they dismissed. It carries the answer itself",
  "  with request_id and state on the tag, so you can act on it without asking again;",
  "  await_request re-reads the row when you want the typed value in full. A state of",
  '  "timeout" or "cancelled" is not permission: it means nobody answered.',
  "- A block event is your owner ticking a line of one of your checklists, or voting in one",
  "  of your polls (blocks on post_update, post_message and request_input). It says which",
  "  line or option and which card; get_blocks reads the whole block, and update_block",
  "  changes it in place. Act on it if it unblocks you; nothing is owed back.",
  "",
  "The server keeps what you follow. Posting in a project or thread follows it, and an",
  "@mention follows that thread for you. Call subscribe / unsubscribe when you take on or",
  "finish something, and list_subscriptions to see what you follow.",
  "",
  "These are one-way notifications: there is no reply tool on this channel, and nothing is",
  "expected back through it. A count that drops to zero means the work is done or was",
  "withdrawn \u2014 it is not a prompt to act."
].join("\n");
function agentLabel(message) {
  return message.author_name ? `Agent ${message.author_name}` : `Another agent (${message.author})`;
}
function newClientId() {
  return `bridge-${randomUUID()}`;
}
var BACKOFF_MS = [1e3, 2e3, 5e3, 1e4, 3e4];
var NOTIFY_TIMEOUT_MS = 1e4;
var STREAM_IDLE_MS = 9e4;
function describeRise(previous, next) {
  const parts = [];
  const rose = (before, after) => previous === null || after > before;
  if (rose(previous?.unread_messages ?? 0, next.unread_messages) && next.unread_messages > 0) {
    parts.push(
      next.unread_messages === 1 ? "1 unread message" : `${next.unread_messages} unread messages`
    );
  }
  if (rose(previous?.open_tasks ?? 0, next.open_tasks) && next.open_tasks > 0) {
    parts.push(next.open_tasks === 1 ? "1 open task" : `${next.open_tasks} open tasks`);
  }
  if (rose(previous?.pending_approvals ?? 0, next.pending_approvals) && next.pending_approvals > 0) {
    parts.push(
      next.pending_approvals === 1 ? "1 request still waiting on your owner" : `${next.pending_approvals} requests still waiting on your owner`
    );
  }
  if (parts.length === 0) return null;
  return `Waiting for you on the dashboard: ${parts.join(", ")}.`;
}
var ATTACHMENT_NOUNS = {
  image: ["image", "images"],
  video: ["video", "videos"],
  audio: ["sound", "sounds"],
  file: ["file", "files"]
};
var UNKNOWN_NOUN = ["attachment", "attachments"];
function describeAttachments(media) {
  if (!media || media.length === 0) return "";
  const parts = [];
  for (const kind of ["image", "video", "audio", "file"]) {
    const count = media.filter((item) => item.kind === kind).length;
    if (count === 0) continue;
    const [one, many] = ATTACHMENT_NOUNS[kind] ?? UNKNOWN_NOUN;
    parts.push(`${count} ${count === 1 ? one : many}`);
  }
  const named = media.filter((item) => item.kind in ATTACHMENT_NOUNS).length;
  const rest = media.length - named;
  if (rest > 0) {
    const [one, many] = UNKNOWN_NOUN;
    parts.push(`${rest} ${rest === 1 ? one : many}`);
  }
  const list = parts.length <= 1 ? parts[0] ?? "" : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return ` [${list} attached \u2014 call get_messages to see ${media.length === 1 ? "it" : "them"}]`;
}
function describeReaction(frame) {
  const about = frame.body.trim();
  const where = frame.project_name ?? frame.project ?? "the dashboard";
  const verb = frame.on ? "reacted" : "removed their reaction";
  return `Your owner ${verb} ${frame.emoji} on your message (${where}): ${about}`;
}
function describeBlock(frame) {
  const who = frame.by?.name ?? "Your owner";
  const where = frame.project_name ?? frame.project ?? "the dashboard";
  const block = frame.block_title ? `"${frame.block_title}"` : `block ${frame.block_id}`;
  if (frame.action === "check") {
    const line = (frame.item_text ?? frame.item_id ?? "").trim();
    const verb = frame.done ? "ticked" : "unticked";
    return `${who} ${verb} "${line}" on your checklist ${block} (${where}).`;
  }
  const chosen = (frame.options ?? []).map((o) => o.label);
  if (chosen.length === 0) return `${who} took back their vote on your poll ${block} (${where}).`;
  return `${who} voted for ${chosen.join(", ")} on your poll ${block} (${where}).`;
}
function describeAnswer(frame) {
  const question = frame.question.trim();
  if (frame.state !== "answered") {
    const why = frame.state === "timeout" ? "Nobody answered before your request timed out" : "Your owner dismissed your request without answering";
    return `${why}: ${question}. That is not permission.`;
  }
  return `Your owner answered ${answerText(frame.answer)} \u2014 ${question}`;
}
function quoting(parent, limit = 100) {
  if (!parent) return "";
  const said = parent.body.replace(/\s+/g, " ").trim();
  if (said === "") return "";
  const short = said.length > limit ? `${said.slice(0, limit).trimEnd()}\u2026` : said;
  const who = parent.author === "human" ? "their own" : `${parent.author}'s`;
  return `, answering ${who} "${short}"`;
}
function answerText(answer) {
  if (answer === null) return "nothing";
  if (typeof answer === "boolean") return answer ? "yes" : "no";
  if (Array.isArray(answer)) return answer.length === 0 ? "nothing" : answer.join(", ");
  if (typeof answer === "object") {
    return `"${answer.action}" on ${answer.text.length} characters of text`;
  }
  return `"${answer}"`;
}
async function* readFrames(body, { idleMs = STREAM_IDLE_MS } = {}) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  while (true) {
    const chunk = await readOrTimeout(reader, idleMs);
    if (chunk.done) return;
    buffered += decoder.decode(chunk.value, { stream: true });
    let split = buffered.indexOf("\n\n");
    while (split !== -1) {
      const block = buffered.slice(0, split);
      buffered = buffered.slice(split + 2);
      const frame = {};
      for (const line of block.split("\n")) {
        const colon = line.indexOf(":");
        if (colon <= 0) continue;
        frame[line.slice(0, colon)] = line.slice(colon + 1).trimStart();
      }
      if (Object.keys(frame).length > 0) yield frame;
      split = buffered.indexOf("\n\n");
    }
  }
}
async function readOrTimeout(reader, idleMs) {
  if (idleMs <= 0) return reader.read();
  let timer;
  try {
    return await Promise.race([
      reader.read(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no data for ${idleMs}ms`)), idleMs);
      })
    ]);
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
function withNotifyTimeout(send, timeoutMs, log) {
  return async (content, meta) => {
    let timer;
    try {
      await Promise.race([
        send(content, meta),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`notification timed out after ${timeoutMs}ms`)),
            timeoutMs
          );
        })
      ]);
    } catch (error) {
      log(`notification dropped: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}
async function runBridge(options) {
  const {
    baseUrl,
    token,
    fetch: fetcher = globalThis.fetch,
    // The raw sender. Everything below the loop uses the guarded one.
    notify: send,
    notifyTimeoutMs = NOTIFY_TIMEOUT_MS,
    idleMs = STREAM_IDLE_MS,
    sleep = (ms) => new Promise((resolve2) => setTimeout(resolve2, ms)),
    signal,
    log = () => {
    }
  } = options;
  if (!send) throw new Error("runBridge needs a notify function");
  const endpoint = new URL("/api/agent/stream", baseUrl);
  for (const project of options.projects) {
    if (project.trim() !== "") endpoint.searchParams.append("project", project.trim());
  }
  const clientId = options.clientId ?? newClientId();
  endpoint.searchParams.set("client", clientId);
  const url = endpoint.toString();
  let pendingCounts = null;
  const meta = (work) => ({
    unread_messages: String(work.unread_messages),
    open_tasks: String(work.open_tasks),
    pending_approvals: String(work.pending_approvals)
  });
  const flush = async (send2) => {
    if (pendingCounts === null) return;
    const { work, sentence } = pendingCounts;
    pendingCounts = null;
    try {
      await send2(sentence, meta(work));
    } catch {
    }
  };
  const announced = /* @__PURE__ */ new Set();
  const ANNOUNCED_MAX = 500;
  const remember = (id) => {
    announced.add(id);
    if (announced.size > ANNOUNCED_MAX) {
      const oldest = announced.values().next().value;
      if (oldest !== void 0) announced.delete(oldest);
    }
  };
  const announceAnswer = async (send2, frame) => {
    const held = pendingCounts;
    pendingCounts = null;
    const attributes = {
      request_id: frame.request_id,
      state: frame.state
    };
    if (frame.project) attributes.project = frame.project;
    if (frame.update_id) attributes.update_id = frame.update_id;
    if (held) Object.assign(attributes, meta(held.work));
    const where = frame.project_name ?? frame.project ?? "the dashboard";
    await send2(`${describeAnswer(frame)} (${where})`, attributes);
  };
  const announceReaction = async (send2, frame) => {
    const held = pendingCounts;
    pendingCounts = null;
    const attributes = {
      message_id: frame.message_id,
      emoji: frame.emoji
    };
    if (frame.project) attributes.project = frame.project;
    if (frame.update_id) attributes.update_id = frame.update_id;
    if (frame.task_id) attributes.task_id = frame.task_id;
    if (held) Object.assign(attributes, meta(held.work));
    await send2(describeReaction(frame), attributes);
  };
  const announceBlock = async (send2, frame) => {
    const held = pendingCounts;
    pendingCounts = null;
    const attributes = { block_id: frame.block_id, action: frame.action };
    if (frame.update_id) attributes.update_id = frame.update_id;
    if (frame.message_id) attributes.message_id = frame.message_id;
    if (frame.request_id) attributes.request_id = frame.request_id;
    if (frame.project) attributes.project = frame.project;
    if (frame.item_id) attributes.item_id = frame.item_id;
    if (held) Object.assign(attributes, meta(held.work));
    await send2(describeBlock(frame), attributes);
  };
  const announce = async (send2, all) => {
    const held = pendingCounts;
    pendingCounts = null;
    const messages = all.filter((message) => !announced.has(message.message_id));
    if (messages.length === 0) {
      if (held && all.length === 0) await send2(held.sentence, meta(held.work));
      return;
    }
    for (const message of messages) {
      const attributes = { message_id: message.message_id };
      if (message.project) attributes.project = message.project;
      if (message.project_id) attributes.project_id = message.project_id;
      if (message.update_id) attributes.update_id = message.update_id;
      if (message.task_id) attributes.task_id = message.task_id;
      if (held) Object.assign(attributes, meta(held.work));
      const where = message.project_name ?? message.project ?? "the dashboard";
      const who = message.author === "human" ? "Your owner" : agentLabel(message);
      attributes.from = message.author === "human" ? "owner" : message.author_name ?? message.author;
      if (message.reply_to) attributes.reply_to = message.reply_to;
      if (message.answers) attributes.answers = message.answers;
      if (message.in_reply_to) attributes.in_reply_to = message.in_reply_to.id;
      if (message.request_id) attributes.request_id = message.request_id;
      if (message.media && message.media.length > 0) {
        attributes.attachments = String(message.media.length);
      }
      const about = message.request_id ? " about your open question" : "";
      await send2(
        `${who} on ${where}${about}${quoting(message.in_reply_to)}: ${message.body}` + describeAttachments(message.media),
        attributes
      );
      remember(message.message_id);
    }
  };
  const notify = withNotifyTimeout(send, notifyTimeoutMs, log);
  let previous = null;
  let attempt = 0;
  while (!signal?.aborted) {
    try {
      const response = await fetcher(url, {
        headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" },
        signal
      });
      if (!response.ok || !response.body) {
        log(`stream refused: ${response.status}`);
        throw new Error(`stream refused: ${response.status}`);
      }
      log("connected");
      attempt = 0;
      for await (const frame of readFrames(response.body, { idleMs })) {
        if (frame.event === "reaction" && frame.data) {
          try {
            await announceReaction(notify, JSON.parse(frame.data));
          } catch {
          }
          continue;
        }
        if (frame.event === "block" && frame.data) {
          try {
            await announceBlock(notify, JSON.parse(frame.data));
          } catch {
          }
          continue;
        }
        if (frame.event === "answer" && frame.data) {
          try {
            await announceAnswer(notify, JSON.parse(frame.data));
          } catch {
          }
          continue;
        }
        if (frame.event === "message" && frame.data) {
          try {
            const parsed = JSON.parse(frame.data);
            await announce(notify, parsed.messages ?? []);
          } catch {
          }
          continue;
        }
        if (frame.event !== "work" || !frame.data) continue;
        let work;
        try {
          work = JSON.parse(frame.data);
        } catch {
          continue;
        }
        await flush(notify);
        const sentence = describeRise(previous, work);
        previous = work;
        if (sentence === null) continue;
        pendingCounts = { work, sentence };
        if (work.unread_messages === 0) {
          await flush(notify);
          continue;
        }
      }
      await flush(notify);
      log("stream ended");
    } catch (error) {
      if (signal?.aborted) return;
      log(`stream failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (signal?.aborted) return;
    const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    attempt += 1;
    await sleep(wait);
  }
}

// src/monitor.ts
var LINE_MAX = 300;
function oneLine(content, max = LINE_MAX) {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const head = flat.slice(0, max - 1);
  const space = head.lastIndexOf(" ");
  return `${(space > max / 2 ? head.slice(0, space) : head).trimEnd()}\u2026`;
}
async function runMonitor(options) {
  const write = options.write ?? ((line) => process.stdout.write(`${line}
`));
  const diagnose = options.log ?? ((message) => process.stderr.write(`agent-dashboard monitor: ${message}
`));
  let announcedConnection = false;
  let announcedRefusal = false;
  const log = (message) => {
    diagnose(message);
    if (message === "connected") {
      announcedRefusal = false;
      if (announcedConnection) return;
      announcedConnection = true;
      write("agent-dashboard monitor: connected \u2014 watching the dashboard for this session.");
      return;
    }
    const refused = /^stream refused: (\d+)/.exec(message);
    if (refused && !announcedRefusal) {
      announcedRefusal = true;
      write(
        refused[1] === "401" ? "agent-dashboard monitor: refused (401) \u2014 the agent token is wrong or revoked. Pair this project again (the connecting-to-the-feed skill) or set a new agent_token under /plugin." : `agent-dashboard monitor: the dashboard refused the connection (${refused[1]}). Retrying; check the dashboard URL and that the deployment is up.`
      );
    }
  };
  await runBridge({
    baseUrl: options.baseUrl,
    token: options.token,
    projects: options.projects,
    fetch: options.fetch,
    sleep: options.sleep,
    signal: options.signal,
    log,
    notify: (content) => {
      write(oneLine(content));
      return Promise.resolve();
    }
  });
}

// src/secret.ts
import { existsSync, readFileSync as readFileSync3, renameSync, rmSync as rmSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { randomBytes } from "node:crypto";
import { basename, dirname as dirname2, join as join3 } from "node:path";
var ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
async function tool(url, token, name, args, io) {
  const fetch = io.fetch ?? globalThis.fetch;
  const response = await fetch(`${origin(url)}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })
  });
  if (response.status === 401) throw new Error("the dashboard refused this project's token: pair again, or check AGENT_DASHBOARD_TOKEN");
  if (!response.ok) throw new Error(`the dashboard said ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message ?? "the dashboard refused the call");
  const result = body.result ?? {};
  const data = result.structuredContent ?? {};
  if (result.isError) {
    const why = typeof data.message === "string" ? data.message : result.content?.[0]?.text ?? "refused";
    throw new Error(why);
  }
  return data;
}
function writePrivate(path, bytes) {
  const temp = join3(dirname2(path), `.${basename(path)}.${randomBytes(6).toString("hex")}.tmp`);
  try {
    writeFileSync3(temp, bytes, { mode: 384, flag: "wx" });
    renameSync(temp, path);
  } catch (e) {
    rmSync2(temp, { force: true });
    throw e;
  }
}
var BARE = /^[A-Za-z0-9_./+=:@,%~-]*$/;
function envValue(value) {
  if (BARE.test(value)) return value;
  if (/['\r\n\0]/.test(value)) throw new Error("it holds a quote or a line break, so it can't go in an env file safely: use --to <file>");
  return `'${value}'`;
}
function withEnvLine(file, variable, value) {
  const line = `${variable}=${envValue(value)}`;
  const lines = file.length ? file.replace(/\n$/, "").split("\n") : [];
  const at = lines.findIndex((l) => l.replace(/^export\s+/, "").startsWith(`${variable}=`));
  if (at >= 0) lines[at] = line;
  else lines.push(line);
  return `${lines.join("\n")}
`;
}
async function getSecret(options, io = {}) {
  const { to, envFile } = options;
  if ((to ? 1 : 0) + (envFile ? 1 : 0) !== 1) throw new Error("say where it goes: --to <file> or --env-file <file>");
  const variable = options.as ?? options.name;
  if (envFile && !ENV_NAME.test(variable)) throw new Error(`${variable} is not an environment variable name: pass --as NAME`);
  const grant = await tool(options.url, options.token, "secret_url", { name: options.name }, io);
  if (typeof grant.url !== "string") throw new Error("the dashboard gave no link");
  const fetch = io.fetch ?? globalThis.fetch;
  const response = await fetch(grant.url);
  if (!response.ok) throw new Error(`the link was refused (${response.status}): run this again for a fresh one`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (to) {
    writePrivate(to, bytes);
    return `saved ${options.name} to ${to} (${bytes.length} bytes)`;
  }
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${options.name} is not text, so it can't go in an env file: use --to <file>`);
  }
  if (/[\r\n]/.test(value)) throw new Error(`${options.name} has more than one line, so it can't go in an env file: use --to <file>`);
  const before = existsSync(envFile) ? readFileSync3(envFile, "utf8") : "";
  writePrivate(envFile, withEnvLine(before, variable, value));
  return `saved ${options.name} as ${variable} in ${envFile} (${bytes.length} bytes)`;
}
async function putSecret(options, io = {}) {
  const bytes = readFileSync3(options.from);
  if (bytes.length === 0) throw new Error(`${options.from} is empty`);
  const args = { name: options.name };
  if (options.note) args.note = options.note;
  const grant = await tool(options.url, options.token, "create_secret_upload", args, io);
  if (typeof grant.upload_url !== "string") throw new Error("the dashboard gave no upload link");
  const fetch = io.fetch ?? globalThis.fetch;
  const response = await fetch(grant.upload_url, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: bytes });
  if (!response.ok) throw new Error(`the upload was refused (${response.status})`);
  return `saved ${options.name} on the dashboard (${bytes.length} bytes)`;
}

// src/cli.ts
function settingsFrom(env) {
  const pick = (option, fallback) => env[`CLAUDE_PLUGIN_OPTION_${option}`]?.trim() || env[fallback]?.trim() || "";
  const url = pick("DASHBOARD_URL", "AGENT_DASHBOARD_URL").replace(/\/+$/, "").replace(/\/mcp$/, "");
  const monitor2 = pick("MONITOR", "AGENT_DASHBOARD_MONITOR").toLowerCase() === "off" ? "off" : "auto";
  return { url: url || null, projects: pick("PROJECTS", "AGENT_DASHBOARD_PROJECTS"), monitor: monitor2 };
}
function readSettings(store) {
  try {
    const parsed = JSON.parse(readFileSync4(store.connectionPath, "utf8"));
    return {
      url: typeof parsed.url === "string" ? parsed.url : null,
      projects: typeof parsed.projects === "string" ? parsed.projects : "",
      monitor: parsed.monitor === "off" ? "off" : "auto"
    };
  } catch {
    return null;
  }
}
function sessionStart(store, env) {
  const settings = settingsFrom(env);
  try {
    writeSecret(store.connectionPath, settings);
    store.saveOptionToken(env.CLAUDE_PLUGIN_OPTION_AGENT_TOKEN);
  } catch {
  }
  if (!settings.url) return "";
  const token = store.resolve(env, settings.url);
  if (!token) {
    return [
      `Wildware Feed: this project is not connected to the dashboard at ${settings.url} yet.`,
      "If the owner asks you to connect, or wants you on the dashboard, use the",
      "wildware-feed:connecting-to-the-feed skill. It pairs this project with their approval."
    ].join("\n");
  }
  const who = token.name ? ` as "${token.name}"` : "";
  return [
    `Wildware Feed: your owner may be watching this run at ${settings.url}${who}.`,
    "register_session first and heartbeat on the interval it returns; end_session when done.",
    "Acknowledge every owner message (read, then thinking, then done) and reply in its thread",
    "with post_message. Ask with request_input instead of guessing; a timeout is not a yes.",
    "Skill: wildware-feed:working-with-the-feed."
  ].join("\n");
}
function headers(store, env) {
  const token = store.resolve(env, env.CLAUDE_CODE_MCP_SERVER_URL);
  return token ? { Authorization: `Bearer ${token.token}` } : {};
}
function connection(store, env) {
  const saved = readSettings(store);
  const url = env.AGENT_DASHBOARD_URL?.trim() || saved?.url;
  const projects = (env.AGENT_DASHBOARD_PROJECTS?.trim() || saved?.projects || "").split(",").map((p) => p.trim()).filter(Boolean);
  const monitor2 = (env.AGENT_DASHBOARD_MONITOR ?? saved?.monitor ?? "auto").toLowerCase() === "off" ? "off" : "auto";
  if (!url) return null;
  const token = store.resolve(env, url);
  if (!token) return null;
  return { url, token: token.token, projects, monitor: monitor2 };
}
function claimEnv(store, env) {
  return { ...env, CLAUDE_PLUGIN_DATA: store.data, WILDWARE_FEED_PROJECT_KEY: store.key };
}
function status(store, env) {
  const settings = readSettings(store);
  const paired = store.paired();
  const pending = store.pending();
  const lines = [`Project: ${store.root}`, `Dashboard: ${settings?.url ?? "not set (dashboard_url under /plugin)"}`];
  if (paired) lines.push(`Paired as "${paired.name}" with ${paired.url} on ${paired.paired_at}.`);
  else lines.push("Not paired.");
  if (pending) lines.push(`A pairing is waiting for the owner: code ${pending.code}. Run \`pair wait\`.`);
  const token = store.resolve(env, settings?.url ?? void 0);
  lines.push(
    token ? `Token in use: ${token.source === "env" ? "AGENT_DASHBOARD_TOKEN" : token.source === "paired" ? "this project's pairing" : "the agent_token plugin option"}.` : "No token: the dashboard tools will be refused until this project is paired."
  );
  return lines.join("\n");
}
var MONITOR_WAIT_MS = 5e3;
var SAY_AFTER_MS = 2e4;
async function monitor(store, env) {
  const started = Date.now();
  let saidUnconfigured = false;
  let saidStandby = false;
  const claims = claimEnv(store, env);
  for (; ; ) {
    const found = connection(store, env);
    if (found?.monitor === "off") {
      process.stderr.write("agent-dashboard monitor: off by configuration\n");
      return;
    }
    if (found && channelIsLive(claims)) {
      if (!saidStandby) {
        saidStandby = true;
        process.stderr.write("agent-dashboard monitor: the channel is delivering for this session; standing by\n");
      }
      await new Promise((r) => setTimeout(r, CLAIM_EVERY_MS));
      continue;
    }
    if (found) {
      await runMonitor({ baseUrl: found.url, token: found.token, projects: found.projects });
      return;
    }
    if (!saidUnconfigured && Date.now() - started >= SAY_AFTER_MS) {
      saidUnconfigured = true;
      const settings = readSettings(store);
      if (settings?.url) {
        process.stdout.write(
          "agent-dashboard monitor: waiting \u2014 this project is not paired yet, so nothing will arrive from the dashboard until it is.\n"
        );
      }
    }
    await new Promise((r) => setTimeout(r, MONITOR_WAIT_MS));
  }
}
async function run(argv, env = process.env) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      data: { type: "string" },
      project: { type: "string" },
      url: { type: "string" },
      name: { type: "string" },
      force: { type: "boolean" },
      to: { type: "string" },
      "env-file": { type: "string" },
      as: { type: "string" },
      from: { type: "string" },
      note: { type: "string" }
    }
  });
  const [command, sub] = positionals;
  const data = values.data?.trim() || env.CLAUDE_PLUGIN_DATA?.trim();
  const project = values.project?.trim() || env.CLAUDE_PROJECT_DIR?.trim() || process.cwd();
  if (!data) {
    process.stderr.write("wildware-feed: --data <plugin data folder> is required\n");
    return 2;
  }
  const store = Store.for(data, project);
  const say = (text) => {
    if (text) process.stdout.write(`${text}
`);
  };
  switch (command) {
    case "headers":
      say(JSON.stringify(headers(store, env)));
      return 0;
    case "session-start":
      say(sessionStart(store, env));
      return 0;
    case "monitor":
      await monitor(store, env);
      return 0;
    case "status":
      say(status(store, env));
      return 0;
    case "forget":
      say(store.forget() ? "Forgot this project's token. It is no longer paired." : "This project was not paired.");
      store.clearPending();
      return 0;
    case "pair": {
      if (sub === "start") {
        const url = values.url?.trim() || readSettings(store)?.url || settingsFrom(env).url;
        if (!url || url.includes("${")) {
          say("No dashboard URL. Pass --url https://your-dashboard, or set dashboard_url under /plugin.");
          return 2;
        }
        return startPairing(store, { url, name: values.name ?? "", force: values.force });
      }
      if (sub === "wait") return waitForPairing(store);
      say("Usage: pair start --url <dashboard> --name <agent name> | pair wait");
      return 2;
    }
    case "secret": {
      const name = positionals[2];
      const usage = "Usage: secret get <NAME> --to <file> | secret get <NAME> --env-file <file> [--as VAR] | secret put <NAME> --from <file> [--note <text>]";
      if (!name || sub !== "get" && sub !== "put") {
        say(usage);
        return 2;
      }
      const url = values.url?.trim() || readSettings(store)?.url || settingsFrom(env).url;
      const token = url ? store.resolve(env, url) : null;
      if (!url || !token) {
        say("This project is not connected to the dashboard yet: pair it first (wildware-feed:connecting-to-the-feed).");
        return 2;
      }
      try {
        if (sub === "get") {
          say(await getSecret({ url, token: token.token, name, to: values.to, envFile: values["env-file"], as: values.as }));
        } else {
          if (!values.from) {
            say(usage);
            return 2;
          }
          say(await putSecret({ url, token: token.token, name, from: values.from, note: values.note }));
        }
        return 0;
      } catch (e) {
        say(`secret ${sub} ${name}: ${e instanceof Error ? e.message : String(e)}`);
        return 1;
      }
    }
    default:
      say("Usage: feed.mjs <headers|session-start|monitor|status|forget|pair start|pair wait|secret get|secret put> --data <dir> [--project <dir>]");
      return 2;
  }
}

// src/feed-bin.ts
process.exitCode = await run(process.argv.slice(2));
