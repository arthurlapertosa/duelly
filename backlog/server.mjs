#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStatusJson } from '../scripts/harness/validate-backlog-status.mjs';

const backlogRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(backlogRoot, '..');
const defaultPort = Number(process.env.PORT || process.argv[2] || 8000);
const backlogRootReal = realpathSync(backlogRoot);

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !rel.includes(`..${sep}`));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

async function readManifest() {
  const content = await readFile(join(backlogRoot, 'status.json'), 'utf8');
  return parseStatusJson(content);
}

function mappedMarkdownPaths(manifest) {
  return new Set([
    ...Object.values(manifest.milestones || {}).map((item) => item.markdown),
    ...Object.values(manifest.tasks || {}).map((item) => item.markdown),
  ]);
}

async function readMappedMarkdown(markdownPath) {
  const manifest = await readManifest();
  const allowed = mappedMarkdownPaths(manifest);
  if (!allowed.has(markdownPath)) {
    return { status: 404, payload: { error: 'Markdown path is not mapped in status.json.' } };
  }

  const resolved = resolve(backlogRoot, markdownPath);
  if (!isInside(backlogRoot, resolved) || !existsSync(resolved)) {
    return { status: 404, payload: { error: 'Markdown file was not found.' } };
  }
  try {
    const stat = lstatSync(resolved);
    if (!stat.isFile() || !isInside(backlogRootReal, realpathSync(resolved))) {
      return { status: 404, payload: { error: 'Markdown file was not found.' } };
    }
  } catch {
    return { status: 404, payload: { error: 'Markdown file was not found.' } };
  }

  const markdown = await readFile(resolved, 'utf8');
  return { status: 200, payload: { markdown } };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(html);
}

