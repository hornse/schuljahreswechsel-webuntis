/*!
 * Schuljahreswechsel WebUntis
 * Copyright (C) 2026 Sebastian Horn, Friedrich-Rückert-Gymnasium Düsseldorf
 * SPDX-License-Identifier: GPL-3.0-or-later
 * https://github.com/hornse/schuljahreswechsel-webuntis
 */
// ============================================================================
// Schuljahreswechsel WebUntis - Frontend
// ============================================================================
// Bewusst ohne Build-Schritt/Framework: ein STATE-Objekt hält den aktuellen
// Zustand, render() baut daraus jedes Mal die komplette #app-Ansicht neu auf.
// Das ist für die Größe dieser App einfacher zu warten als ein "richtiges"
// Reaktivitätssystem und entspricht dem Stil anderer schulischer Tools.
//
// Seit der Erweiterung um die öffentliche Landingpage gibt es zwei
// Datenquellen für die Dashboard-Ansicht: STATE.publicDashboard (ohne
// Login, reduzierte Felder - siehe backend/api/dashboard.php) und
// STATE.schritte (nach Login, vollständige Felder). renderDashboard()
// arbeitet bewusst mit beiden, je nachdem ob STATE.user gesetzt ist.
// ============================================================================

const STATE = {
  user: null,
  schritte: [],
  schuljahre: [],
  rollen: [],
  phasen: [],
  vorlagen: [],
  vorlagenSets: [],
  publicDashboard: null,
  ansicht: 'dashboard',
  gewaehlteSchuljahr: null,  // null = aktives Schuljahr, sonst ID eines archivierten
  offeneSchritte: new Set(), // IDs von Schritten deren Detail-Box offen ist
  offeneVorlagen: new Set(), // IDs von Vorlagen deren Notiz-Box offen ist
  ganttZoom: 1,              // Tage pro Spalte: 1=Tag, 2=2Tage, 7=Woche
};

let dragZustand = null; // { id, phase } - während eines Drag-and-Drop-Vorgangs bei den Vorlagen

// ============================================================================
// Phasen-Anzeigename mit automatischer Nummerierung
// ============================================================================
// Die Nummer wird NICHT mehr im Datenbank-Namen gespeichert, sondern zur
// Laufzeit aus der Reihenfolgeposition berechnet. Das stellt sicher dass
// nach einem Drag-and-Drop die Nummern immer korrekt sind.
//
// phasenListe ist entweder STATE.phasen (nach Login, volle Objekte) oder
// wird aus den Schritten selbst abgeleitet (öffentliches Dashboard, wo
// STATE.phasen nicht geladen ist).

function phasenAnzeigeName(phaseName, phasenReihenfolge, alleSchritte) {
  // Aus allen Schritten die eindeutige, sortierte Phasen-Reihenfolge ableiten
  const reihenfolgeMap = new Map();
  for (const s of alleSchritte) {
    if (!reihenfolgeMap.has(s.phase)) {
      reihenfolgeMap.set(s.phase, s.phase_reihenfolge ?? 0);
    }
  }
  const sortiert = [...reihenfolgeMap.entries()].sort((a, b) => a[1] - b[1]);
  const index = sortiert.findIndex(([name]) => name === phaseName);
  const nummer = index >= 0 ? index + 1 : phasenReihenfolge;
  // Namen ohne vorangestellte Zahl+Punkt ausgeben (falls noch drin)
  const nameOhneNummer = phaseName.replace(/^\d+\.\s*/, '');
  return `${nummer}. ${nameOhneNummer}`;
}

// Variante für STATE.phasen (im Admin-Bereich, wo wir die volle Liste haben)
function phasenAnzeigeNameAusListe(phase) {
  const index = STATE.phasen.findIndex((p) => p.id === phase.id);
  const nameOhneNummer = phase.name.replace(/^\d+\.\s*/, '');
  return index >= 0 ? `${index + 1}. ${nameOhneNummer}` : phase.name;
}

// ============================================================================
// Bewusst kein externes Markdown-Paket (passt zur Build-losen, abhängigkeits-
// freien Philosophie dieser App) und bewusst keine vollständige Markdown-
// Implementierung, sondern nur das, was angefragt wurde: Fett, Kursiv,
// Aufzählung, nummerierte Liste, Links.
//
// WICHTIG für die Sicherheit: der Text wird ZUERST als reiner Text escaped
// (< > & werden zu Entities) und ERST DANACH werden die Markdown-Regeln
// angewendet, die selbst nur eng begrenzte, fest vorgegebene HTML-Tags
// einfügen. Andernfalls könnte jemand über dieses Feld eigenes HTML/JS
// einschleusen, das anderen eingeloggten Personen angezeigt würde.

// ============================================================================
// Eigene Farbauswahl-Komponente
// ============================================================================
const VORDEFINIERTE_FARBEN = [
  '#D98A2B', '#E85D4A', '#C0392B', '#B5577A', '#8E44AD',
  '#5B6FA8', '#2980B9', '#16A085', '#3D7B6F', '#27AE60',
  '#2ECC71', '#F39C12', '#7F8C8D', '#3B3B3B', '#1A1A2E',
];

function renderFarbwahl(aktuelleFarbe, onChange) {
  const container = document.createElement('div');
  container.className = 'farbwahl';

  const palette = document.createElement('div');
  palette.className = 'farbwahl-palette';

  for (const farbe of VORDEFINIERTE_FARBEN) {
    const kaestchen = document.createElement('button');
    kaestchen.type = 'button';
    kaestchen.className = 'farbwahl-kaestchen' + (farbe === aktuelleFarbe ? ' aktiv' : '');
    kaestchen.style.background = farbe;
    kaestchen.title = farbe;
    kaestchen.addEventListener('click', () => {
      container.querySelectorAll('.farbwahl-kaestchen').forEach((k) => k.classList.remove('aktiv'));
      kaestchen.classList.add('aktiv');
      hexInput.value = farbe;
      vorschau.style.background = farbe;
      onChange(farbe);
    });
    palette.appendChild(kaestchen);
  }
  container.appendChild(palette);

  const eigeneZeile = document.createElement('div');
  eigeneZeile.className = 'farbwahl-eigene';

  const vorschau = document.createElement('div');
  vorschau.className = 'farbwahl-vorschau';
  vorschau.style.background = aktuelleFarbe;

  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.className = 'farbwahl-hex';
  hexInput.value = aktuelleFarbe;
  hexInput.maxLength = 7;
  hexInput.placeholder = '#5B6FA8';
  hexInput.addEventListener('input', () => {
    const val = hexInput.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      vorschau.style.background = val;
      container.querySelectorAll('.farbwahl-kaestchen').forEach((k) => k.classList.remove('aktiv'));
      onChange(val);
    }
  });

  eigeneZeile.appendChild(vorschau);
  eigeneZeile.appendChild(hexInput);
  container.appendChild(eigeneZeile);
  return container;
}

function inlineFormatierung(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function markdownZuHtml(text) {
  if (!text) return '';

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const zeilen = escaped.split('\n');
  const ausgabe = [];
  let listenArt = null; // 'ul' | 'ol' | null

  function listeSchliessen() {
    if (listenArt) {
      ausgabe.push(`</${listenArt}>`);
      listenArt = null;
    }
  }

  for (const zeile of zeilen) {
    const ulMatch = zeile.match(/^[-*]\s+(.*)/);
    const olMatch = zeile.match(/^\d+\.\s+(.*)/);

    if (ulMatch) {
      if (listenArt !== 'ul') { listeSchliessen(); ausgabe.push('<ul>'); listenArt = 'ul'; }
      ausgabe.push(`<li>${inlineFormatierung(ulMatch[1])}</li>`);
    } else if (olMatch) {
      if (listenArt !== 'ol') { listeSchliessen(); ausgabe.push('<ol>'); listenArt = 'ol'; }
      ausgabe.push(`<li>${inlineFormatierung(olMatch[1])}</li>`);
    } else {
      listeSchliessen();
      ausgabe.push(zeile.trim() === '' ? '<br>' : `<p style="margin:0 0 6px;">${inlineFormatierung(zeile)}</p>`);
    }
  }
  listeSchliessen();

  return ausgabe.join('\n');
}

/**
 * Fügt Markdown-Syntax an der Cursor-Position/Auswahl eines Textfelds ein
 * (für die Formatierungs-Buttons). Bei "umschliessen" wird die Auswahl in
 * Praefix/Suffix eingepackt (z. B. **...** für Fett). Bei "zeilenPraefix"
 * wird jede betroffene Zeile mit dem Präfix versehen (für Listen).
 */
function textareaFormatierungEinfuegen(textarea, { umschliessen, zeilenPraefix } = {}) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (zeilenPraefix) {
    const zeilenStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
    let zeilenEnde = textarea.value.indexOf('\n', end);
    if (zeilenEnde === -1) zeilenEnde = textarea.value.length;

    const block = textarea.value.slice(zeilenStart, zeilenEnde);
    const neuerBlock = block.split('\n').map((z) => (z.startsWith(zeilenPraefix) ? z : zeilenPraefix + z)).join('\n');

    textarea.value = textarea.value.slice(0, zeilenStart) + neuerBlock + textarea.value.slice(zeilenEnde);
    textarea.focus();
    textarea.setSelectionRange(zeilenStart, zeilenStart + neuerBlock.length);
  } else {
    const ausgewaehlt = textarea.value.slice(start, end) || 'Text';
    textarea.value = textarea.value.slice(0, start) + umschliessen + ausgewaehlt + umschliessen + textarea.value.slice(end);
    textarea.focus();
    textarea.setSelectionRange(start + umschliessen.length, start + umschliessen.length + ausgewaehlt.length);
  }

  textarea.dispatchEvent(new Event('input'));
}

const $app = document.getElementById('app');
const $werBinIch = document.getElementById('wer-bin-ich');

