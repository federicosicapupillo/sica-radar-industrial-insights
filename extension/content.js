/* Brain Hub · Lovable Browser Bridge - content script
 * Strategia robusta per inserire un prompt nella chat Lovable.
 * Nessun login automatico, nessuna lettura di credenziali.
 */
(() => {
  if (window.__brainhubLovableBridge) return;
  window.__brainhubLovableBridge = true;

  const LOG = (...a) => console.debug("[BrainHub Bridge]", ...a);

  // Ultimo elemento cliccato/focused dall'utente, salvato anche dopo blur (popup ruba focus)
  let lastUserField = null;
  const isFieldLike = (el) =>
    !!el &&
    (el.tagName === "TEXTAREA" ||
      el.tagName === "INPUT" ||
      el.isContentEditable === true ||
      el.getAttribute?.("role") === "textbox");

  const remember = (el) => {
    if (isFieldLike(el) && isVisible(el)) {
      lastUserField = el;
    }
  };
  document.addEventListener("focusin", (e) => remember(e.target), true);
  document.addEventListener("pointerdown", (e) => remember(e.target), true);

  function isVisible(el) {
    if (!el || !el.getClientRects) return false;
    const rects = el.getClientRects();
    if (!rects.length) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 10 && r.height > 10;
  }

  function findChatField(preferActive = false) {
    // 1. activeElement
    const ae = document.activeElement;
    if (preferActive && isFieldLike(ae) && isVisible(ae)) {
      return { el: ae, method: "activeElement" };
    }
    // last remembered user field
    if (preferActive && lastUserField && document.contains(lastUserField) && isVisible(lastUserField)) {
      return { el: lastUserField, method: "lastUserField" };
    }

    const textareas = Array.from(document.querySelectorAll("textarea")).filter(isVisible);
    const editables = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable=""]')).filter(isVisible);
    const roleBoxes = Array.from(document.querySelectorAll('[role="textbox"]')).filter(isVisible);
    LOG("textareas:", textareas.length, "contenteditable:", editables.length, "roleBoxes:", roleBoxes.length);

    const matchesChat = (el) => {
      const hay = [
        el.getAttribute?.("aria-label"),
        el.getAttribute?.("placeholder"),
        el.getAttribute?.("data-placeholder"),
        el.getAttribute?.("name"),
        el.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return /ask|message|prompt|chat|lovable/.test(hay);
    };

    const candidates = [...textareas, ...editables, ...roleBoxes];
    const matched = candidates.find(matchesChat);
    if (matched) return { el: matched, method: "keyword-match" };

    if (textareas.length) return { el: textareas[textareas.length - 1], method: "lastTextarea" };
    if (editables.length) return { el: editables[editables.length - 1], method: "lastContentEditable" };
    if (roleBoxes.length) return { el: roleBoxes[roleBoxes.length - 1], method: "lastRoleTextbox" };

    // ultimo fallback: input testuali
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).filter(isVisible);
    if (inputs.length) return { el: inputs[inputs.length - 1], method: "lastInput" };
    return { el: null, method: "none" };
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
  }

  function insertIntoField(el, text) {
    try {
      el.focus();
    } catch {}

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      setNativeValue(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (el.isContentEditable || el.getAttribute("role") === "textbox") {
      // Tenta execCommand (gestito dalla maggior parte degli editor custom: Lexical, ProseMirror, Slate)
      try {
        // Seleziona tutto il contenuto esistente per sostituirlo
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        sel?.removeAllRanges();
        sel?.addRange(range);
        const ok = document.execCommand("insertText", false, text);
        if (ok) {
          el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
          return true;
        }
      } catch (e) {
        LOG("execCommand failed", e);
      }
      // Fallback: textContent
      try {
        el.textContent = text;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
        return true;
      } catch (e) {
        LOG("textContent fallback failed", e);
        return false;
      }
    }
    return false;
  }

  function pressEnter(el) {
    const opts = { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 };
    el.dispatchEvent(new KeyboardEvent("keydown", opts));
    el.dispatchEvent(new KeyboardEvent("keypress", opts));
    el.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      if (msg?.type === "PING") {
        sendResponse({ ok: true, ready: true, url: location.href });
        return true;
      }
      if (msg?.type === "INSERT_PROMPT") {
        const { prompt, preferActive, sendAfter } = msg;
        const { el, method } = findChatField(!!preferActive);
        if (!el) {
          sendResponse({
            ok: false,
            method: "none",
            error: "Campo chat non trovato. Clicca dentro la chat Lovable e poi premi 'Usa campo attivo'.",
          });
          return true;
        }
        const inserted = insertIntoField(el, String(prompt || ""));
        LOG("inserted via", method, "->", inserted);
        if (inserted && sendAfter) {
          setTimeout(() => pressEnter(el), 120);
        }
        sendResponse({
          ok: inserted,
          method,
          tag: el.tagName.toLowerCase(),
          error: inserted ? null : "Inserimento fallito sul campo trovato.",
        });
        return true;
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
    return true;
  });

  LOG("content script ready");
})();
