"use strict";
(() => {
  // src/client/lobby.ts
  function getRequiredElement(id) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Missing element #${id}`);
    }
    return el;
  }
  function initLobbyClient() {
    const btn = getRequiredElement("load-session-btn");
    const output = getRequiredElement("activity-output");
    const tpl = getRequiredElement("activity-row-template");
    if (!(btn instanceof HTMLButtonElement)) {
      throw new Error("#load-session-btn must be a button");
    }
    if (!(tpl instanceof HTMLTemplateElement)) {
      throw new Error("#activity-row-template must be a <template>");
    }
    btn.addEventListener("click", () => {
      void (async () => {
        const res = await fetch("/api/session", {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        const fragment = tpl.content.cloneNode(true);
        const messageEl = fragment.querySelector('[data-field="message"]');
        const timeEl = fragment.querySelector('[data-field="time"]');
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = `Signed in as ${data.email}`;
        }
        if (timeEl instanceof HTMLElement) {
          timeEl.textContent = data.serverTime;
        }
        output.replaceChildren(fragment);
      })();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLobbyClient);
  } else {
    initLobbyClient();
  }
})();
//# sourceMappingURL=lobby.js.map
