const $ = (id) => document.getElementById(id);
const setTxt = (id, t, cls) => {
  const el = $(id);
  el.textContent = t;
  el.className = cls || "";
};

const PROMPT_KEY = "brainhub.lastPrompt";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function ensureContent(tabId) {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    if (r?.ok) return true;
  } catch {}
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    const r2 = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    return !!r2?.ok;
  } catch (e) {
    return false;
  }
}

async function diagnose() {
  const tab = await getActiveTab();
  setTxt("dTab", tab ? "ok" : "ko", tab ? "ok" : "ko");
  const isLovable = !!tab?.url && /^https:\/\/lovable\.dev\//.test(tab.url);
  setTxt("dUrl", isLovable ? "ok" : "ko", isLovable ? "ok" : "ko");
  if (!tab || !isLovable) {
    setTxt("dCs", "n/d", "ko");
    return { tab: null };
  }
  const ready = await ensureContent(tab.id);
  setTxt("dCs", ready ? "sì" : "no", ready ? "ok" : "ko");
  return { tab, ready };
}

async function doInsert({ preferActive = false, sendAfter = false } = {}) {
  setTxt("msg", "");
  const prompt = $("prompt").value;
  if (!prompt.trim()) {
    setTxt("msg", "Scrivi un prompt prima.", "ko");
    return;
  }
  await chrome.storage.local.set({ [PROMPT_KEY]: prompt });

  const { tab, ready } = await diagnose();
  if (!tab) return setTxt("msg", "Nessun tab attivo.", "ko");
  if (!ready) {
    setTxt("dErr", "content script non disponibile", "ko");
    return setTxt("msg", "Apri https://lovable.dev e riprova.", "ko");
  }

  if (sendAfter) {
    const ok = confirm("Inserire il prompt e premere Invio nella chat Lovable?");
    if (!ok) {
      setTxt("msg", "Invio annullato.", "ko");
      return;
    }
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: "INSERT_PROMPT",
      prompt,
      preferActive,
      sendAfter,
    });
    setTxt("dField", res?.ok ? "sì" : "no", res?.ok ? "ok" : "ko");
    setTxt("dMethod", res?.method || "—");
    setTxt("dErr", res?.error || "—", res?.error ? "ko" : "");
    if (res?.ok) {
      setTxt("msg", sendAfter ? "Prompt inserito e inviato." : "Prompt inserito correttamente.", "ok");
    } else {
      setTxt(
        "msg",
        res?.error || "Campo chat non trovato. Clicca dentro la chat Lovable e poi premi 'Usa campo attivo'.",
        "ko",
      );
    }
  } catch (e) {
    setTxt("dErr", String(e?.message || e), "ko");
    setTxt("msg", "Errore di comunicazione con la pagina.", "ko");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const { [PROMPT_KEY]: saved } = await chrome.storage.local.get(PROMPT_KEY);
  if (saved) $("prompt").value = saved;
  diagnose();
  $("btnInsert").addEventListener("click", () => doInsert({ preferActive: false, sendAfter: false }));
  $("btnActive").addEventListener("click", () => doInsert({ preferActive: true, sendAfter: false }));
  $("btnInsertSend").addEventListener("click", () => doInsert({ preferActive: true, sendAfter: true }));
});
