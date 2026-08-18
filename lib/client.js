/**
 * dsh-manus — browser half. Runs inside the dsh web GUI.
 *
 * Mounts the sidebar entry row (toggles the panel) and the Manus panel in the
 * center column: configure the API key, see the credit balance, send a task to
 * Manus, follow its progress, view the result, and download attachments.
 *
 * Deliberately dependency-free (no React): the whole UI is built with plain
 * DOM so the /client surface loads through the shell's __ModuleLoader__ with
 * nothing to require. Failure policy: DOM mounting problems are logged, never
 * thrown — an external plugin must not take the GUI down.
 */

window.__ModuleLoader__.load({
  id: "dsh-manus",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    // ================================================================ styles
    var STYLE_ID = "dsh-manus-styles";
    var CSS = [
      /* center-column takeover (global rules, attribute-scoped) */
      "[data-pane='conversation'], [class*='centerCol'] { position: relative; }",
      "[data-dsh-manus-view] { position: absolute; inset: 0; display: none; z-index: 60; background: var(--dsw-alias-bg-base, #fff); }",
      "html[data-dsh-manus-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-dsh-manus-view] { display: block; }",
      "html[data-dsh-manus-active] [data-pane='conversation'] > :not([data-dsh-manus-view]),",
      "html[data-dsh-manus-active] [class*='centerCol'] > :not([data-dsh-manus-view]) { display: none !important; }",
      /* sidebar entry row */
      ".dsh-manus-entry { display: flex; align-items: center; gap: 8px; width: 100%; height: 32px; padding: 0 12px; background: transparent; border: none; border-radius: 8px; color: var(--dsw-alias-label-secondary, #666); cursor: pointer; font-size: 13px; white-space: nowrap; }",
      ".dsh-manus-entry:hover { background: var(--dsw-specific-sidebar-nav-item-hover, rgba(0,0,0,0.05)); color: var(--dsw-alias-label-primary, #111); }",
      ".dsh-manus-entry[data-active] { background: var(--dsw-specific-sidebar-nav-item-active, rgba(0,0,0,0.08)); color: var(--dsw-alias-label-primary, #111); font-weight: 600; }",
      ".dsh-manus-entry .dsh-manus-entry-icon { display: inline-flex; align-items: center; justify-content: center; flex: none; }",
      "[data-dsh-frame][data-sidebar-collapsed] .dsh-manus-entry { justify-content: center; padding: 0; width: 100%; }",
      "[data-dsh-frame][data-sidebar-collapsed] .dsh-manus-entry .dsh-manus-entry-label { display: none; }",
      /* panel frame */
      ".dsh-manus-view { overflow: hidden; }",
      ".dsh-manus-panel { display: flex; flex-direction: column; height: 100%; min-width: 0; min-height: 0; padding: 14px 16px 16px; gap: 10px; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #111); font-family: var(--dsw-font-family, inherit); }",
      ".dsh-manus-panel h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--dsw-alias-label-primary, #111); }",
      ".dsh-manus-header { display: flex; align-items: center; gap: 10px; flex: none; }",
      ".dsh-manus-header .dsh-manus-title { margin: 0; flex: 1; font-size: 16px; font-weight: 700; }",
      ".dsh-manus-badge { display: inline-block; padding: 1px 8px; font-size: 11px; line-height: 1.6; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2, #ddd); color: var(--dsw-alias-label-secondary, #666); white-space: nowrap; }",
      ".dsh-manus-badge[data-kind='ok'] { color: var(--dsw-alias-state-success-primary, #1a9e5a); border-color: var(--dsw-alias-state-success-primary, #1a9e5a); }",
      ".dsh-manus-badge[data-kind='warn'] { color: var(--dsw-alias-state-warn-primary, #c77416); border-color: var(--dsw-alias-state-warn-primary, #c77416); }",
      ".dsh-manus-badge[data-kind='error'] { color: var(--dsw-alias-state-error-primary, #d5484d); border-color: var(--dsw-alias-state-error-primary, #d5484d); }",
      ".dsh-manus-btn { padding: 6px 14px; font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary-foreground, #fff); background: var(--dsw-alias-button-info-fill, #3b82f6); border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; }",
      ".dsh-manus-btn:hover:not(:disabled) { background: var(--dsw-alias-button-info-hover, #2f6fe0); }",
      ".dsh-manus-btn:disabled { opacity: 0.5; cursor: default; }",
      ".dsh-manus-btn.ghost { padding: 5px 12px; font-size: 12px; color: var(--dsw-alias-label-primary, #111); background: transparent; border: 1px solid var(--dsw-alias-border-l2, #ddd); border-radius: 8px; }",
      ".dsh-manus-btn.ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.05)); }",
      ".dsh-manus-btn.link { padding: 0; font-size: 12px; color: var(--dsw-alias-state-business-primary, #3b82f6); background: none; border: none; cursor: pointer; }",
      ".dsh-manus-input { padding: 7px 10px; font-size: 13px; color: var(--dsw-alias-label-primary, #111); background: var(--dsw-specific-input-major, #fff); border: 1px solid var(--dsw-alias-border-l2, #ddd); border-radius: 8px; outline: none; resize: vertical; font-family: inherit; }",
      ".dsh-manus-input:focus { border-color: var(--dsw-alias-state-business-primary, #3b82f6); }",
      ".dsh-manus-input::placeholder { color: var(--dsw-alias-label-tertiary, #999); }",
      ".dsh-manus-section { display: flex; flex-direction: column; gap: 8px; flex: none; }",
      ".dsh-manus-card { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--dsw-alias-bg-layer-2, #f6f6f6); border: 1px solid var(--dsw-alias-border-l1, #e5e5e5); border-radius: 10px; }",
      ".dsh-manus-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }",
      ".dsh-manus-row .dsh-manus-input { flex: 1; min-width: 120px; }",
      ".dsh-manus-hint { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #999); }",
      ".dsh-manus-banner { padding: 8px 12px; font-size: 12.5px; line-height: 1.5; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, #ddd); color: var(--dsw-alias-label-secondary, #666); overflow-wrap: anywhere; }",
      ".dsh-manus-banner[data-kind='ok'] { color: var(--dsw-alias-state-success-primary, #1a9e5a); border-color: var(--dsw-alias-state-success-primary, #1a9e5a); }",
      ".dsh-manus-banner[data-kind='error'] { color: var(--dsw-alias-state-error-primary, #d5484d); border-color: var(--dsw-alias-state-error-primary, #d5484d); }",
      ".dsh-manus-banner[data-kind='info'] { color: var(--dsw-alias-state-business-primary, #3b82f6); border-color: var(--dsw-alias-state-business-primary, #3b82f6); }",
      ".dsh-manus-textarea { min-height: 96px; font-family: inherit; }",
      ".dsh-manus-progress { font-size: 12.5px; color: var(--dsw-alias-label-secondary, #666); white-space: pre-wrap; }",
      ".dsh-manus-result { flex: 1; min-height: 120px; max-height: 260px; overflow-y: auto; padding: 10px 12px; background: var(--dsw-alias-bg-layer-2, #f6f6f6); border: 1px solid var(--dsw-alias-border-l1, #e5e5e5); border-radius: 10px; font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--dsw-alias-label-primary, #111); }",
      ".dsh-manus-tasks { flex: 1; min-height: 120px; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1, #e5e5e5); border-radius: 10px; }",
      ".dsh-manus-tasks table { width: 100%; border-collapse: collapse; font-size: 12px; }",
      ".dsh-manus-tasks th { position: sticky; top: 0; padding: 7px 10px; text-align: left; background: var(--dsw-alias-bg-layer-2, #f6f6f6); color: var(--dsw-alias-label-secondary, #666); font-weight: 600; border-bottom: 1px solid var(--dsw-alias-border-l1, #e5e5e5); white-space: nowrap; z-index: 1; }",
      ".dsh-manus-tasks td { padding: 6px 10px; border-bottom: 1px solid var(--dsw-alias-separator-primary, #eee); vertical-align: top; }",
      ".dsh-manus-tasks tr.dsh-manus-task-row { cursor: pointer; }",
      ".dsh-manus-tasks tr.dsh-manus-task-row:hover td { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.04)); }",
      ".dsh-manus-attachments { display: flex; flex-direction: column; gap: 4px; flex: none; }",
      ".dsh-manus-attach-link { font-size: 12px; color: var(--dsw-alias-state-business-primary, #3b82f6); text-decoration: none; overflow-wrap: anywhere; margin-right: 10px; }",
      ".dsh-manus-attach-dl { font-size: 11px; color: var(--dsw-alias-label-tertiary, #999); }",
      ".dsh-manus-spinner { display: inline-block; width: 11px; height: 11px; flex: none; border: 2px solid var(--dsw-alias-state-business-primary, #3b82f6); border-top-color: transparent; border-radius: 50%; animation: dshManusSpin 800ms linear infinite; vertical-align: -1px; }",
      "@keyframes dshManusSpin { to { transform: rotate(360deg); } }",
      ".dsh-manus-muted { color: var(--dsw-alias-label-tertiary, #999); font-size: 11.5px; }",
    ].join("\n");

    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return;
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    // ============================================================== icons
    var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5V5M8 11v2.5M2.5 8H5M11 8h2.5"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/></svg>';

    // ======================================================= panel controller
    function PanelController() {
      this.panelOpen = false;
      this.listeners = new Set();
    }
    PanelController.prototype.getSnapshot = function () { return { panelOpen: this.panelOpen }; };
    PanelController.prototype.subscribe = function (fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); };
    PanelController.prototype.open = function () { if (!this.panelOpen) { this.panelOpen = true; this.notify(); } };
    PanelController.prototype.close = function () { if (this.panelOpen) { this.panelOpen = false; this.notify(); } };
    PanelController.prototype.toggle = function () { this.panelOpen ? this.close() : this.open(); };
    PanelController.prototype.notify = function () { for (var _a = this.listeners.values(), it; !(it = _a.next()).done;) it.value(); };

    // ================================================================ sidebar
    var ENTRY_SELECTOR = "[data-dsh-manus-entry]";
    var OTHER_ENTRY_SELECTORS = "[data-dsh-taskboard-entry], [data-dsh-ssh-entry]";

    function sidebarRoot() {
      var column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]');
      if (column === null) return undefined;
      var logoOwner = column.querySelector('[class*="logoRow"]');
      var root = logoOwner ? logoOwner.parentElement : column.firstElementChild;
      return root || undefined;
    }

    function newSessionButton(root) {
      var nested = root.querySelector('button[class*="newSession"]');
      if (nested !== null) return nested;
      for (var i = 0; i < root.children.length; i++) {
        var child = root.children[i];
        if (child.tagName === "BUTTON") return child;
      }
      return undefined;
    }

    function createEntry(controller) {
      var entry = document.createElement("button");
      entry.type = "button";
      entry.dataset.dshManusEntry = "";
      entry.className = "dsh-manus-entry";
      entry.setAttribute("aria-label", "Manus");
      entry.setAttribute("title", "Manus：配置 Key / 发任务 / 取结果");
      entry.innerHTML = '<span class="dsh-manus-entry-icon">' + ICON + '</span><span class="dsh-manus-entry-label">Manus</span>';
      entry.addEventListener("click", function () { controller.toggle(); });
      return entry;
    }

    function placeEntry(root, entry) {
      var button = newSessionButton(root);
      if (button === undefined) return false;
      if (entry.parentElement !== root) {
        var row = button.closest('[class*="logoRow"]');
        var base = (row !== null && row.parentElement === root) ? row : button;
        var family = Array.from(root.children).filter(function (el) {
          return el instanceof HTMLElement && (el.matches(ENTRY_SELECTOR) || el.matches(OTHER_ENTRY_SELECTORS));
        });
        var anchor = family.length > 0 ? family[family.length - 1].nextElementSibling : base.nextElementSibling;
        root.insertBefore(entry, anchor);
      }
      return true;
    }

    function mountSidebarEntry(controller) {
      var entry = createEntry(controller);
      var root = undefined;
      var placed = false;
      var rootObserver = null;

      function tryPlace() {
        if (root !== undefined && !root.isConnected) {
          if (rootObserver) rootObserver.disconnect();
          root = undefined;
          placed = false;
        }
        if (placed) {
          if (document.body.contains(entry)) return;
          if (rootObserver) rootObserver.disconnect();
          root = undefined;
          placed = false;
        }
        root = root ?? sidebarRoot();
        if (root === undefined) return;
        placed = placeEntry(root, entry);
        if (placed && rootObserver) rootObserver.observe(root, { childList: true, subtree: true });
      }

      var waitObserver = new MutationObserver(function () { tryPlace(); });
      waitObserver.observe(document.body, { childList: true, subtree: true });

      rootObserver = new MutationObserver(function () {
        if (root === undefined || !root.isConnected) { placed = false; tryPlace(); return; }
        if (!root.contains(entry)) placed = placeEntry(root, entry);
      });

      var syncActive = function () {
        if (controller.getSnapshot().panelOpen) entry.dataset.active = "true";
        else delete entry.dataset.active;
      };
      var unsubscribe = controller.subscribe(syncActive);
      syncActive();
      tryPlace();

      return function () {
        waitObserver.disconnect();
        if (rootObserver) rootObserver.disconnect();
        unsubscribe();
        entry.remove();
      };
    }

    // ================================================================== panel
    var PANEL_VIEW_SELECTOR = "[data-dsh-manus-view]";
    var CONVERSATION_COLUMN_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]';
    var ACTIVE_ATTR = "data-dsh-manus-active";
    var OTHER_ACTIVE_ATTRS = ["data-dsh-taskboard-active", "data-dsh-ssh-active"];
    var ACTIVATE_EVENT = "dsh-panel-activate";
    var PANEL_NAME = "manus";

    function conversationColumn() {
      return document.querySelector(CONVERSATION_COLUMN_SELECTOR) ?? undefined;
    }

    // -------------------------------------------------------------- helpers
    function el(tag, className, textContent) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (textContent !== undefined) node.textContent = textContent;
      return node;
    }

    function api(path, options) {
      return fetch(path, options).then(function (response) {
        return response.json().catch(function () { return { ok: false, error: "HTTP " + response.status }; });
      });
    }

    function qs(params) {
      var search = new URLSearchParams();
      for (var key in params) {
        if (params[key] !== undefined && params[key] !== null && params[key] !== "") search.set(key, String(params[key]));
      }
      var text = search.toString();
      return text === "" ? "" : "?" + text;
    }

    function maskCredits(data) {
      if (!data) return "—";
      return String(data.total_credits ?? "—");
    }

    // -------------------------------------------------------------- the panel
    function mountPanel(controller, container) {

      // ---- state
      var state = {
        polling: null,      // interval id
        pollTaskId: null,
        pollTimer: null,    // timeout id
      };

      // ---- build DOM skeleton
      var panel = el("div", "dsh-manus-panel");

      var header = el("div", "dsh-manus-header");
      var title = el("h2", "dsh-manus-title", "Manus");
      var creditsBadge = el("span", "dsh-manus-badge", "积分 —");
      creditsBadge.dataset.kind = "warn";
      var refreshBtn = el("button", "dsh-manus-btn ghost", "刷新");
      header.appendChild(title);
      header.appendChild(creditsBadge);
      header.appendChild(refreshBtn);
      panel.appendChild(header);

      // config section
      var configCard = el("div", "dsh-manus-card");
      var configRow = el("div", "dsh-manus-row");
      var keyInput = el("input", "dsh-manus-input");
      keyInput.type = "password";
      keyInput.placeholder = "Manus API Key（manus.im → API 设置 → Create API Key）";
      keyInput.autocomplete = "off";
      var saveKeyBtn = el("button", "dsh-manus-btn ghost", "保存 Key");
      configRow.appendChild(keyInput);
      configRow.appendChild(saveKeyBtn);
      var configHint = el("div", "dsh-manus-hint", "读取中…");
      configCard.appendChild(configRow);
      configCard.appendChild(configHint);
      panel.appendChild(configCard);

      // new task section
      var taskCard = el("div", "dsh-manus-card");
      taskCard.appendChild(el("div", "dsh-manus-hint", "发指令给 Manus（真实消耗你的 Manus 积分）"));
      var promptInput = el("textarea", "dsh-manus-input dsh-manus-textarea");
      promptInput.placeholder = "例：调研本周 A 股具身智能板块，输出 Top5 标的分析…";
      taskCard.appendChild(promptInput);
      var taskRow = el("div", "dsh-manus-row");
      var titleInput = el("input", "dsh-manus-input");
      titleInput.placeholder = "任务标题（可选）";
      titleInput.style.flex = "0 1 220px";
      var profileSelect = el("select", "dsh-manus-input");
      profileSelect.style.flex = "0 1 140px";
      var options = [["manus-1.6", "manus-1.6（标准）"], ["manus-1.6-lite", "manus-1.6-lite（轻量）"], ["manus-1.6-max", "manus-1.6-max（最强）"]];
      options.forEach(function (pair) {
        var opt = document.createElement("option");
        opt.value = pair[0];
        opt.textContent = pair[1];
        profileSelect.appendChild(opt);
      });
      var runBtn = el("button", "dsh-manus-btn", "发送给 Manus");
      taskRow.appendChild(titleInput);
      taskRow.appendChild(profileSelect);
      taskRow.appendChild(runBtn);
      taskCard.appendChild(taskRow);
      var progress = el("div", "dsh-manus-progress");
      taskCard.appendChild(progress);
      panel.appendChild(taskCard);

      // result section
      var resultSection = el("div", "dsh-manus-section");
      resultSection.style.display = "none";
      var resultHeader = el("div", "dsh-manus-row");
      var resultTitle = el("h3", "", "结果");
      var resultUrl = el("a", "dsh-manus-attach-link");
      resultUrl.target = "_blank";
      var resultAttachments = el("div", "dsh-manus-attachments");
      var resultBody = el("div", "dsh-manus-result");
      resultHeader.appendChild(resultTitle);
      resultHeader.appendChild(resultUrl);
      resultSection.appendChild(resultHeader);
      resultSection.appendChild(resultBody);
      resultSection.appendChild(resultAttachments);
      panel.appendChild(resultSection);

      // tasks section
      var tasksSection = el("div", "dsh-manus-section");
      tasksSection.style.flex = "1";
      tasksSection.style.minHeight = "0";
      var tasksHeader = el("div", "dsh-manus-row");
      var tasksTitle = el("h3", "", "最近任务");
      var tasksRefresh = el("button", "dsh-manus-btn link", "刷新");
      var tasksSpacer = el("div", "", "");
      tasksSpacer.style.flex = "1";
      tasksHeader.appendChild(tasksTitle);
      tasksHeader.appendChild(tasksSpacer);
      tasksHeader.appendChild(tasksRefresh);
      tasksSection.appendChild(tasksHeader);
      var tasksWrap = el("div", "dsh-manus-tasks");
      var tasksTable = document.createElement("table");
      var tasksHead = document.createElement("thead");
      var headRow = document.createElement("tr");
      ["标题", "状态", "积分", "创建时间"].forEach(function (h) {
        var th = document.createElement("th");
        th.textContent = h;
        headRow.appendChild(th);
      });
      tasksHead.appendChild(headRow);
      tasksTable.appendChild(tasksHead);
      var tasksBody = document.createElement("tbody");
      tasksTable.appendChild(tasksBody);
      tasksWrap.appendChild(tasksTable);
      tasksSection.appendChild(tasksWrap);
      panel.appendChild(tasksSection);

      container.appendChild(panel);

      // ------------------------------------------------------------ logic
      function setCredits(data, ok) {
        creditsBadge.textContent = "积分 " + maskCredits(data);
        if (!ok) creditsBadge.dataset.kind = "error";
        else if ((data && data.total_credits !== undefined && data.total_credits <= 50)) creditsBadge.dataset.kind = "warn";
        else creditsBadge.dataset.kind = "ok";
      }

      function refreshCredits() {
        return api("/api/dsh-manus/credits").then(function (body) {
          setCredits(body.ok ? body.data : null, body.ok);
          return body;
        });
      }

      function refreshConfig() {
        return api("/api/dsh-manus/status").then(function (body) {
          if (!body.ok) {
            configHint.textContent = "状态查询失败：" + (body.error ?? "未知错误");
            return body;
          }
          if (body.configured) {
            configHint.textContent = "已配置（来源: " + (body.key_source === "env" ? "环境变量 MANUS_API_KEY" : "配置文件") + "，Key 掩码 " + (body.key_hint || "") + "）";
            keyInput.placeholder = "输入新 Key 可覆盖保存";
            keyInput.value = "";
          } else {
            configHint.textContent = "尚未配置 API Key：填入上方输入框并保存，或设置环境变量 MANUS_API_KEY。";
          }
          return body;
        });
      }

      function statusText(status) {
        return { created: "已创建", running: "运行中", stopped: "已完成", waiting: "等待输入", error: "失败", timeout: "等待超时" }[status] ?? status ?? "—";
      }

      function renderTasks(tasks) {
        tasksBody.textContent = "";
        if (!tasks || tasks.length === 0) {
          var tr = document.createElement("tr");
          var td = document.createElement("td");
          td.colSpan = 4;
          td.className = "dsh-manus-muted";
          td.textContent = "暂无任务";
          tr.appendChild(td);
          tasksBody.appendChild(tr);
          return;
        }
        tasks.forEach(function (task) {
          var tr = document.createElement("tr");
          tr.className = "dsh-manus-task-row";
          var tdTitle = document.createElement("td");
          tdTitle.textContent = task.title || "(无标题)";
          var tdStatus = document.createElement("td");
          tdStatus.textContent = statusText(task.status);
          var tdCredits = document.createElement("td");
          tdCredits.textContent = task.credit_usage !== undefined && task.credit_usage !== null ? String(task.credit_usage) : "-";
          var tdTime = document.createElement("td");
          tdTime.className = "dsh-manus-muted";
          tdTime.textContent = task.created_at ? new Date(task.created_at * 1000).toLocaleString("zh-CN") : "-";
          tr.appendChild(tdTitle);
          tr.appendChild(tdStatus);
          tr.appendChild(tdCredits);
          tr.appendChild(tdTime);
          tr.addEventListener("click", function () { loadTask(task.id); });
          tasksBody.appendChild(tr);
        });
      }

      function refreshTasks() {
        return api("/api/dsh-manus/tasks" + qs({ limit: 20 })).then(function (body) {
          if (body.ok) renderTasks(body.tasks);
          return body;
        });
      }

      function stopPolling() {
        if (state.polling !== null) {
          clearInterval(state.polling);
          state.polling = null;
        }
        if (state.pollTimer !== null) {
          clearTimeout(state.pollTimer);
          state.pollTimer = null;
        }
        state.pollTaskId = null;
      }

      // Local fallback for old callers: scan messages for attachments when the
      // server route didn't supply a precomputed list with preview URLs.
      function collectAttachmentsFromMessages(messages) {
        var out = [];
        (messages || []).forEach(function (m) {
          if (m.type === "assistant_message" && m.assistant_message && m.assistant_message.attachments) {
            (m.assistant_message.attachments || []).forEach(function (a) {
              if (a && a.url) out.push({ filename: a.filename || "attachment", url: a.url });
            });
          }
        });
        return out;
      }

      function showResult(taskId, summary, messages, attachments) {
        resultSection.style.display = "flex";
        resultTitle.textContent = "结果 · " + taskId;
        resultUrl.textContent = "在 manus.im 打开 ↗";
        resultUrl.href = "https://manus.im/app/" + taskId;
        resultAttachments.textContent = "";
        resultBody.textContent = "";

        var assistant = (messages || []).filter(function (m) { return m.type === "assistant_message" && m.assistant_message && m.assistant_message.content; })
          .map(function (m) { return m.assistant_message.content; });
        var errors = (messages || []).filter(function (m) { return m.type === "error_message" && m.error_message && m.error_message.content; })
          .map(function (m) { return m.error_message.content; });
        var status = summary ? summary.agent_status : null;
        var lines = [];
        if (status) lines.push("状态: " + statusText(status) + (summary.brief ? " — " + summary.brief : ""));
        lines.push(assistant.join("\n\n"));
        if (errors.length) lines.push("错误: " + errors.join("\n"));
        resultBody.textContent = lines.join("\n\n");

        // Prefer server-computed attachments (carry preview_url from the
        // verbose message history). Fall back to scanning messages when the
        // server omitted the array (legacy callers).
        var list = (Array.isArray(attachments) && attachments.length > 0)
          ? attachments
          : collectAttachmentsFromMessages(messages);
        var seen = new Set();
        list.forEach(function (a) {
          if (!a || !a.url || seen.has(a.url)) return;
          seen.add(a.url);
          var previewUrl = a.preview_url || ("https://manus.im/app/" + taskId);
          var link = el("a", "dsh-manus-attach-link", "↗ " + (a.filename || "attachment"));
          link.href = previewUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.title = "在 manus.im 浏览器新窗口打开：" + (a.filename || "");
          resultAttachments.appendChild(link);
          // Secondary opt-in: download the file via the loopback proxy when
          // the user prefers a local copy over the Manus web preview.
          var dl = el("a", "dsh-manus-attach-link dsh-manus-attach-dl", "⬇");
          dl.href = "/api/dsh-manus/attachment" + qs({ url: a.url, filename: a.filename });
          dl.setAttribute("download", a.filename || "attachment");
          dl.title = "下载到本机：" + (a.filename || "");
          resultAttachments.appendChild(dl);
        });
      }

      function pollOnce(taskId) {
        return api("/api/dsh-manus/task/messages" + qs({ task_id: taskId, limit: 100 })).then(function (body) {
          if (!body.ok) {
            progress.textContent = "查询失败: " + (body.error ?? "未知错误");
            return null;
          }
          var messages = body.messages || [];
          var attachments = body.attachments || [];
          var summary = null;
          for (var i = messages.length - 1; i >= 0; i--) {
            if (messages[i].type === "status_update" && messages[i].status_update) {
              summary = messages[i].status_update;
              break;
            }
          }
          if (summary) {
            progress.textContent = "状态: " + statusText(summary.agent_status) + (summary.brief ? " — " + summary.brief : "");
          }
          showResult(taskId, summary, messages, attachments);
          return summary;
        });
      }

      function startPolling(taskId, maxMs) {
        stopPolling();
        state.pollTaskId = taskId;
        progress.textContent = "任务已创建，轮询进度中…";
        pollOnce(taskId);
        state.polling = setInterval(function () { pollOnce(taskId); }, 4000);
        state.pollTimer = setTimeout(function () {
          progress.textContent = "轮询已暂停（后台任务仍在运行）。点击「最近任务」中的该任务可继续查看。";
          stopPolling();
        }, maxMs);
      }

      function createTask() {
        var prompt = promptInput.value.trim();
        if (!prompt) {
          progress.textContent = "请先输入任务指令。";
          return;
        }
        runBtn.disabled = true;
        runBtn.textContent = "发送中…";
        progress.textContent = "正在创建任务…";
        api("/api/dsh-manus/tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            title: titleInput.value.trim() || undefined,
            agent_profile: profileSelect.value,
            locale: "zh-CN",
          }),
        }).then(function (body) {
          runBtn.disabled = false;
          runBtn.textContent = "发送给 Manus";
          if (!body.ok || !body.task) {
            progress.textContent = "创建失败: " + (body.error ?? "未知错误");
            return;
          }
          startPolling(body.task.task_id, 10 * 60 * 1000);
          refreshTasks();
        }).catch(function (error) {
          runBtn.disabled = false;
          runBtn.textContent = "发送给 Manus";
          progress.textContent = "创建失败: " + String(error);
        });
      }

      function loadTask(taskId) {
        stopPolling();
        progress.textContent = "";
        resultSection.style.display = "flex";
        resultTitle.textContent = "任务 " + taskId;
        resultUrl.textContent = "在 manus.im 打开 ↗";
        resultUrl.href = "https://manus.im/app/" + taskId;
        resultAttachments.textContent = "";
        resultBody.textContent = "加载中…";
        api("/api/dsh-manus/task/messages" + qs({ task_id: taskId, limit: 200 })).then(function (body) {
          if (!body.ok) {
            resultBody.textContent = "查询失败: " + (body.error ?? "未知错误");
            return;
          }
          showResult(taskId, null, body.messages || [], body.attachments || []);
        });
      }

      // bindings
      saveKeyBtn.addEventListener("click", function () {
        var key = keyInput.value.trim();
        if (!key) { refreshConfig(); return; }
        saveKeyBtn.disabled = true;
        api("/api/dsh-manus/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ apiKey: key }),
        }).then(function (body) {
          saveKeyBtn.disabled = false;
          keyInput.value = "";
          if (body.ok) {
            configHint.textContent = "已保存（来源: " + (body.key_source === "env" ? "环境变量 MANUS_API_KEY" : "配置文件") + "）";
            refreshCredits();
          } else {
            configHint.textContent = "保存失败: " + (body.error ?? "未知错误");
          }
        });
      });
      runBtn.addEventListener("click", createTask);
      refreshBtn.addEventListener("click", function () { refreshCredits(); refreshTasks(); });
      tasksRefresh.addEventListener("click", function () { refreshTasks(); });
      titleInput.addEventListener("keydown", function (event) { if (event.key === "Enter") createTask(); });

      // initial load
      refreshConfig();
      refreshCredits();
      refreshTasks();

      // ------------------------------------------------- visibility wiring
      var applyActive = function () {
        if (controller.getSnapshot().panelOpen) {
          OTHER_ACTIVE_ATTRS.forEach(function (attr) { document.documentElement.removeAttribute(attr); });
          document.documentElement.setAttribute(ACTIVE_ATTR, "");
          document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: PANEL_NAME }));
        } else {
          document.documentElement.removeAttribute(ACTIVE_ATTR);
        }
      };
      var onOtherActivate = function (event) {
        var name = event.detail;
        if (name !== PANEL_NAME && name !== undefined && controller.getSnapshot().panelOpen) {
          if (name === "taskboard" || name === "ssh") controller.close();
        }
      };
      var SIDEBAR_ROW_SELECTOR = '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]';
      var onClickSidebarRow = function (event) {
        if (!controller.getSnapshot().panelOpen) return;
        var target = event.target;
        if (target === null || !(target instanceof Element)) return;
        if (target.closest(SIDEBAR_ROW_SELECTOR) !== null) controller.close();
      };
      document.addEventListener("click", onClickSidebarRow, true);
      document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
      var unsubscribe = controller.subscribe(applyActive);
      applyActive();

      return function () {
        document.removeEventListener("click", onClickSidebarRow, true);
        document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
        unsubscribe();
        stopPolling();
        document.documentElement.removeAttribute(ACTIVE_ATTR);
        container.remove();
      };
    }

    function mountPanelIntoColumn(controller) {
      var mounted = null;

      function ensure() {
        if (mounted !== null) {
          if (mounted.container.isConnected) return;
          mounted.dispose();
          mounted = null;
        }
        var column = conversationColumn();
        if (column === undefined) return;
        var container = document.createElement("div");
        container.dataset.dshManusView = "";
        container.className = "dsh-manus-view";
        column.appendChild(container);
        var dispose = mountPanel(controller, container);
        mounted = { container: container, dispose: dispose };
      }

      var waitObserver = new MutationObserver(function () { ensure(); });
      waitObserver.observe(document.body, { childList: true, subtree: true });
      ensure();

      return function () {
        waitObserver.disconnect();
        if (mounted !== null) { mounted.dispose(); mounted = null; }
      };
    }

    // ================================================================ entry
    var inject = [];

    function apply(ctx) {
      var controller = new PanelController();
      var disposers = [];
      try {
        ensureStyles();
        disposers.push(mountSidebarEntry(controller));
        disposers.push(mountPanelIntoColumn(controller));
      } catch (error) {
        console.warn("[dsh-manus] mount failed:", error);
      }
      ctx.effect(function () {
        return function () {
          for (var i = 0; i < disposers.length; i++) disposers[i]();
          disposers = [];
        };
      }, "dsh-manus: ui mounts");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
