# Brain Hub · Lovable Browser Bridge

Estensione Chrome (Manifest V3) per inserire un prompt nella chat Lovable in modo robusto, anche con editor custom (Lexical / ProseMirror / Slate) o contenteditable annidati.

Attiva solo su `https://lovable.dev/*`. Nessun login automatico, nessun salvataggio di password / token / cookie.

## Installazione (sviluppatore)

1. Scarica `lovable-bridge.zip` dalla pagina dell'app oppure usa direttamente la cartella `extension/`.
2. Apri `chrome://extensions`.
3. Attiva **Modalità sviluppatore** (in alto a destra).
4. Clicca **Carica estensione non pacchettizzata** e seleziona la cartella `extension/` (o decomprimi prima lo zip).

Funziona su Chrome, Edge, Brave, Arc, Opera.

## Uso

1. Apri il tuo progetto su `https://lovable.dev/...`.
2. **Clicca dentro il campo chat di Lovable** (importante per i casi con editor custom).
3. Apri l'estensione (icona in alto).
4. Incolla il prompt nel popup.
5. Premi uno dei bottoni:
   - **Inserisci prompt** — cerca automaticamente la chat (textarea, contenteditable, role=textbox, parole chiave Ask/Message/prompt/chat/Lovable).
   - **Usa campo attivo** — usa esattamente il campo dove hai cliccato. Da usare se "Inserisci prompt" non trova la chat.
   - **Inserisci e invia con conferma** — inserisce e dopo conferma esplicita simula Invio.

Se l'inserimento non funziona, controlla il pannello diagnostica nel popup:

- Tab attivo
- URL Lovable
- Content script caricato
- Campo chat trovato
- Metodo usato (`activeElement` / `lastUserField` / `keyword-match` / `lastTextarea` / `lastContentEditable` / `lastRoleTextbox` / `lastInput`)
- Ultimo errore

Messaggio tipico se la chat non è raggiungibile:
> Campo chat non trovato. Clicca dentro la chat Lovable e poi premi 'Usa campo attivo'.

## Limiti

- Niente Google Login automatico (Google blocca i browser embedded). Accedi a Lovable manualmente nel tuo Chrome.
- Nessuna API privata Lovable, nessuno scraping.
- I risultati restano da verificare manualmente.