// --- Kleiner fetch()-Wrapper ------------------------------------------------
// Hängt bei verändernden Methoden automatisch den CSRF-Basisschutz-Header an
// (siehe backend/bootstrap.php) und wirft bei Fehlern eine normale Error mit
// der Server-Fehlermeldung, statt dass jeder Aufrufer das selbst prüfen muss.
async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (method !== 'GET') {
    headers['X-Requested-With'] = 'SchuljahreswechselApp';
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Fehler (${res.status})`);
  }
  return data;
}

// --- Auth --------------------------------------------------------------
async function checkAuth() {
  try {
    STATE.user = await api('/api/me');
  } catch {
    STATE.user = null;
  }
}

async function doLogin(username, password) {
  STATE.user = await api('/api/login', { method: 'POST', body: { username, password } });
  await ladeAlles();
  STATE.ansicht = 'checkliste';
  render();
}

async function doLogout() {
  await api('/api/logout', { method: 'POST' });
  STATE.user = null;
  STATE.schritte = [];
  STATE.schuljahre = [];
  STATE.rollen = [];
  STATE.phasen = [];
  STATE.vorlagen = [];
  STATE.vorlagenSets = [];
  STATE.ansicht = 'dashboard';
  STATE.offeneSchritte = new Set();
  STATE.offeneVorlagen = new Set();
  render();
}

// --- Daten laden ---------------------------------------------------------
async function ladeOeffentlichesDashboard() {
  STATE.publicDashboard = await api('/api/dashboard');
}

async function ladeAlles() {
  const param = STATE.gewaehlteSchuljahr ? `?schuljahr_id=${STATE.gewaehlteSchuljahr}` : '';
  const schritteRes = await api(`/api/schritte${param}`);
  STATE.schritte = schritteRes.schritte;
  STATE.schuljahrId = schritteRes.schuljahr_id;

  if (STATE.user?.rolle === 'admin') {
    STATE.schuljahre  = await api('/api/schuljahre');
    STATE.rollen      = await api('/api/rollen');
    STATE.phasen      = await api('/api/phasen');
    STATE.vorlagen    = await api('/api/vorlagen');
    STATE.vorlagenSets = await api('/api/vorlagen-sets');
  }
}

async function toggleSchritt(id, erledigt) {
  await api(`/api/schritte/${id}`, { method: 'PATCH', body: { erledigt } });
  await ladeAlles();
  render();
}

async function aktualisiereFeld(id, feld, wert) {
  await api(`/api/schritte/${id}`, { method: 'PATCH', body: { [feld]: wert } });

  // Datumsfelder und kann_parallel: Daten neu laden und betroffene Ansichten
  // aktualisieren. Bei reinen Textfeldern (Verantwortlich, Kommentar) bewusst
  // kein Rerender – das würde den Fokus aus dem Eingabefeld reißen.
  const sofortRerender = ['kann_parallel', 'start_datum', 'geplantes_datum'];
  if (sofortRerender.includes(feld)) {
    await ladeAlles();
    await ladeOeffentlichesDashboard();
    render();
  }
}

async function neuesSchuljahr(label, setId = null) {
  const body = setId ? { label, set_id: setId } : { label };
  await api('/api/schuljahre', { method: 'POST', body });
  await ladeAlles();
  await ladeOeffentlichesDashboard();
  render();
}

async function speichereVorlagenSet(name, beschreibung) {
  await api('/api/vorlagen-sets', { method: 'POST', body: { name, beschreibung } });
  await ladeAlles();
  render();
}

async function loescheVorlagenSet(id) {
  await api(`/api/vorlagen-sets/${id}`, { method: 'DELETE' });
  await ladeAlles();
  render();
}

async function aktiviereSchuljahr(id) {
  await api(`/api/schuljahre/${id}/aktivieren`, { method: 'POST' });
  await ladeAlles();
  await ladeOeffentlichesDashboard();
  render();
}

async function setzeRolle(webuntis_user, rolle, anzeigename) {
  await api('/api/rollen', { method: 'POST', body: { webuntis_user, rolle, anzeigename } });
  await ladeAlles();
  render();
}

async function loescheRolle(webuntis_user) {
  await api(`/api/rollen/${encodeURIComponent(webuntis_user)}`, { method: 'DELETE' });
  await ladeAlles();
  render();
}

async function neueVorlage(phase_id, titel) {
  await api('/api/vorlagen', { method: 'POST', body: { phase_id, titel } });
  await ladeAlles();
  await ladeOeffentlichesDashboard();
  render();
}

async function vorlageAktualisieren(id, felder) {
  await api(`/api/vorlagen/${id}`, { method: 'PATCH', body: felder });
  await ladeAlles();
  await ladeOeffentlichesDashboard();
  render();
}

async function reihenfolgeAendern(phase_id, vorlage_ids) {
  await api('/api/vorlagen/reihenfolge', { method: 'POST', body: { phase_id, vorlage_ids } });
  await ladeAlles();
  await ladeOeffentlichesDashboard();
  render();
}

async function neuePhase(name, farbe) {
  await api('/api/phasen', { method: 'POST', body: { name, farbe } });
  await ladeAlles();
  render();
}

async function phaseAktualisieren(id, felder) {
  await api(`/api/phasen/${id}`, { method: 'PATCH', body: felder });
  await ladeAlles();
  await ladeOeffentlichesDashboard();
  render();
}

async function reihenfolgePhasenAendern(phasen_ids) {
  await api('/api/phasen/reihenfolge', { method: 'POST', body: { phasen_ids } });
  await ladeAlles();
  await ladeOeffentlichesDashboard();
  render();
}

// ============================================================================
// Rendering
// ============================================================================

function render() {
  $werBinIch.textContent = STATE.user
    ? `Angemeldet als ${STATE.user.anzeigename} (${STATE.user.rolle})`
    : '';

  $app.innerHTML = '';
  $app.appendChild(renderKopfleiste());

  if (STATE.ansicht === 'login') {
    $app.appendChild(renderLogin());
  } else if (STATE.ansicht === 'checkliste' && STATE.user) {
    $app.appendChild(renderChecklist());
  } else if (STATE.ansicht === 'zeitstrahl') {
    $app.appendChild(renderZeitstrahl());
  } else {
    $app.appendChild(renderDashboard());
  }

  if (STATE.user?.rolle === 'admin') {
    $app.appendChild(renderAdminBereich());
  }
}

function renderKopfleiste() {
  const leiste = document.createElement('div');
  leiste.className = 'top-leiste';

  let tabsHtml;
  let rechtsHtml;

  if (STATE.user) {
    tabsHtml = `
      <button class="tab ${STATE.ansicht === 'dashboard' ? 'aktiv' : ''}" data-ansicht="dashboard">Dashboard</button>
      <button class="tab ${STATE.ansicht === 'checkliste' ? 'aktiv' : ''}" data-ansicht="checkliste">Checkliste</button>
      <button class="tab ${STATE.ansicht === 'zeitstrahl' ? 'aktiv' : ''}" data-ansicht="zeitstrahl">Zeitstrahl</button>
    `;
    rechtsHtml = `<button class="btn btn-sekundaer" id="logout-btn">Abmelden</button>`;
  } else if (STATE.ansicht === 'login') {
    tabsHtml = `<button class="tab" data-ansicht="dashboard">Dashboard</button>`;
    rechtsHtml = `<button class="btn btn-sekundaer" id="abbrechen-btn">Abbrechen</button>`;
  } else {
    tabsHtml = `
      <button class="tab ${STATE.ansicht === 'dashboard' ? 'aktiv' : ''}" data-ansicht="dashboard">Dashboard</button>
      <button class="tab ${STATE.ansicht === 'zeitstrahl' ? 'aktiv' : ''}" data-ansicht="zeitstrahl">Zeitstrahl</button>
    `;
    rechtsHtml = `<button class="btn btn-sekundaer" id="anmelden-btn">Anmelden</button>`;
  }

  leiste.innerHTML = `<div class="tabs">${tabsHtml}</div>${rechtsHtml}`;

  leiste.querySelectorAll('[data-ansicht]').forEach((btn) => {
    btn.addEventListener('click', () => {
      STATE.ansicht = btn.dataset.ansicht;
      render();
    });
  });
  leiste.querySelector('#logout-btn')?.addEventListener('click', doLogout);
  leiste.querySelector('#anmelden-btn')?.addEventListener('click', () => {
    STATE.ansicht = 'login';
    render();
  });
  leiste.querySelector('#abbrechen-btn')?.addEventListener('click', () => {
    STATE.ansicht = 'dashboard';
    render();
  });

  return leiste;
}

function renderLogin() {
  const wrapper = document.createElement('div');
  wrapper.className = 'login-box';
  wrapper.innerHTML = `
    <p style="font-size:13px;color:var(--muted);margin-top:0;">
      Anmeldung mit den gewohnten WebUntis-Zugangsdaten - nur für freigegebene
      Personen (Untis/WebUntis-Team).
    </p>
    <div id="login-fehler"></div>
    <form id="login-form">
      <label for="login-user">Benutzername</label>
      <input id="login-user" type="text" autocomplete="username" required>
      <label for="login-pass">Passwort</label>
      <input id="login-pass" type="password" autocomplete="current-password" required>
      <button class="btn" type="submit">Anmelden</button>
    </form>
  `;

  wrapper.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = wrapper.querySelector('#login-user').value;
    const password = wrapper.querySelector('#login-pass').value;
    const $fehler = wrapper.querySelector('#login-fehler');
    $fehler.innerHTML = '';
    try {
      await doLogin(username, password);
    } catch (err) {
      $fehler.innerHTML = `<p class="fehler">${err.message}</p>`;
    }
  });

  return wrapper;
}

function renderChecklist() {
  const container = document.createElement('div');

  if (!STATE.schuljahrId) {
    const hinweis = document.createElement('p');
    hinweis.textContent = STATE.user.rolle === 'admin'
      ? 'Es ist noch kein Schuljahr angelegt. Lege unten eines an.'
      : 'Es ist noch kein Schuljahr angelegt. Bitte eine Admin/einen Admin bitten.';
    container.appendChild(hinweis);
    return container;
  }

  // Schuljahr-Auswahl (für alle eingeloggten Personen sichtbar, nicht nur Admins)
  // Nur anzeigen wenn mehr als ein Schuljahr existiert - dafür brauchen auch
  // Nicht-Admins die Schuljahr-Liste. Admins haben sie ohnehin geladen.
  const alleSchuljahre = STATE.schuljahre.length > 0
    ? STATE.schuljahre
    : [{ id: STATE.schuljahrId, label: '(aktuell)', aktiv: 1 }];

  const istArchiv = STATE.gewaehlteSchuljahr !== null &&
    !alleSchuljahre.find((s) => s.id === STATE.gewaehlteSchuljahr)?.aktiv;

  if (alleSchuljahre.length > 1) {
    const sjWahl = document.createElement('div');
    sjWahl.className = 'sj-wahl kein-druck';
    sjWahl.innerHTML = `
      <label for="sj-select" style="font-size:11px;color:var(--muted);">Schuljahr:</label>
      <select id="sj-select">
        ${alleSchuljahre.map((sj) => `
          <option value="${sj.id}" ${sj.id === (STATE.gewaehlteSchuljahr ?? STATE.schuljahrId) ? 'selected' : ''}>
            ${sj.label}${sj.aktiv ? ' (aktiv)' : ''}
          </option>
        `).join('')}
      </select>
    `;
    sjWahl.querySelector('#sj-select').addEventListener('change', async (e) => {
      const gewaehlteId = Number(e.target.value);
      const gewaehltesSj = alleSchuljahre.find((s) => s.id === gewaehlteId);
      STATE.gewaehlteSchuljahr = gewaehltesSj?.aktiv ? null : gewaehlteId;
      await ladeAlles();
      render();
    });
    container.appendChild(sjWahl);
  }

  if (istArchiv) {
    const hinweis = document.createElement('p');
    hinweis.className = 'archiv-hinweis kein-druck';
    hinweis.textContent = '📂 Archiv-Ansicht – dieses Schuljahr ist abgeschlossen und kann nicht mehr bearbeitet werden.';
    container.appendChild(hinweis);
  }

  const gesamt = STATE.schritte.length;
  const erledigt = STATE.schritte.filter((s) => s.erledigt).length;
  const prozent = gesamt ? Math.round((erledigt / gesamt) * 100) : 0;

  const fortschritt = document.createElement('div');
  fortschritt.className = 'progress-wrap';
  fortschritt.innerHTML = `
    <div class="progress-track"><div class="progress-fill" style="width:${prozent}%"></div></div>
    <span class="progress-label">${erledigt} / ${gesamt}</span>
  `;
  container.appendChild(fortschritt);
  container.appendChild(renderExportLeiste('checkliste'));

  // Überschneidungsbasierte Parallel-Erkennung
  const parallelIds = berechneParallelIds(STATE.schritte);

  let aktuellePhase = null;
  let aktiverParallelBlock = null; // aktuell offener Parallel-Wrapper
  let aktivesParallelDatum = null;

  for (const schritt of STATE.schritte) {
    if (schritt.phase !== aktuellePhase) {
      aktuellePhase = schritt.phase;
      // Offenen Parallel-Block schließen wenn Phase wechselt
      if (aktiverParallelBlock) {
        container.appendChild(aktiverParallelBlock);
        aktiverParallelBlock = null;
        aktivesParallelDatum = null;
      }
      const h = document.createElement('div');
      h.className = 'phase-title';
      h.style.color = schritt.phase_farbe;
      h.textContent = phasenAnzeigeName(schritt.phase, schritt.phase_reihenfolge, STATE.schritte);
      container.appendChild(h);
    }

    const istParallel = parallelIds.has(schritt.id);

    if (istParallel && schritt.geplantes_datum === aktivesParallelDatum) {
      // Gleiche Gruppe – zum offenen Block hinzufügen
      aktiverParallelBlock.appendChild(renderSchritt(schritt, istArchiv));
    } else {
      // Alten Block abschließen
      if (aktiverParallelBlock) {
        container.appendChild(aktiverParallelBlock);
        aktiverParallelBlock = null;
        aktivesParallelDatum = null;
      }

      if (istParallel) {
        // Neuen Parallel-Block eröffnen
        aktiverParallelBlock = document.createElement('div');
        aktiverParallelBlock.className = 'parallel-gruppe';
        const label = document.createElement('div');
        label.className = 'parallel-gruppe-label';
        label.innerHTML = `<span class="parallel-badge">⇉ parallel – ${formatDatum(schritt.geplantes_datum)}</span>`;
        aktiverParallelBlock.appendChild(label);
        aktiverParallelBlock.appendChild(renderSchritt(schritt, istArchiv));
        aktivesParallelDatum = schritt.geplantes_datum;
      } else {
        container.appendChild(renderSchritt(schritt, istArchiv));
      }
    }
  }

  // Letzten offenen Block noch anhängen
  if (aktiverParallelBlock) {
    container.appendChild(aktiverParallelBlock);
  }

  return container;
}

function renderSchritt(schritt, readonly = false) {
  const el = document.createElement('div');
  el.className = 'schritt' + (schritt.erledigt ? ' erledigt' : '') + (schritt.kann_parallel ? ' parallel' : '') + (readonly ? ' readonly' : '');
  el.style.setProperty('--accent', schritt.phase_farbe);

  const parallelBadge = schritt.kann_parallel
    ? `<span class="parallel-badge" title="Kann parallel zu anderen Schritten erledigt werden">⇉ parallel</span>`
    : '';

  el.innerHTML = `
    <div class="schritt-zeile">
      <span class="checkbox ${schritt.erledigt ? 'checked' : ''} ${readonly ? 'readonly' : ''}" data-rolle="checkbox"></span>
      <span class="schritt-text ${schritt.erledigt ? 'erledigt' : ''}">${schritt.titel}</span>
      ${parallelBadge}
      <span class="chev" data-rolle="chevron">▸</span>
    </div>
    <div class="schritt-detail" data-rolle="detail">
      <div class="detail-text">${markdownZuHtml(schritt.beschreibung)}</div>
      <div class="felder">
        <div class="feld"><label>Verantwortlich</label>
          <input type="text" data-feld="verantwortlich_anzeigename" value="${schritt.verantwortlich_anzeigename ?? ''}" ${readonly ? 'disabled' : ''}>
        </div>
        <div class="feld"><label>Start</label>
          <input type="date" data-feld="start_datum" value="${schritt.start_datum ?? ''}" ${readonly ? 'disabled' : ''}>
        </div>
        <div class="feld"><label>Zieldatum</label>
          <input type="date" data-feld="geplantes_datum" value="${schritt.geplantes_datum ?? ''}" ${readonly ? 'disabled' : ''}>
        </div>
        ${!readonly ? `
        <div class="feld feld-breit"><label>Kommentar (nur für angemeldete Personen)</label>
          <textarea data-feld="kommentar" rows="2" placeholder="Kurznotiz zum aktuellen Stand, z. B. verzögert sich...">${schritt.kommentar ?? ''}</textarea>
        </div>
        <div class="feld"><label>Parallel möglich</label>
          <label class="toggle-wrap">
            <input type="checkbox" data-feld="kann_parallel" ${schritt.kann_parallel ? 'checked' : ''}>
            <span class="toggle-label">für dieses Schuljahr</span>
          </label>
        </div>` : `${schritt.kommentar ? `<div class="feld feld-breit"><label>Kommentar</label><p class="kommentar-text">${schritt.kommentar}</p></div>` : ''}`}
      </div>
    </div>
  `;

  el.querySelector('[data-rolle="checkbox"]') && el.querySelector('[data-rolle="checkbox"]').addEventListener('click', (e) => {
    e.stopPropagation();
    !readonly && toggleSchritt(schritt.id, !schritt.erledigt);
  });

  // Zustand aus STATE wiederherstellen
  const detailEl  = el.querySelector('[data-rolle="detail"]');
  const chevronEl = el.querySelector('[data-rolle="chevron"]');
  if (STATE.offeneSchritte.has(schritt.id)) {
    detailEl.classList.add('offen');
    chevronEl.classList.add('offen');
  }

  el.querySelector('.schritt-zeile').addEventListener('click', () => {
    const istOffen = detailEl.classList.toggle('offen');
    chevronEl.classList.toggle('offen');
    // Zustand in STATE persistieren
    if (istOffen) {
      STATE.offeneSchritte.add(schritt.id);
    } else {
      STATE.offeneSchritte.delete(schritt.id);
    }
  });

  if (!readonly) {
    el.querySelectorAll('[data-feld]').forEach((input) => {
      input.addEventListener('change', () => {
        const wert = input.type === 'checkbox' ? input.checked : input.value;
        aktualisiereFeld(schritt.id, input.dataset.feld, wert);
      });
    });
  }

  return el;
}

// Prüft ob zwei Schritte sich zeitlich überschneiden (mind. 1 Tag).
// Schritte ohne start_datum werden als Einzel-Tag behandelt
// (start = geplantes_datum). Schritte ohne jedes Datum sind nie parallel.
function ueberschneidenSich(a, b) {
  if (!a.geplantes_datum || !b.geplantes_datum) return false;
  const aStart = a.start_datum ?? a.geplantes_datum;
  const aEnde  = a.geplantes_datum;
  const bStart = b.start_datum ?? b.geplantes_datum;
  const bEnde  = b.geplantes_datum;
  // Überschneidung: aStart <= bEnde && bStart <= aEnde
  return aStart <= bEnde && bStart <= aEnde;
}

// Gibt ein Set von Schritt-IDs zurück, die mit mindestens einem anderen
// Schritt zeitlich überlappen.
function berechneParallelIds(liste) {
  const terminiert = liste.filter((s) => s.geplantes_datum);
  const parallelIds = new Set();
  for (let i = 0; i < terminiert.length; i++) {
    for (let j = i + 1; j < terminiert.length; j++) {
      if (ueberschneidenSich(terminiert[i], terminiert[j])) {
        parallelIds.add(terminiert[i].id ?? i);
        parallelIds.add(terminiert[j].id ?? j);
      }
    }
  }
  return parallelIds;
}
// ============================================================================
// Bewusst ohne eigenen zusätzlichen API-Endpunkt für die Berechnung selbst -
// das passiert im Browser auf Basis der schon geladenen Daten. Ohne Login
// kommen die (reduzierten) Daten aus STATE.publicDashboard, mit Login aus
// STATE.schritte (volle Felder, u. a. "Verantwortlich"). "Aktuell dran" =
// der erste noch offene Schritt in der festgelegten Reihenfolge, unabhängig
// vom optionalen Datumsfeld. Das Datumsfeld fließt zusätzlich in die Listen
// "Überfällig"/"Demnächst" ein, für alle, die ein Datum eingetragen haben.

function heuteISO() {
  return new Date().toISOString().slice(0, 10);
}

function inNTagenISO(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDatum(iso) {
  const [, monat, tag] = iso.split('-');
  return `${tag}.${monat}.`;
}

function berechneDashboardDaten(liste) {
  const heute = heuteISO();
  const in14Tagen = inNTagenISO(14);

  const offen = liste.filter((s) => !s.erledigt);
  const aktuell = offen[0] ?? null;

  const ueberfaellig = offen
    .filter((s) => s.geplantes_datum && s.geplantes_datum < heute)
    .sort((a, b) => a.geplantes_datum.localeCompare(b.geplantes_datum));

  const demnaechst = offen
    .filter((s) => s.geplantes_datum && s.geplantes_datum >= heute && s.geplantes_datum <= in14Tagen)
    .sort((a, b) => a.geplantes_datum.localeCompare(b.geplantes_datum));

  // Daten mit mehr als einem offenen Schritt = parallel
  // Überschneidungsbasierte Parallel-Erkennung
  const parallelIds = berechneParallelIds(offen);

  const phasen = new Map();
  for (const s of liste) {
    if (!phasen.has(s.phase)) {
      phasen.set(s.phase, { farbe: s.phase_farbe, reihenfolge: s.phase_reihenfolge ?? 0, gesamt: 0, erledigt: 0 });
    }
    const eintrag = phasen.get(s.phase);
    eintrag.gesamt += 1;
    if (s.erledigt) eintrag.erledigt += 1;
  }

  return { aktuell, ueberfaellig, demnaechst, phasen, parallelIds };
}

function renderDashboard() {
  const container = document.createElement('div');
  const eingeloggt = !!STATE.user;
  const liste = eingeloggt ? STATE.schritte : (STATE.publicDashboard?.schritte ?? []);

  if (!eingeloggt && STATE.publicDashboard?.schuljahr_label) {
    const ueberschrift = document.createElement('p');
    ueberschrift.className = 'dash-schuljahr';
    ueberschrift.textContent = `Schuljahreswechsel ${STATE.publicDashboard.schuljahr_label}`;
    container.appendChild(ueberschrift);
  }

  if (liste.length === 0) {
    const hinweis = document.createElement('p');
    hinweis.textContent = eingeloggt && STATE.user.rolle === 'admin'
      ? 'Aktuell ist kein Schuljahreswechsel im Gange. Lege unten eines an.'
      : 'Aktuell ist kein Schuljahreswechsel im Gange.';
    container.appendChild(hinweis);
    return container;
  }

  const { aktuell, ueberfaellig, demnaechst, phasen, parallelIds } = berechneDashboardDaten(liste);

  const aktuellBlock = document.createElement('div');
  aktuellBlock.className = 'dash-block dash-aktuell';
  aktuellBlock.style.setProperty('--accent', aktuell?.phase_farbe ?? 'var(--accent-default)');
  if (aktuell) {
    const metaTeile = [phasenAnzeigeName(aktuell.phase, aktuell.phase_reihenfolge, liste)];
    if (aktuell.verantwortlich_anzeigename !== undefined) {
      metaTeile.push(aktuell.verantwortlich_anzeigename || 'noch niemand zugewiesen');
    }
    const parallelHinweis = (aktuell.kann_parallel || (parallelIds.has(aktuell.id)))
      ? `<span class="parallel-badge" style="margin-left:6px;">⇉ parallel</span>` : '';
    aktuellBlock.innerHTML = `
      <p class="dash-label">Aktuell dran</p>
      <p class="dash-titel" style="color:${aktuell.phase_farbe}">${aktuell.titel}${parallelHinweis}</p>
      <p class="dash-meta">${metaTeile.join(' · ')}</p>
    `;
  } else {
    aktuellBlock.innerHTML = `<p class="dash-label">Aktuell dran</p><p class="dash-titel">Alles erledigt 🎉</p>`;
  }
  container.appendChild(aktuellBlock);

  if (ueberfaellig.length) {
    container.appendChild(renderDashListe('Überfällig', ueberfaellig, true, parallelIds));
  }
  if (demnaechst.length) {
    container.appendChild(renderDashListe('Demnächst (14 Tage)', demnaechst, false, parallelIds));
  }

  const phasenBlock = document.createElement('div');
  phasenBlock.className = 'dash-block';
  phasenBlock.innerHTML = '<p class="dash-label">Fortschritt je Phase</p>';
  for (const [phase, daten] of phasen) {
    const prozent = daten.gesamt ? Math.round((daten.erledigt / daten.gesamt) * 100) : 0;
    const zeile = document.createElement('div');
    zeile.className = 'dash-phasenzeile';
    zeile.innerHTML = `
      <span class="dash-phasenname" style="color:${daten.farbe}">${phasenAnzeigeName(phase, daten.reihenfolge, liste)}</span>
      <div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:${prozent}%;background:${daten.farbe}"></div></div>
      <span class="progress-label">${daten.erledigt}/${daten.gesamt}</span>
    `;
    phasenBlock.appendChild(zeile);
  }
  container.appendChild(phasenBlock);

  return container;
}

function renderDashListe(titel, liste, istUeberfaellig, parallelIds = new Set()) {
  const block = document.createElement('div');
  block.className = 'dash-block';
  const items = liste.map((s) => {
    const istParallel = s.kann_parallel || (parallelIds.has(s.id));
    return `
      <li>
        <span class="dash-datum ${istUeberfaellig ? 'dash-datum-rot' : ''}">${formatDatum(s.geplantes_datum)}</span>
        <span>${s.titel}</span>
        ${istParallel ? '<span class="parallel-badge">⇉</span>' : ''}
      </li>
    `;
  }).join('');
  block.innerHTML = `<p class="dash-label">${titel}</p><ul class="dash-liste">${items}</ul>`;
  return block;
}
// ============================================================================
// Zeitstrahl-Ansicht (Gantt + Timeline)
// ============================================================================

function renderZeitstrahl() {
  const eingeloggt = !!STATE.user;
  const liste = eingeloggt ? STATE.schritte : (STATE.publicDashboard?.schritte ?? []);

  const container = document.createElement('div');

  if (liste.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Keine Daten vorhanden.';
    container.appendChild(p);
    return container;
  }

  let aktiverUntertab = 'gantt';

  function renderUntertabs() {
    container.innerHTML = '';
    const tabs = document.createElement('div');
    tabs.className = 'zeitstrahl-tabs kein-druck';
    tabs.innerHTML = `
      <button class="zt-tab ${aktiverUntertab === 'gantt' ? 'aktiv' : ''}" data-zt="gantt">Gantt</button>
      <button class="zt-tab ${aktiverUntertab === 'timeline' ? 'aktiv' : ''}" data-zt="timeline">Timeline</button>
    `;
    tabs.querySelectorAll('[data-zt]').forEach((btn) => {
      btn.addEventListener('click', () => { aktiverUntertab = btn.dataset.zt; renderUntertabs(); });
    });
    tabs.appendChild(renderExportLeiste('zeitstrahl'));
    container.appendChild(tabs);
    container.appendChild(aktiverUntertab === 'gantt' ? renderGantt(liste, eingeloggt) : renderTimeline(liste, eingeloggt));
  }

  renderUntertabs();
  return container;
}

function renderGantt(liste, eingeloggt) {
  const mitDatum  = liste.filter((s) => s.geplantes_datum);
  const ohneDatum = liste.filter((s) => !s.geplantes_datum);
  const wrapper   = document.createElement('div');

  if (mitDatum.length === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--muted);font-size:13px;';
    p.textContent = 'Noch keine Datumsangaben eingetragen – bitte in der Checkliste Daten setzen.';
    wrapper.appendChild(p);
    if (ohneDatum.length) wrapper.appendChild(renderOhneDatumListe(ohneDatum));
    return wrapper;
  }

  const daten    = mitDatum.flatMap((s) => s.start_datum ? [s.start_datum, s.geplantes_datum] : [s.geplantes_datum]).sort();
  const minDatum = new Date(daten[0]);
  const maxDatum = new Date(daten[daten.length - 1]);
  const heute    = heuteISO();
  const zoom     = STATE.ganttZoom;
  const spanTage = Math.max(7, Math.ceil((maxDatum - minDatum) / 86400000) + 2);
  const spanSpalten = Math.ceil(spanTage / zoom);

  // Zoom-Regler
  const zoomZeile = document.createElement('div');
  zoomZeile.className = 'gantt-zoom kein-druck';
  const zoomLabels = { 1: 'Tagesansicht', 2: '2 Tage/Spalte', 3: '3 Tage/Spalte', 7: 'Wochenansicht' };
  zoomZeile.innerHTML = `
    <span>Zoom:</span>
    <input type="range" min="1" max="7" step="1" value="${zoom}" id="gantt-zoom-slider">
    <span id="gantt-zoom-label">${zoomLabels[zoom] || zoom + ' Tage/Spalte'}</span>
  `;
  zoomZeile.querySelector('#gantt-zoom-slider').addEventListener('input', (e) => {
    STATE.ganttZoom = Number(e.target.value);
    const neuerGantt = renderGantt(liste, eingeloggt);
    wrapper.replaceWith(neuerGantt);
  });
  wrapper.appendChild(zoomZeile);

  const phasenReihenfolge = [];
  const gesehene = new Set();
  for (const s of liste) {
    if (!gesehene.has(s.phase)) { phasenReihenfolge.push(s.phase); gesehene.add(s.phase); }
  }

  const gantt = document.createElement('div');
  gantt.className = 'gantt-wrap';

  const kopfzeile = document.createElement('div');
  kopfzeile.className = 'gantt-kopf';
  let kopfHtml = '<div class="gantt-label-zelle"></div>';
  for (let i = 0; i < spanSpalten; i++) {
    const d = new Date(minDatum); d.setDate(d.getDate() + i * zoom);
    const iso = d.toISOString().slice(0, 10);
    const endD = new Date(d.getTime() + (zoom - 1) * 86400000);
    const istHeuteSpalte = iso <= heute && heute <= endD.toISOString().slice(0, 10);
    const label = `${d.getDate()}.${d.getMonth()+1}.`;
    kopfHtml += `<div class="gantt-tag ${istHeuteSpalte ? 'gantt-heute' : ''}" title="${iso}">${label}</div>`;
  }
  kopfzeile.innerHTML = kopfHtml;
  gantt.appendChild(kopfzeile);

  const tagZuSpalte = (iso) => Math.floor(Math.round((new Date(iso) - minDatum) / 86400000) / zoom);

  let letztePhase = null;
  for (const schritt of liste) {
    if (schritt.phase !== letztePhase) {
      letztePhase = schritt.phase;
      const nr = phasenReihenfolge.indexOf(schritt.phase) + 1;
      const nameOhneNr = schritt.phase.replace(/^\d+\.\s*/, '');
      const pZeile = document.createElement('div');
      pZeile.className = 'gantt-phase-zeile';
      let rasterHtml = '';
      for (let i = 0; i < spanSpalten; i++) {
        const d = new Date(minDatum); d.setDate(d.getDate() + i * zoom);
        const endD = new Date(d.getTime() + (zoom-1)*86400000);
        const istHeuteSpalte = d.toISOString().slice(0,10) <= heute && heute <= endD.toISOString().slice(0,10);
        rasterHtml += `<div class="gantt-zelle${istHeuteSpalte ? ' gantt-heute-spalte' : ''}"></div>`;
      }
      pZeile.innerHTML = `
        <div class="gantt-label-zelle gantt-phase-label" style="color:${schritt.phase_farbe};">${nr}. ${nameOhneNr}</div>
        <div class="gantt-raster" style="grid-template-columns:repeat(${spanSpalten},1fr);">${rasterHtml}</div>
      `;
      gantt.appendChild(pZeile);
    }

    if (!schritt.geplantes_datum) continue;
    const startSpalte = schritt.start_datum ? tagZuSpalte(schritt.start_datum) : tagZuSpalte(schritt.geplantes_datum);
    const endeSpalte  = tagZuSpalte(schritt.geplantes_datum);
    const hatBalken   = startSpalte < endeSpalte;
    const zeile  = document.createElement('div');
    zeile.className = 'gantt-zeile';
    const statusKlasse = schritt.erledigt ? 'gantt-erledigt' : schritt.geplantes_datum < heute ? 'gantt-ueberfaellig' : '';
    const meta = eingeloggt && schritt.verantwortlich_anzeigename ? ` · ${schritt.verantwortlich_anzeigename}` : '';
    let rasterHtml = '';
    for (let i = 0; i < spanSpalten; i++) {
      const d = new Date(minDatum); d.setDate(d.getDate() + i * zoom);
      const endD = new Date(d.getTime()+(zoom-1)*86400000);
      const istHeuteSpalte = d.toISOString().slice(0,10) <= heute && heute <= endD.toISOString().slice(0,10);
      let inhalt = '';
      if (hatBalken) {
        if (i === startSpalte)      inhalt = `<div class="gantt-balken gantt-balken-start ${statusKlasse}" style="background:${schritt.phase_farbe};" title="${schritt.titel}${meta}"></div>`;
        else if (i > startSpalte && i < endeSpalte) inhalt = `<div class="gantt-balken gantt-balken-mitte ${statusKlasse}" style="background:${schritt.phase_farbe};"></div>`;
        else if (i === endeSpalte)  inhalt = `<div class="gantt-balken gantt-balken-ende ${statusKlasse}" style="background:${schritt.phase_farbe};"></div>`;
      } else {
        if (i === endeSpalte) inhalt = `<div class="gantt-balken gantt-punkt ${statusKlasse}" style="background:${schritt.phase_farbe};" title="${schritt.titel}${meta}"></div>`;
      }
      rasterHtml += `<div class="gantt-zelle${istHeuteSpalte ? ' gantt-heute-spalte' : ''}">${inhalt}</div>`;
    }
    zeile.innerHTML = `
      <div class="gantt-label-zelle gantt-schritt-label ${schritt.erledigt ? 'erledigt' : ''}">${schritt.erledigt ? '\u2713 ' : ''}${schritt.titel}${meta}</div>
      <div class="gantt-raster" style="grid-template-columns:repeat(${spanSpalten},1fr);">${rasterHtml}</div>
    `;
    gantt.appendChild(zeile);
  }

  wrapper.appendChild(gantt);
  if (ohneDatum.length) wrapper.appendChild(renderOhneDatumListe(ohneDatum));
  return wrapper;
}

function renderTimeline(liste, eingeloggt) {
  const mitDatum  = [...liste.filter((s) => s.geplantes_datum)].sort((a, b) => a.geplantes_datum.localeCompare(b.geplantes_datum));
  const ohneDatum = liste.filter((s) => !s.geplantes_datum);
  const heute     = heuteISO();
  const wrapper   = document.createElement('div');
  const tl        = document.createElement('div');
  tl.className    = 'timeline';

  let letztesDatum = null;
  for (const schritt of mitDatum) {
    if (schritt.geplantes_datum !== letztesDatum) {
      letztesDatum = schritt.geplantes_datum;
      const istHeute       = schritt.geplantes_datum === heute;
      const istVergangenheit = schritt.geplantes_datum < heute;
      const trenn = document.createElement('div');
      trenn.className = 'tl-datum-zeile';
      trenn.innerHTML = `
        <div class="tl-datum-linie"></div>
        <div class="tl-datum-label ${istHeute ? 'tl-heute' : istVergangenheit ? 'tl-vergangenheit' : ''}">
          ${istHeute ? '📍 Heute · ' : ''}${formatDatum(schritt.geplantes_datum)}
        </div>
        <div class="tl-datum-linie"></div>
      `;
      tl.appendChild(trenn);
    }

    const el = document.createElement('div');
    el.className = `tl-eintrag ${schritt.erledigt ? 'tl-erledigt' : schritt.geplantes_datum < heute ? 'tl-ueberfaellig' : ''}`;
    el.style.setProperty('--accent', schritt.phase_farbe);

    const phasenNr = schritt.phase.match(/^\d+\./)?.[0] ?? '';
    const meta     = eingeloggt && schritt.verantwortlich_anzeigename
      ? `<span class="tl-meta">${schritt.verantwortlich_anzeigename}</span>` : '';
    const zeitraum = schritt.start_datum
      ? `<span class="tl-meta">ab ${formatDatum(schritt.start_datum)}</span>` : '';
    const parallelBadge = schritt.kann_parallel ? `<span class="parallel-badge" style="font-size:9px;">⇉</span>` : '';

    el.innerHTML = `
      <div class="tl-punkt"></div>
      <div class="tl-inhalt">
        <span class="tl-phase" style="color:${schritt.phase_farbe};">${phasenNr}</span>
        <span class="tl-titel ${schritt.erledigt ? 'erledigt' : ''}">${schritt.titel}</span>
        ${parallelBadge}${zeitraum}${meta}
      </div>
    `;
    tl.appendChild(el);
  }

  wrapper.appendChild(tl);
  if (ohneDatum.length) wrapper.appendChild(renderOhneDatumListe(ohneDatum));
  return wrapper;
}

function renderOhneDatumListe(liste) {
  const block = document.createElement('div');
  block.innerHTML = `
    <p class="dash-label" style="margin-top:20px;">Ohne Datum (${liste.length})</p>
    <ul style="font-size:12.5px;color:var(--muted);padding-left:16px;margin:4px 0;">
      ${liste.map((s) => `<li>${s.titel}</li>`).join('')}
    </ul>`;
  return block;
}

// ============================================================================
// Export-Funktionen
// ============================================================================

function renderExportLeiste(typ) {
  // typ: 'checkliste' | 'zeitstrahl'
  const leiste = document.createElement('div');
  leiste.className = 'export-leiste kein-druck';

  if (typ === 'checkliste') {
    const csvBtn = document.createElement('button');
    csvBtn.className = 'btn-sekundaer btn';
    csvBtn.style.width = 'auto';
    csvBtn.innerHTML = '⬇ CSV';
    csvBtn.title = 'Checkliste als CSV herunterladen (öffnet in Excel)';
    csvBtn.addEventListener('click', () => {
      const param = STATE.gewaehlteSchuljahr ? `?schuljahr_id=${STATE.gewaehlteSchuljahr}` : '';
      window.location.href = `/api/export/csv${param}`;
    });

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'btn-sekundaer btn';
    pdfBtn.style.width = 'auto';
    pdfBtn.innerHTML = '🖨 PDF';
    pdfBtn.title = 'Checkliste drucken / als PDF speichern';
    pdfBtn.addEventListener('click', () => window.print());

    leiste.appendChild(csvBtn);
    leiste.appendChild(pdfBtn);
  }

  if (typ === 'zeitstrahl') {
    const svgBtn = document.createElement('button');
    svgBtn.className = 'btn-sekundaer btn';
    svgBtn.style.width = 'auto';
    svgBtn.innerHTML = '⬇ SVG';
    svgBtn.title = 'Zeitstrahl als SVG-Grafik exportieren';
    svgBtn.addEventListener('click', () => exportiereGanttAlsSvg());

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'btn-sekundaer btn';
    pdfBtn.style.width = 'auto';
    pdfBtn.innerHTML = '🖨 Drucken';
    pdfBtn.addEventListener('click', () => window.print());

    leiste.appendChild(svgBtn);
    leiste.appendChild(pdfBtn);
  }

  return leiste;
}

function exportiereGanttAlsSvg() {
  const liste = STATE.user ? STATE.schritte : (STATE.publicDashboard?.schritte ?? []);
  const mitDatum = liste.filter((s) => s.geplantes_datum);
  if (mitDatum.length === 0) {
    alert('Keine Daten mit Datumsangaben vorhanden.');
    return;
  }

  const daten    = mitDatum.flatMap((s) => s.start_datum ? [s.start_datum, s.geplantes_datum] : [s.geplantes_datum]).sort();
  const minDatum = new Date(daten[0]);
  const maxDatum = new Date(daten[daten.length - 1]);
  const zoom     = STATE.ganttZoom;
  const spanTage = Math.max(7, Math.ceil((maxDatum - minDatum) / 86400000) + 2);
  const spanSpalten = Math.ceil(spanTage / zoom);

  const LABELBREITE = 220;
  const SPALTENBREITE = 28;
  const ZEILENHOEHE = 24;
  const KOPFHOEHE = 28;

  // Zeilen zählen
  const phasen = [];
  const gesehene = new Set();
  for (const s of liste) {
    if (!gesehene.has(s.phase)) { phasen.push(s.phase); gesehene.add(s.phase); }
  }
  const gesamtZeilen = phasen.length + liste.length;
  const breite  = LABELBREITE + spanSpalten * SPALTENBREITE + 20;
  const hoehe   = KOPFHOEHE + gesamtZeilen * ZEILENHOEHE + 20;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${breite}" height="${hoehe}" font-family="Arial, sans-serif" font-size="11">`;
  svg += `<rect width="${breite}" height="${hoehe}" fill="#F5F2ED"/>`;

  // Datumsachse
  for (let i = 0; i < spanSpalten; i++) {
    const d = new Date(minDatum); d.setDate(d.getDate() + i * zoom);
    const x = LABELBREITE + i * SPALTENBREITE;
    const label = `${d.getDate()}.${d.getMonth()+1}.`;
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${hoehe}" stroke="#ddd" stroke-width="0.5"/>`;
    svg += `<text x="${x+2}" y="16" fill="#888" font-size="9">${label}</text>`;
  }

  const tagZuSpalte = (iso) => Math.floor(Math.round((new Date(iso) - minDatum) / 86400000) / zoom);
  const heute = heuteISO();

  let zeilenY = KOPFHOEHE;
  let letztePhase = null;
  let phaseNr = 0;

  for (const schritt of liste) {
    if (schritt.phase !== letztePhase) {
      letztePhase = schritt.phase;
      phaseNr++;
      const nameOhneNr = schritt.phase.replace(/^\d+\.\s*/, '');
      svg += `<rect x="0" y="${zeilenY}" width="${breite}" height="${ZEILENHOEHE}" fill="${schritt.phase_farbe}22"/>`;
      svg += `<text x="8" y="${zeilenY + 16}" fill="${schritt.phase_farbe}" font-weight="bold">${phaseNr}. ${nameOhneNr}</text>`;
      zeilenY += ZEILENHOEHE;
    }

    svg += `<rect x="0" y="${zeilenY}" width="${breite}" height="${ZEILENHOEHE}" fill="${zeilenY % (ZEILENHOEHE * 2) === 0 ? '#fff' : '#F9F8F5'}"/>`;

    const titelText = schritt.titel.length > 28 ? schritt.titel.slice(0, 27) + '…' : schritt.titel;
    const titelFarbe = schritt.erledigt ? '#aaa' : '#333';
    const titelDeko  = schritt.erledigt ? 'line-through' : 'none';
    svg += `<text x="10" y="${zeilenY + 16}" fill="${titelFarbe}" text-decoration="${titelDeko}">${titelText}</text>`;

    if (schritt.geplantes_datum) {
      const startSpalte = schritt.start_datum ? tagZuSpalte(schritt.start_datum) : tagZuSpalte(schritt.geplantes_datum);
      const endeSpalte  = tagZuSpalte(schritt.geplantes_datum);
      const x1 = LABELBREITE + startSpalte * SPALTENBREITE + 2;
      const x2 = LABELBREITE + endeSpalte * SPALTENBREITE + SPALTENBREITE - 2;
      const y  = zeilenY + 7;
      const h  = 10;
      const farbe = schritt.erledigt ? '#ccc' : (schritt.geplantes_datum < heute ? '#c0392b' : schritt.phase_farbe);

      if (startSpalte < endeSpalte) {
        svg += `<rect x="${x1}" y="${y}" width="${x2-x1}" height="${h}" rx="4" fill="${farbe}" opacity="0.85"/>`;
      } else {
        svg += `<circle cx="${x1 + SPALTENBREITE/2 - 2}" cy="${y + h/2}" r="5" fill="${farbe}"/>`;
      }
    }

    zeilenY += ZEILENHOEHE;
  }

  svg += '</svg>';

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'schuljahreswechsel_zeitstrahl.svg';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Aktivitätsprotokoll
// ============================================================================

function renderAdminBereich() {
  const container = document.createElement('div');
  container.className = 'admin-bereich';
  container.innerHTML = `<h2>Admin-Bereich</h2>`;

  container.appendChild(renderSchuljahreBlock());
  container.appendChild(renderZugriffBlock());
  container.appendChild(renderVorlagenVerwaltung());
  container.appendChild(renderAktivitaetsprotokoll());

  return container;
}

async function ladeAktivitaeten() {
  const param = STATE.gewaehlteSchuljahr ? `?schuljahr_id=${STATE.gewaehlteSchuljahr}` : '';
  try { return await api(`/api/aktivitaeten${param}`); } catch { return []; }
}

function renderAktivitaetsprotokoll() {
  const block = document.createElement('div');
  block.innerHTML = `<h3 style="font-size:13px;color:var(--muted);margin-top:24px;">Aktivit\u00e4tsprotokoll</h3>
    <div id="aktivitaeten-liste" style="font-size:12px;">L\u00e4dt\u2026</div>`;

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn-sekundaer btn kein-druck';
  exportBtn.style.cssText = 'width:auto;margin-top:8px;font-size:11px;';
  exportBtn.textContent = '\u2b07 Als CSV exportieren';
  exportBtn.addEventListener('click', () => {
    const param = STATE.gewaehlteSchuljahr ? `?schuljahr_id=${STATE.gewaehlteSchuljahr}` : '';
    window.location.href = `/api/export/aktivitaeten${param}`;
  });
  block.appendChild(exportBtn);

  const ereignisTexte = {
    schritt_erledigt: '\u2713 erledigt', schritt_rueckgaengig: '\u21a9 r\u00fckg\u00e4ngig',
    verantwortlich_gesetzt: '\ud83d\udc64 Verantwortlich', datum_gesetzt: '\ud83d\udcc5 Zieldatum',
    startdatum_gesetzt: '\ud83d\udcc5 Startdatum', kommentar_gesetzt: '\ud83d\udcac Kommentar',
  };

  ladeAktivitaeten().then((eintraege) => {
    const liste = block.querySelector('#aktivitaeten-liste');
    if (eintraege.length === 0) { liste.textContent = 'Noch keine Aktivit\u00e4ten aufgezeichnet.'; return; }
    const tabelle = document.createElement('table');
    tabelle.className = 'admin-tabelle';
    tabelle.innerHTML = `<thead><tr><th>Wann</th><th>Wer</th><th>Schritt</th><th>Aktion</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    for (const e of eintraege) {
      const tr = document.createElement('tr');
      const wann = new Date(e.zeitstempel).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      const aktion = (ereignisTexte[e.ereignis] ?? e.ereignis) + (e.wert_neu ? ': ' + e.wert_neu : '');
      tr.innerHTML = `<td>${wann}</td><td>${e.anzeigename}</td><td>${e.schritt_titel}</td><td>${aktion}</td>`;
      tbody.appendChild(tr);
    }
    tabelle.appendChild(tbody);
    liste.innerHTML = '';
    liste.appendChild(tabelle);
  });

  return block;
}

function renderSchuljahreBlock() {
  const sjBlock = document.createElement('div');

  // --- Schuljahre-Tabelle ---
  sjBlock.innerHTML = `
    <h3 style="font-size:13px;color:var(--muted);">Schuljahre</h3>
    <table class="admin-tabelle">
      <thead><tr><th>Label</th><th>Aktiv</th><th></th></tr></thead>
      <tbody>
        ${STATE.schuljahre.map((sj) => `
          <tr>
            <td>${sj.label}</td>
            <td>${sj.aktiv ? '✓' : ''}</td>
            <td>${sj.aktiv ? '' : `<button class="btn-sekundaer btn" data-aktivieren="${sj.id}">aktivieren</button>`}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h3 style="font-size:13px;color:var(--muted);margin-top:20px;">Neues Schuljahr anlegen</h3>
    <form class="inline-form" id="neues-schuljahr-form">
      <div class="feld"><label>Label</label>
        <input type="text" id="neues-schuljahr-label" placeholder="z. B. 2027/2028" required>
      </div>
      <div class="feld"><label>Basis</label>
        <select id="neues-schuljahr-set">
          <option value="">Aktuelle Vorlage</option>
          ${STATE.vorlagenSets.map((s) => `
            <option value="${s.id}">${s.name} (${s.schritt_anzahl} Schritte)</option>
          `).join('')}
        </select>
      </div>
      <button class="btn" type="submit" style="width:auto;">Anlegen</button>
    </form>
    <p style="font-size:11px;color:var(--muted);margin-top:4px;">
      „Aktuelle Vorlage" kopiert alle aktiven Schritte und Phasen. Ein gespeicherter Snapshot
      legt eine eigene Kopie der Phasen und Schritte an – nützlich für andere Prozesse.
    </p>

    <h3 style="font-size:13px;color:var(--muted);margin-top:20px;">Gespeicherte Vorlagen (Snapshots)</h3>
    <div id="vorlagen-sets-liste">
      ${STATE.vorlagenSets.length === 0
        ? '<p style="font-size:12px;color:var(--muted);">Noch keine Snapshots gespeichert.</p>'
        : STATE.vorlagenSets.map((s) => `
          <div class="vorlagen-set-zeile">
            <div>
              <strong>${s.name}</strong>
              ${s.beschreibung ? `<span style="font-size:11px;color:var(--muted);margin-left:6px;">${s.beschreibung}</span>` : ''}
              <span style="font-size:11px;color:var(--muted);margin-left:6px;">
                · ${s.schritt_anzahl} Schritte · ${s.erstellt_von} · ${s.erstellt_am.slice(0,10)}
              </span>
            </div>
            <button class="btn-sekundaer btn btn-loeschen" data-loeschen-set="${s.id}"
              style="width:auto;color:#c0392b;border-color:#c0392b;flex-shrink:0;">löschen</button>
          </div>
        `).join('')}
    </div>

    <form class="inline-form" id="neuer-snapshot-form" style="margin-top:10px;">
      <div class="feld" style="flex:1;"><label>Name</label>
        <input type="text" id="snapshot-name" placeholder="z. B. WebUntis 2026, Abitur-Prozess" required style="width:100%;">
      </div>
      <div class="feld" style="flex:1;"><label>Beschreibung (optional)</label>
        <input type="text" id="snapshot-beschreibung" placeholder="Kurze Erklärung" style="width:100%;">
      </div>
      <button class="btn" type="submit" style="width:auto;">Jetzt einfrieren</button>
    </form>
    <p style="font-size:11px;color:var(--muted);margin-top:4px;">
      „Jetzt einfrieren" speichert den aktuellen Stand aller Phasen und aktiven Schritte als Snapshot.
    </p>
  `;

  sjBlock.querySelectorAll('[data-aktivieren]').forEach((btn) => {
    btn.addEventListener('click', () => aktiviereSchuljahr(btn.dataset.aktivieren));
  });

  sjBlock.querySelector('#neues-schuljahr-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const label = sjBlock.querySelector('#neues-schuljahr-label').value.trim();
    const setId = sjBlock.querySelector('#neues-schuljahr-set').value || null;
    if (label) neuesSchuljahr(label, setId ? Number(setId) : null);
  });

  sjBlock.querySelector('#neuer-snapshot-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = sjBlock.querySelector('#snapshot-name').value.trim();
    const beschreibung = sjBlock.querySelector('#snapshot-beschreibung').value.trim();
    if (name) speichereVorlagenSet(name, beschreibung || null);
  });

  sjBlock.querySelectorAll('[data-loeschen-set]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.loeschenSet);
      const set = STATE.vorlagenSets.find((s) => s.id === id);
      if (confirm(`Snapshot „${set?.name}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) {
        try {
          await loescheVorlagenSet(id);
        } catch (err) {
          alert(err.message);
        }
      }
    });
  });

  return sjBlock;
}

function renderZugriffBlock() {
  const rollenBlock = document.createElement('div');
  rollenBlock.innerHTML = `
    <h3 style="font-size:13px;color:var(--muted);margin-top:24px;">Zugriff</h3>
    <table class="admin-tabelle">
      <thead><tr><th>WebUntis-Kürzel</th><th>Anzeigename</th><th>Rolle</th><th></th></tr></thead>
      <tbody>
        ${STATE.rollen.map((r) => `
          <tr>
            <td>${r.webuntis_user}</td>
            <td>${r.anzeigename}</td>
            <td>
              <select data-rolle-user="${r.webuntis_user}" data-rolle-name="${r.anzeigename}">
                <option value="mitglied" ${r.rolle === 'mitglied' ? 'selected' : ''}>mitglied</option>
                <option value="admin" ${r.rolle === 'admin' ? 'selected' : ''}>admin</option>
              </select>
            </td>
            <td>
              <button class="btn-sekundaer btn btn-loeschen" data-loeschen="${r.webuntis_user}"
                style="width:auto;color:#c0392b;border-color:#c0392b;"
                ${r.webuntis_user === STATE.user?.webuntis_user ? 'disabled title="Eigenen Account nicht löschbar"' : ''}>
                entfernen
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <form class="inline-form" id="neue-person-form">
      <div class="feld"><label>WebUntis-Kürzel</label><input type="text" id="neue-person-user" required></div>
      <div class="feld"><label>Anzeigename</label><input type="text" id="neue-person-name"></div>
      <div class="feld"><label>Rolle</label>
        <select id="neue-person-rolle">
          <option value="mitglied">mitglied</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <button class="btn" type="submit" style="width:auto;">Freigeben</button>
    </form>
    <p style="font-size:12px;color:var(--muted);">
      Nur Personen in dieser Liste können sich überhaupt anmelden - ein
      korrektes WebUntis-Passwort allein reicht nicht mehr. Vor dem ersten
      Login einer Person hier "Freigeben" benutzen, danach lässt sich ihre
      Rolle jederzeit über das Auswahlfeld ändern.
    </p>
  `;
  rollenBlock.querySelectorAll('select[data-rolle-user]').forEach((select) => {
    select.addEventListener('change', () => {
      setzeRolle(select.dataset.rolleUser, select.value, select.dataset.rolleName);
    });
  });
  rollenBlock.querySelectorAll('[data-loeschen]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const user = btn.dataset.loeschen;
      if (confirm(`${user} wirklich aus der Zugriffsliste entfernen? Die Person kann sich danach nicht mehr anmelden.`)) {
        try {
          await loescheRolle(user);
        } catch (err) {
          alert(err.message);
        }
      }
    });
  });
  rollenBlock.querySelector('#neue-person-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const webuntis_user = rollenBlock.querySelector('#neue-person-user').value.trim();
    const anzeigename = rollenBlock.querySelector('#neue-person-name').value.trim();
    const rolle = rollenBlock.querySelector('#neue-person-rolle').value;
    if (webuntis_user) setzeRolle(webuntis_user, rolle, anzeigename || webuntis_user);
  });
  return rollenBlock;
}

// --- Checklisten-Vorlage verwalten ---

let dragZustandPhase = null; // { id } - für Phasen-Drag-and-Drop

function renderVorlagenVerwaltung() {
  const block = document.createElement('div');
  block.innerHTML = '<h3 style="font-size:13px;color:var(--muted);margin-top:24px;">Checkliste verwalten</h3>';

  const phasenListe = document.createElement('div');
  phasenListe.className = 'phasen-liste';

  for (const phase of STATE.phasen) {
    const vorlagenDerPhase = STATE.vorlagen
      .filter((v) => v.phase_id === phase.id)
      .sort((a, b) => a.reihenfolge - b.reihenfolge);
    phasenListe.appendChild(renderPhasenBlock(phase, vorlagenDerPhase));
  }

  phasenListe.addEventListener('dragover', (e) => {
    if (dragZustandPhase) e.preventDefault();
  });
  phasenListe.addEventListener('drop', (e) => {
    if (!dragZustandPhase) return;
    e.preventDefault();
    const zielEl = e.target.closest('[data-phasen-block-id]');
    const alleIds = STATE.phasen.map((p) => p.id);
    const ohneGezogene = alleIds.filter((id) => id !== dragZustandPhase.id);
    let neueReihe;
    if (zielEl) {
      const zielId = Number(zielEl.dataset.phasenBlockId);
      const zielIndex = ohneGezogene.indexOf(zielId);
      neueReihe = zielIndex === -1
        ? [...ohneGezogene, dragZustandPhase.id]
        : [...ohneGezogene.slice(0, zielIndex), dragZustandPhase.id, ...ohneGezogene.slice(zielIndex)];
    } else {
      neueReihe = [...ohneGezogene, dragZustandPhase.id];
    }
    reihenfolgePhasenAendern(neueReihe);
  });

  block.appendChild(phasenListe);

  const neuePhaseForm = document.createElement('div');
  neuePhaseForm.className = 'neue-phase-form';
  neuePhaseForm.style.marginTop = '14px';

  const neuePhaseNameInput = document.createElement('input');
  neuePhaseNameInput.type = 'text';
  neuePhaseNameInput.placeholder = 'z.\u00a0B. 0.\u00a0Vorbereitungen';
  neuePhaseNameInput.style.cssText = 'flex:1;font-size:13px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;';

  let neuerPhaseFarbe = '#5B6FA8';
  const farbwahlNeu = renderFarbwahl(neuerPhaseFarbe, (f) => { neuerPhaseFarbe = f; });

  const btnNeuePhase = document.createElement('button');
  btnNeuePhase.className = 'btn';
  btnNeuePhase.style.cssText = 'width:auto;margin-top:8px;';
  btnNeuePhase.textContent = 'Phase anlegen';
  btnNeuePhase.addEventListener('click', () => {
    const name = neuePhaseNameInput.value.trim();
    if (name) neuePhase(name, neuerPhaseFarbe);
  });

  const reihe = document.createElement('div');
  reihe.style.cssText = 'display:flex;gap:8px;align-items:center;';
  reihe.appendChild(neuePhaseNameInput);
  neuePhaseForm.appendChild(reihe);
  neuePhaseForm.appendChild(farbwahlNeu);
  neuePhaseForm.appendChild(btnNeuePhase);
  block.appendChild(neuePhaseForm);

  const hinweis = document.createElement('p');
  hinweis.style.cssText = 'font-size:12px;color:var(--muted);margin-top:8px;';
  hinweis.textContent = 'Phasen per Drag-and-Drop am \u29bf-Griff umsortieren. '
    + 'Schritte innerhalb einer Phase ebenfalls per Drag-and-Drop sortierbar. '
    + 'Phasenwechsel f\u00fcr einzelne Schritte \u00fcber das Auswahlfeld in der Zeile.';
  block.appendChild(hinweis);

  return block;
}

function renderPhasenBlock(phase, vorlagen) {
  const wrapper = document.createElement('div');
  wrapper.className = 'phasen-block';
  wrapper.dataset.phasenBlockId = phase.id;
  wrapper.draggable = true;

  const kopf = document.createElement('div');
  kopf.className = 'phasen-kopf';
  kopf.style.setProperty('--phase-farbe', phase.farbe);
  const nameOhneNummer = phase.name.replace(/^\d+\.\s*/, '');
  const nummer = STATE.phasen.findIndex((p) => p.id === phase.id) + 1;
  const griff = document.createElement('span');
  griff.className = 'zieh-griff phasen-griff';
  griff.title = 'Phase verschieben';
  griff.textContent = '\u29bf';

  const nummerSpan = document.createElement('span');
  nummerSpan.className = 'phasen-nummer';
  nummerSpan.style.cssText = 'color:var(--phase-farbe);font-weight:700;font-size:14px;flex-shrink:0;';
  nummerSpan.textContent = nummer + '.';

  const nameFeld = document.createElement('input');
  nameFeld.type = 'text';
  nameFeld.className = 'phasen-name-feld';
  nameFeld.value = nameOhneNummer;
  nameFeld.placeholder = 'Phasenname';
  nameFeld.addEventListener('change', (e) => {
    phaseAktualisieren(phase.id, { name: e.target.value.replace(/^\d+\.\s*/, '') });
  });

  // Farbwahl-Popup: ein kleines Kästchen das beim Klick ein Flyout öffnet
  const farbBtn = document.createElement('button');
  farbBtn.type = 'button';
  farbBtn.className = 'phasen-farb-btn';
  farbBtn.style.cssText = `background:${phase.farbe};width:22px;height:22px;border-radius:4px;border:2px solid rgba(0,0,0,.15);cursor:pointer;flex-shrink:0;`;
  farbBtn.title = 'Farbe ändern';

  const farbPopup = document.createElement('div');
  farbPopup.className = 'farb-popup';
  farbPopup.style.display = 'none';
  farbPopup.appendChild(renderFarbwahl(phase.farbe, (f) => {
    farbBtn.style.background = f;
    kopf.style.setProperty('--phase-farbe', f);
    phaseAktualisieren(phase.id, { farbe: f });
  }));

  farbBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    farbPopup.style.display = farbPopup.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', () => { farbPopup.style.display = 'none'; }, { once: false });

  const farbWrap = document.createElement('div');
  farbWrap.style.position = 'relative';
  farbWrap.appendChild(farbBtn);
  farbWrap.appendChild(farbPopup);

  kopf.appendChild(griff);
  kopf.appendChild(farbWrap);
  kopf.appendChild(nummerSpan);
  kopf.appendChild(nameFeld);

  wrapper.addEventListener('dragstart', (e) => {
    if (e.target.closest('.vorlagen-zeile-wrapper')) return;
    dragZustandPhase = { id: phase.id };
    wrapper.classList.add('wird-gezogen');
    e.dataTransfer.effectAllowed = 'move';
  });
  wrapper.addEventListener('dragend', () => {
    wrapper.classList.remove('wird-gezogen');
    dragZustandPhase = null;
  });

  wrapper.appendChild(kopf);

  const liste = document.createElement('div');
  liste.className = 'vorlagen-liste';
  for (const v of vorlagen) {
    liste.appendChild(renderVorlagenZeile(v));
  }

  liste.addEventListener('dragover', (e) => {
    if (dragZustand && dragZustand.phase_id === phase.id) e.preventDefault();
  });
  liste.addEventListener('drop', (e) => {
    if (!dragZustand || dragZustand.phase_id !== phase.id) return;
    e.preventDefault();
    const zielEl = e.target.closest('[data-vorlage-id]');
    const aktuelleIds = vorlagen.map((v) => v.id);
    const ohneGezogenen = aktuelleIds.filter((id) => id !== dragZustand.id);
    let neueReihe;
    if (zielEl) {
      const zielId = Number(zielEl.dataset.vorlageId);
      const zielIndex = ohneGezogenen.indexOf(zielId);
      neueReihe = zielIndex === -1
        ? [...ohneGezogenen, dragZustand.id]
        : [...ohneGezogenen.slice(0, zielIndex), dragZustand.id, ...ohneGezogenen.slice(zielIndex)];
    } else {
      neueReihe = [...ohneGezogenen, dragZustand.id];
    }
    reihenfolgeAendern(phase.id, neueReihe);
  });

  wrapper.appendChild(liste);

  const neuerSchrittForm = document.createElement('form');
  neuerSchrittForm.className = 'inline-form';
  neuerSchrittForm.style.cssText = 'margin:6px 8px 10px;';
  neuerSchrittForm.innerHTML = `
    <input type="text" class="neuer-schritt-titel" placeholder="Neuer Schritt..." style="flex:1;">
    <button class="btn" type="submit" style="width:auto;">+</button>
  `;
  neuerSchrittForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const titel = neuerSchrittForm.querySelector('.neuer-schritt-titel').value.trim();
    if (titel) neueVorlage(phase.id, titel);
  });
  wrapper.appendChild(neuerSchrittForm);

  return wrapper;
}

function renderVorlagenZeile(v) {
  const wrapper = document.createElement('div');
  wrapper.className = 'vorlagen-zeile-wrapper' + (v.aktiv ? '' : ' inaktiv');
  wrapper.draggable = true;
  wrapper.dataset.vorlageId = v.id;

  wrapper.innerHTML = `
    <div class="vorlagen-zeile">
      <span class="zieh-griff" title="Ziehen zum Umsortieren">\u29bf</span>
      <input type="text" class="vorlagen-titel-feld" value="${v.titel}" data-feld="titel">
      <select class="vorlagen-phase-feld" data-feld="phase_id">
        ${STATE.phasen.map((p) => `<option value="${p.id}" ${p.id === v.phase_id ? 'selected' : ''}>${p.name}</option>`).join('')}
      </select>
      <button class="btn-sekundaer btn" data-toggle-aktiv style="width:auto;">${v.aktiv ? 'deaktivieren' : 'reaktivieren'}</button>
      <label class="toggle-wrap" title="Default parallel f\u00fcr neue Schuljahre" style="margin-left:4px;">
        <input type="checkbox" data-toggle-parallel ${v.kann_parallel ? 'checked' : ''}>
        <span class="toggle-label">\u21c9 Default</span>
      </label>
      <span class="chev" data-rolle="vorlagen-chevron">\u25b8</span>
    </div>
    <div class="schritt-detail" data-rolle="vorlagen-detail" style="padding:0 14px 14px 26px;">
      <label style="font-size:10.5px;color:var(--muted);display:block;margin-bottom:4px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.04em;">
        Weiterf\u00fchrende Infos (nur f\u00fcr angemeldete Personen sichtbar)
      </label>
      <div class="md-toolbar">
        <button type="button" data-md="fett" title="Fett"><strong>F</strong></button>
        <button type="button" data-md="kursiv" title="Kursiv"><em>K</em></button>
        <button type="button" data-md="liste" title="Aufz\u00e4hlung">\u2022 Liste</button>
        <button type="button" data-md="nummeriert" title="Nummerierte Liste">1. Liste</button>
        <button type="button" data-md="link" title="Link">\U0001f517 Link</button>
      </div>
      <textarea class="vorlagen-beschreibung-feld" data-feld="beschreibung" rows="3" placeholder="z. B. Schritt-f\u00fcr-Schritt-Hinweise, Links, worauf zu achten ist ...">${v.beschreibung ?? ''}</textarea>
      <p style="font-size:11px;color:var(--muted);margin:4px 0 6px;">Unterst\u00fctzt: **fett**, *kursiv*, Aufz\u00e4hlungen, nummerierte Listen, [Linktext](https://...)</p>
      <div class="vorlagen-vorschau" data-rolle="vorlagen-vorschau">${markdownZuHtml(v.beschreibung) || '<span style="color:var(--muted);">Vorschau erscheint hier</span>'}</div>
    </div>
  `;

  const textareaFeld = wrapper.querySelector('[data-feld="beschreibung"]');
  const vorschauDiv = wrapper.querySelector('[data-rolle="vorlagen-vorschau"]');

  textareaFeld.addEventListener('input', () => {
    vorschauDiv.innerHTML = markdownZuHtml(textareaFeld.value) || '<span style="color:var(--muted);">Vorschau erscheint hier</span>';
  });

  wrapper.querySelectorAll('[data-md]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const art = btn.dataset.md;
      if (art === 'fett') textareaFormatierungEinfuegen(textareaFeld, { umschliessen: '**' });
      else if (art === 'kursiv') textareaFormatierungEinfuegen(textareaFeld, { umschliessen: '*' });
      else if (art === 'liste') textareaFormatierungEinfuegen(textareaFeld, { zeilenPraefix: '- ' });
      else if (art === 'nummeriert') textareaFormatierungEinfuegen(textareaFeld, { zeilenPraefix: '1. ' });
      else if (art === 'link') {
        const start = textareaFeld.selectionStart;
        const end = textareaFeld.selectionEnd;
        const ausgewaehlt = textareaFeld.value.slice(start, end) || 'Linktext';
        textareaFeld.value = textareaFeld.value.slice(0, start) + `[${ausgewaehlt}](https://)` + textareaFeld.value.slice(end);
        textareaFeld.focus();
        const urlStart = start + ausgewaehlt.length + 3;
        textareaFeld.setSelectionRange(urlStart, urlStart + 8);
        textareaFeld.dispatchEvent(new Event('input'));
      }
    });
  });

  const vorlagenDetailEl  = wrapper.querySelector('[data-rolle="vorlagen-detail"]');
  const vorlagenChevronEl = wrapper.querySelector('[data-rolle="vorlagen-chevron"]');

  // Zustand aus STATE wiederherstellen
  if (STATE.offeneVorlagen.has(v.id)) {
    vorlagenDetailEl.classList.add('offen');
    vorlagenChevronEl.classList.add('offen');
  }

  vorlagenChevronEl.addEventListener('click', () => {
    const istOffen = vorlagenDetailEl.classList.toggle('offen');
    vorlagenChevronEl.classList.toggle('offen');
    if (istOffen) {
      STATE.offeneVorlagen.add(v.id);
    } else {
      STATE.offeneVorlagen.delete(v.id);
    }
  });

  wrapper.addEventListener('dragstart', (e) => {
    dragZustand = { id: v.id, phase_id: v.phase_id };
    wrapper.classList.add('wird-gezogen');
    e.stopPropagation();
  });
  wrapper.addEventListener('dragend', () => {
    wrapper.classList.remove('wird-gezogen');
    dragZustand = null;
  });

  wrapper.querySelector('[data-feld="titel"]').addEventListener('change', (e) => {
    vorlageAktualisieren(v.id, { titel: e.target.value });
  });
  wrapper.querySelector('[data-feld="phase_id"]').addEventListener('change', (e) => {
    vorlageAktualisieren(v.id, { phase_id: Number(e.target.value) });
  });
  wrapper.querySelector('[data-feld="beschreibung"]').addEventListener('change', (e) => {
    vorlageAktualisieren(v.id, { beschreibung: e.target.value });
  });
  wrapper.querySelector('[data-toggle-aktiv]').addEventListener('click', () => {
    vorlageAktualisieren(v.id, { aktiv: !v.aktiv });
  });
  wrapper.querySelector('[data-toggle-parallel]').addEventListener('change', (e) => {
    vorlageAktualisieren(v.id, { kann_parallel: e.target.checked });
  });

  return wrapper;
}

// --- Start -----------------------------------------------------------------
(async function start() {
  await ladeOeffentlichesDashboard();
  await checkAuth();
  if (STATE.user) {
    await ladeAlles();
  }
  render();
})();