function renderPage(manifest) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Duelly Backlog Status</title>
  <style>
    :root {
      --bg: #f3f4f6;
      --surface: #f9fafb;
      --surface-strong: #ffffff;
      --text: #111827;
      --muted: #6b7280;
      --line: #d1d5db;
      --accent: #374151;
      --accent-soft: #e5e7eb;
      --shadow: 0 10px 24px rgba(17, 24, 39, 0.06);
      --todo: #4b5563;
      --todo-bg: #e5e7eb;
      --in-progress: #1d4ed8;
      --in-progress-bg: #dbeafe;
      --blocked: #b91c1c;
      --blocked-bg: #fee2e2;
      --review: #92400e;
      --review-bg: #fef3c7;
      --done: #047857;
      --done-bg: #d1fae5;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: "IBM Plex Sans", "Aptos", "Segoe UI", sans-serif;
      line-height: 1.5;
    }

    button { font: inherit; }
    a { color: var(--accent); }

    .shell {
      display: grid;
      grid-template-columns: 440px minmax(0, 1fr);
      grid-template-rows: 1fr auto;
      column-gap: 24px;
      min-height: 100vh;
      padding: 0 24px 24px 0;
    }

    .layout {
      display: contents;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .nav-panel {
      grid-column: 1;
      grid-row: 1 / -1;
      position: sticky;
      top: 0;
      height: 100vh;
      max-height: 100vh;
      border-width: 0 1px 0 0;
      border-radius: 0;
      box-shadow: none;
      overflow: auto;
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      border-bottom: 1px solid var(--line);
      padding: 18px 16px 14px;
    }

    .panel-title {
      margin: 0;
      font-size: 1rem;
      letter-spacing: -0.02em;
    }

    .small-muted {
      color: var(--muted);
      font-size: 0.84rem;
    }

    .milestone {
      border-bottom: 1px solid rgba(221, 214, 200, 0.72);
      padding: 10px;
    }

    .milestone:last-child { border-bottom: 0; }

    .milestone-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 34px;
      gap: 8px;
      align-items: stretch;
    }

    .collapse-button {
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      padding: 0;
      transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
    }

    .collapse-button:hover,
    .collapse-button:focus-visible {
      border-color: var(--accent-soft);
      background: rgba(36, 76, 90, 0.06);
      color: var(--accent);
      outline: none;
    }

    .collapse-icon {
      display: inline-block;
      font-size: 1.05rem;
      transform: rotate(90deg);
      transition: transform 160ms ease;
    }

    .milestone.collapsed .collapse-icon {
      transform: rotate(0deg);
    }

    .milestone.collapsed .task-list {
      display: none;
    }

    .item-button {
      width: 100%;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      padding: 10px;
      text-align: left;
      transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
    }

    .item-button:hover,
    .item-button:focus-visible {
      border-color: var(--accent-soft);
      background: rgba(36, 76, 90, 0.06);
      outline: none;
      transform: none;
    }

    .item-button.active {
      border-color: rgba(36, 76, 90, 0.34);
      background: #eef0f3;
    }

    .item-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }

    .item-title {
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .item-desc {
      margin: 6px 0 10px;
      color: var(--muted);
      font-size: 0.88rem;
    }

    .task-list {
      display: grid;
      gap: 6px;
      margin: 8px 0 0 18px;
      padding: 0 0 0 12px;
      border-left: 1px solid var(--line);
    }

    .task-list .item-button {
      border-radius: 6px;
      padding: 10px;
    }

    .task-list .item-title {
      font-size: 0.92rem;
      font-weight: 720;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 0.72rem;
      font-weight: 800;
      line-height: 1;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge::before {
      width: 7px;
      height: 7px;
      border-radius: 2px;
      content: "";
      background: currentColor;
    }

    .badge.todo { background: var(--todo-bg); color: var(--todo); }
    .badge.in_progress { background: var(--in-progress-bg); color: var(--in-progress); }
    .badge.blocked { background: var(--blocked-bg); color: var(--blocked); }
    .badge.review { background: var(--review-bg); color: var(--review); }
    .badge.done { background: var(--done-bg); color: var(--done); }

    .progress {
      display: grid;
      gap: 6px;
    }

    .progress-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 0.8rem;
    }

    .progress-track {
      height: 8px;
      border-radius: 3px;
      background: #e8e2d5;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(90deg, #9ca3af 0%, #f97316 50%, #047857 100%);
      transition: width 220ms ease;
    }

    .reader {
      grid-column: 2;
      grid-row: 1;
      min-height: calc(100vh - 48px);
    }

    .reader-head {
      display: grid;
      gap: 8px;
      border-bottom: 1px solid var(--line);
      padding: 22px 24px 18px;
      background: #f9fafb;
    }

    .reader-title {
      margin: 0;
      font-size: clamp(1.35rem, 2vw, 2rem);
      line-height: 1.08;
      letter-spacing: -0.04em;
    }

    .reader-path {
      color: var(--muted);
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.78rem;
      overflow-wrap: anywhere;
    }

    .markdown {
      padding: 24px;
      background: var(--surface-strong);
    }

    .markdown h1,
    .markdown h2,
    .markdown h3 {
      line-height: 1.15;
      letter-spacing: -0.03em;
    }

    .markdown h1 {
      margin-top: 0;
      font-size: 2rem;
    }

    .markdown h2 {
      margin-top: 2rem;
      border-top: 1px solid var(--line);
      padding-top: 1.2rem;
      font-size: 1.3rem;
    }

    .markdown h3 {
      margin-top: 1.4rem;
      font-size: 1.05rem;
    }

    .markdown p { margin: 0 0 1rem; }
    .markdown ul { padding-left: 1.25rem; }
    .markdown li { margin: 0.3rem 0; }
    .markdown input[type="checkbox"] { margin-right: 0.45rem; }

    .markdown pre {
      overflow: auto;
      border-radius: 6px;
      background: #111827;
      color: #f8fafc;
      padding: 16px;
      font-size: 0.9rem;
    }

    .markdown code {
      font-family: "SFMono-Regular", Consolas, monospace;
    }

    .error {
      border: 1px solid var(--blocked-bg);
      border-radius: 6px;
      background: #fff5f5;
      color: var(--blocked);
      padding: 16px;
    }

    details {
      grid-column: 2;
      grid-row: 2;
      margin: 18px 0 0;
      color: var(--muted);
      font-size: 0.86rem;
    }

    details pre {
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #ffffff;
      padding: 12px;
    }

    @media (max-width: 980px) {
      .shell {
        display: block;
        padding: 0 16px 16px;
      }
      .nav-panel {
        position: static;
        height: auto;
        max-height: none;
        border-width: 1px;
        border-radius: 8px;
        margin-bottom: 16px;
      }
    }

    @media (max-width: 620px) {
      .panel { border-radius: 6px; }
      .item-top { display: grid; }
      .task-list { margin-left: 6px; }
      .markdown,
      .reader-head { padding: 18px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="layout">
      <nav class="panel nav-panel" aria-label="Backlog items">
        <div class="panel-head">
          <h2 class="panel-title">Milestones and tasks</h2>
          <span class="small-muted" id="manifest-version">status.json</span>
        </div>
        <div id="backlog-list"></div>
      </nav>

      <article class="panel reader" aria-labelledby="reader-title">
        <div class="reader-head">
          <div id="reader-badge"></div>
          <h2 class="reader-title" id="reader-title">Select an item</h2>
          <div class="reader-path" id="reader-path">No markdown loaded yet.</div>
        </div>
        <div class="markdown" id="markdown-content">
          <p>Select a milestone or task to read its markdown file.</p>
        </div>
      </article>
    </section>

    <details id="diagnostics">
      <summary>Diagnostics</summary>
      <pre id="diagnostics-content">No diagnostics yet.</pre>
    </details>
  </main>

  <script type="application/json" id="status-data">${safeJson(manifest)}</script>
  <script>
    const allowedStatuses = new Set(["todo", "in_progress", "blocked", "review", "done"]);
    const statusLabels = {
      todo: "Todo",
      in_progress: "In progress",
      blocked: "Blocked",
      review: "Review",
      done: "Done"
    };

    const state = {
      manifest: JSON.parse(document.querySelector("#status-data").textContent),
      milestones: [],
      tasksById: {},
      activeId: null,
      collapsedMilestones: new Set(),
      diagnostics: []
    };

    const elements = {
      statusLine: document.querySelector("#status-line"),
      list: document.querySelector("#backlog-list"),
      readerTitle: document.querySelector("#reader-title"),
      readerPath: document.querySelector("#reader-path"),
      readerBadge: document.querySelector("#reader-badge"),
      markdown: document.querySelector("#markdown-content"),
      manifestVersion: document.querySelector("#manifest-version"),
      diagnostics: document.querySelector("#diagnostics-content")
    };

    function setStatus(message) {
      addDiagnostic(message);
    }

    function addDiagnostic(message) {
      state.diagnostics.push(message);
      elements.diagnostics.textContent = state.diagnostics.join("\\n");
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function clampProgress(value) {
      if (!Number.isFinite(value)) return 0;
      return Math.max(0, Math.min(100, value));
    }

    function normalizeManifest() {
      const tasksById = state.manifest.tasks || {};
      const milestones = Object.values(state.manifest.milestones || {}).sort((a, b) => a.id.localeCompare(b.id));

      milestones.forEach((milestone) => {
        milestone.taskItems = (milestone.tasks || []).map((taskId) => tasksById[taskId]).filter(Boolean);
        milestone.completedTasks = milestone.taskItems.filter((task) => task.status === "done").length;
      });

      state.collapsedMilestones = new Set(milestones.map((milestone) => milestone.id));

      [...milestones, ...Object.values(tasksById)].forEach((item) => {
        if (!allowedStatuses.has(item.status)) {
          addDiagnostic(\`Unknown status "\${item.status}" on \${item.id}; rendering as todo.\`);
          item.status = "todo";
        }
      });

      state.tasksById = tasksById;
      state.milestones = milestones;
    }

    function statusBadge(status) {
      const safeStatus = allowedStatuses.has(status) ? status : "todo";
      return \`<span class="badge \${safeStatus}">\${statusLabels[safeStatus]}</span>\`;
    }

    function progressMarkup(item, detail) {
      const progress = clampProgress(item.progress);
      return \`
        <div class="progress" aria-label="\${escapeHtml(item.title)} progress \${progress}%">
          <div class="progress-meta">
            <span>\${progress}% progress</span>
            <span>\${escapeHtml(detail || "")}</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width: \${progress}%"></div></div>
        </div>
      \`;
    }

    function itemButton(item, type, extraDetail) {
      return \`
        <button class="item-button \${state.activeId === item.id ? "active" : ""}" type="button" data-id="\${escapeHtml(item.id)}" data-type="\${type}">
          <span class="item-top">
            <span class="item-title">\${escapeHtml(item.title)}</span>
            \${statusBadge(item.status)}
          </span>
          <span class="item-desc">\${escapeHtml(item.description || "")}</span>
          \${progressMarkup(item, extraDetail)}
        </button>
      \`;
    }

    function renderBacklog() {
      const taskCount = Object.keys(state.tasksById).length;
      const doneCount = Object.values(state.tasksById).filter((task) => task.status === "done").length;

      elements.manifestVersion.textContent = \`\${doneCount} / \${taskCount} done\`;

      elements.list.innerHTML = state.milestones.map((milestone) => {
        const taskDetail = \`\${milestone.completedTasks} / \${milestone.taskItems.length} done\`;
        const tasks = milestone.taskItems.map((task) => itemButton(task, "task", "task")).join("");
        const collapsed = state.collapsedMilestones.has(milestone.id);
        return \`
          <section class="milestone \${collapsed ? "collapsed" : ""}">
            <div class="milestone-row">
              \${itemButton(milestone, "milestone", taskDetail)}
              <button class="collapse-button" type="button" data-collapse-id="\${escapeHtml(milestone.id)}" aria-label="\${collapsed ? "Expand" : "Collapse"} \${escapeHtml(milestone.title)}" aria-expanded="\${String(!collapsed)}">
                <span class="collapse-icon" aria-hidden="true">›</span>
              </button>
            </div>
            <div class="task-list">\${tasks}</div>
          </section>
        \`;
      }).join("");

      elements.list.querySelectorAll("button[data-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const item = findItem(button.dataset.id);
          if (item) loadMarkdown(item);
        });
      });

      elements.list.querySelectorAll("button[data-collapse-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.collapseId;
          if (state.collapsedMilestones.has(id)) {
            state.collapsedMilestones.delete(id);
          } else {
            state.collapsedMilestones.add(id);
          }
          renderBacklog();
        });
      });
    }

    function findItem(id) {
      return state.milestones.find((item) => item.id === id) || state.tasksById[id];
    }

    function inlineMarkdown(value) {
      return escapeHtml(value)
        .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>")
        .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" rel="noreferrer">$1</a>');
    }

    function normalizeTitle(value) {
      return String(value)
        .replace(/^#\\s+/, "")
        .replace(/[—–]/g, "-")
        .replace(/\\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    function renderMarkdown(markdown, selectedItem) {
      const lines = markdown.split(/\\r?\\n/);
      const html = [];
      let inList = false;
      let inCode = false;
      let codeLines = [];
      let canSkipFirstHeading = true;

      function closeList() {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
      }

      function flushCode() {
        html.push(\`<pre><code>\${escapeHtml(codeLines.join("\\n"))}</code></pre>\`);
        codeLines = [];
      }

      for (const line of lines) {
        if (line.startsWith("\`\`\`")) {
          if (inCode) {
            inCode = false;
            flushCode();
          } else {
            closeList();
            inCode = true;
          }
          continue;
        }

        if (inCode) {
          codeLines.push(line);
          continue;
        }

        if (!line.trim()) {
          closeList();
          continue;
        }

        const heading = line.match(/^(#{1,3})\\s+(.+)$/);
        if (heading) {
          closeList();
          const level = heading[1].length;
          if (
            canSkipFirstHeading &&
            level === 1 &&
            selectedItem &&
            normalizeTitle(heading[2]) === normalizeTitle(selectedItem.title)
          ) {
            canSkipFirstHeading = false;
            continue;
          }
          canSkipFirstHeading = false;
          html.push(\`<h\${level}>\${inlineMarkdown(heading[2])}</h\${level}>\`);
          continue;
        }

        const checkbox = line.match(/^\\s*-\\s+\\[([ xX])\\]\\s+(.+)$/);
        if (checkbox) {
          if (!inList) {
            html.push("<ul>");
            inList = true;
          }
          const checked = checkbox[1].toLowerCase() === "x" ? " checked" : "";
          html.push(\`<li><label><input type="checkbox" disabled\${checked}>\${inlineMarkdown(checkbox[2])}</label></li>\`);
          continue;
        }

        const bullet = line.match(/^\\s*-\\s+(.+)$/);
        if (bullet) {
          if (!inList) {
            html.push("<ul>");
            inList = true;
          }
          html.push(\`<li>\${inlineMarkdown(bullet[1])}</li>\`);
          continue;
        }

        closeList();
        canSkipFirstHeading = false;
        html.push(\`<p>\${inlineMarkdown(line)}</p>\`);
      }

      closeList();
      if (inCode) flushCode();
      return html.join("\\n");
    }

    async function loadMarkdown(item) {
      state.activeId = item.id;
      renderBacklog();
      elements.readerTitle.textContent = item.title;
      elements.readerPath.textContent = item.markdown;
      elements.readerBadge.innerHTML = statusBadge(item.status);
      elements.markdown.innerHTML = "<p>Loading markdown...</p>";

      try {
        const response = await fetch(\`/markdown?path=\${encodeURIComponent(item.markdown)}\`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || \`HTTP \${response.status}\`);
        elements.markdown.innerHTML = renderMarkdown(payload.markdown, item);
        setStatus(\`Loaded \${item.title}\`);
      } catch (error) {
        const message = \`Could not load \${item.markdown}. Confirm the file exists and is mapped in status.json.\`;
        elements.markdown.innerHTML = \`<div class="error">\${escapeHtml(message)}</div>\`;
        addDiagnostic(error.message);
        setStatus("Markdown load failed.");
      }
    }

    function init() {
      normalizeManifest();
      if (!state.milestones.length) {
        setStatus("Backlog status does not contain milestones.");
        return;
      }
      renderBacklog();
      setStatus(\`Loaded \${state.milestones.length} milestones and \${Object.keys(state.tasksById).length} tasks.\`);
      loadMarkdown(state.milestones[0]);
    }

    init();
  </script>
</body>
</html>`;
}

export function createBacklogServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (!['GET', 'HEAD'].includes(req.method)) {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      if (url.pathname === '/markdown') {
        const markdownPath = url.searchParams.get('path') || '';
        const result = await readMappedMarkdown(markdownPath);
        sendJson(res, result.status, result.payload);
        return;
      }

      if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/backlog/' || url.pathname === '/backlog/index.html') {
        const manifest = await readManifest();
        sendHtml(res, 200, req.method === 'HEAD' ? '' : renderPage(manifest));
        return;
      }

      sendJson(res, 404, { error: 'Route not found' });
    } catch (error) {
      sendHtml(res, 500, `<pre>${escapeHtml(error.stack || error.message)}</pre>`);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createBacklogServer().listen(defaultPort, () => {
    console.log(`Backlog status server: http://localhost:${defaultPort}/index.html`);
    console.log(`Repository root: ${repoRoot}`);
  });
}
