/**
 * M8: Client-side fetch + <template> clone (no innerHTML / HTML string literals).
 */

interface SessionPayload {
  email: string;
  serverTime: string;
}

function getRequiredElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id}`);
  }
  return el;
}

function initLobbyClient(): void {
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
    void (async (): Promise<void> => {
      const res = await fetch("/api/session", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as SessionPayload;
      const fragment = tpl.content.cloneNode(true) as DocumentFragment;
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
