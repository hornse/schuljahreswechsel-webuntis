// ============================================================================
// Schuljahreswechsel WebUntis - Frontend
// ============================================================================
// Bewusst ohne Build-Schritt/Framework: ein STATE-Objekt hält den aktuellen
// Zustand, render() baut daraus jedes Mal die komplette #app-Ansicht neu auf.
// Das ist für die Größe dieser App einfacher zu warten als ein "richtiges"
// Reaktivitätssystem und entspricht dem Stil von Projektstunden NRW.
//
// Seit der Erweiterung um die öffentliche Landingpage gibt es zwei
// Datenquellen für die Dashboard-Ansicht: STATE.publicDashboard (ohne
// Login, reduzierte Felder - siehe backend/api/dashboard.php) und
// STATE.schritte (nach Login, vollständige Felder). renderDashboard()
// arbeitet bewusst mit beiden, je nachdem ob STATE.user gesetzt ist.
// ============================================================================

const STATE = {
  user: null,             // { webuntis_user, anzeigename, rolle } oder null
  schritte: [],            // volle Checkliste, nur nach Login geladen
  schuljahre: [],          // nur für Admins geladen
  rollen: [],               // nur für Admins geladen
  vorlagen: [],              // nur für Admins geladen (Checklisten-Vorlage verwalten)
  publicDashboard: null,      // { schuljahr_label, schritte } - immer geladen, kein Login nötig
  ansicht: 'dashboard',        // 'dashboard' | 'checkliste' | 'login'
};

let dragZustand = null; // { id, phase } - während eines Drag-and-Drop-Vorgangs bei den Vorlagen

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
  STATE.vorlagen = [];
  STATE.ansicht = 'dashboard';
  render();
}

// --- Daten laden ---------------------------------------------------------
async function ladeOeffentlichesDashboard() {
  STATE.publicDashboard = await api('/api/dashboard');
}

async function ladeAlles() {
  const schritteRes = await api('/api/schritte');
  STATE.schritte = schritteRes.schritte;
  STATE.schuljahrId = schritteRes.schuljahr_id;

  if (STATE.user?.rolle === 'admin') {
    STATE.schuljahre = await api('/api/schuljahre');
    STATE.rollen = await api('/api/rollen');
    STATE.vorlagen = await api('/api/vorlagen');
  }
}

async function toggleSchritt(id, erledigt) {
  await api(`/api/schritte/${id}`, { method: 'PATCH', body: { erledigt } });
  await ladeAlles();
  render();
}

async function aktualisiereFeld(id, feld, wert) {
  await api(`/api/schritte/${id}`, { method: 'PATCH', body: { [feld]: wert } });
  // Bewusst kein sofortiges Neuladen+Rerender bei jedem Tastendruck - das
  // würde den Fokus aus dem Eingabefeld reißen. Der Wert steht beim
  // nächsten ladeAlles() (z. B. nach einem Checkbox-Klick) wieder korrekt da.
}

async function neuesSchuljahr(label) {
  await api('/api/schuljahre', { method: 'POST', body: { label } });
  await ladeAlles();
  await ladeOeffentlichesDashboard();
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

async function neueVorlage(phase, titel) {
  await api('/api/vorlagen', { method: 'POST', body: { phase, titel } });
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

async function reihenfolgeAendern(phase, vorlage_ids) {
  await api('/api/vorlagen/reihenfolge', { method: 'POST', body: { phase, vorlage_ids } });
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
    `;
    rechtsHtml = `<button class="btn btn-sekundaer" id="logout-btn">Abmelden</button>`;
  } else if (STATE.ansicht === 'login') {
    tabsHtml = `<button class="tab" data-ansicht="dashboard">Dashboard</button>`;
    rechtsHtml = `<button class="btn btn-sekundaer" id="abbrechen-btn">Abbrechen</button>`;
  } else {
    tabsHtml = `<button class="tab aktiv" data-ansicht="dashboard">Dashboard</button>`;
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

  let aktuellePhase = null;
  for (const schritt of STATE.schritte) {
    if (schritt.phase !== aktuellePhase) {
      aktuellePhase = schritt.phase;
      const h = document.createElement('div');
      h.className = 'phase-title';
      h.style.color = schritt.phase_farbe;
      h.textContent = aktuellePhase;
      container.appendChild(h);
    }
    container.appendChild(renderSchritt(schritt));
  }

  return container;
}

function renderSchritt(schritt) {
  const el = document.createElement('div');
  el.className = 'schritt' + (schritt.erledigt ? ' erledigt' : '');
  el.style.setProperty('--accent', schritt.phase_farbe);

  el.innerHTML = `
    <div class="schritt-zeile">
      <span class="checkbox ${schritt.erledigt ? 'checked' : ''}" data-rolle="checkbox"></span>
      <span class="schritt-text ${schritt.erledigt ? 'erledigt' : ''}">${schritt.titel}</span>
      <span class="chev" data-rolle="chevron">▸</span>
    </div>
    <div class="schritt-detail" data-rolle="detail">
      <p class="detail-text">${schritt.beschreibung ?? ''}</p>
      <div class="felder">
        <div class="feld"><label>Verantwortlich</label>
          <input type="text" data-feld="verantwortlich_anzeigename" value="${schritt.verantwortlich_anzeigename ?? ''}">
        </div>
        <div class="feld"><label>Datum</label>
          <input type="date" data-feld="geplantes_datum" value="${schritt.geplantes_datum ?? ''}">
        </div>
      </div>
    </div>
  `;

  el.querySelector('[data-rolle="checkbox"]').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSchritt(schritt.id, !schritt.erledigt);
  });

  el.querySelector('.schritt-zeile').addEventListener('click', () => {
    el.querySelector('[data-rolle="detail"]').classList.toggle('offen');
    el.querySelector('[data-rolle="chevron"]').classList.toggle('offen');
  });

  el.querySelectorAll('[data-feld]').forEach((input) => {
    input.addEventListener('change', () => {
      aktualisiereFeld(schritt.id, input.dataset.feld, input.value);
    });
  });

  return el;
}

// ============================================================================
// Dashboard ("was ist gerade dran") - öffentlich UND eingeloggt
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

  const phasen = new Map();
  for (const s of liste) {
    if (!phasen.has(s.phase)) {
      phasen.set(s.phase, { farbe: s.phase_farbe, gesamt: 0, erledigt: 0 });
    }
    const eintrag = phasen.get(s.phase);
    eintrag.gesamt += 1;
    if (s.erledigt) eintrag.erledigt += 1;
  }

  return { aktuell, ueberfaellig, demnaechst, phasen };
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

  const { aktuell, ueberfaellig, demnaechst, phasen } = berechneDashboardDaten(liste);

  const aktuellBlock = document.createElement('div');
  aktuellBlock.className = 'dash-block dash-aktuell';
  aktuellBlock.style.setProperty('--accent', aktuell?.phase_farbe ?? 'var(--accent-default)');
  if (aktuell) {
    // "Verantwortlich" existiert nur in den vollen (eingeloggten) Daten.
    const metaTeile = [aktuell.phase];
    if (aktuell.verantwortlich_anzeigename !== undefined) {
      metaTeile.push(aktuell.verantwortlich_anzeigename || 'noch niemand zugewiesen');
    }
    aktuellBlock.innerHTML = `
      <p class="dash-label">Aktuell dran</p>
      <p class="dash-titel" style="color:${aktuell.phase_farbe}">${aktuell.titel}</p>
      <p class="dash-meta">${metaTeile.join(' · ')}</p>
    `;
  } else {
    aktuellBlock.innerHTML = `<p class="dash-label">Aktuell dran</p><p class="dash-titel">Alles erledigt 🎉</p>`;
  }
  container.appendChild(aktuellBlock);

  if (ueberfaellig.length) {
    container.appendChild(renderDashListe('Überfällig', ueberfaellig, true));
  }
  if (demnaechst.length) {
    container.appendChild(renderDashListe('Demnächst (14 Tage)', demnaechst, false));
  }

  const phasenBlock = document.createElement('div');
  phasenBlock.className = 'dash-block';
  phasenBlock.innerHTML = '<p class="dash-label">Fortschritt je Phase</p>';
  for (const [phase, daten] of phasen) {
    const prozent = daten.gesamt ? Math.round((daten.erledigt / daten.gesamt) * 100) : 0;
    const zeile = document.createElement('div');
    zeile.className = 'dash-phasenzeile';
    zeile.innerHTML = `
      <span class="dash-phasenname" style="color:${daten.farbe}">${phase}</span>
      <div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:${prozent}%;background:${daten.farbe}"></div></div>
      <span class="progress-label">${daten.erledigt}/${daten.gesamt}</span>
    `;
    phasenBlock.appendChild(zeile);
  }
  container.appendChild(phasenBlock);

  return container;
}

function renderDashListe(titel, liste, istUeberfaellig) {
  const block = document.createElement('div');
  block.className = 'dash-block';
  const items = liste.map((s) => `
    <li>
      <span class="dash-datum ${istUeberfaellig ? 'dash-datum-rot' : ''}">${formatDatum(s.geplantes_datum)}</span>
      <span>${s.titel}</span>
    </li>
  `).join('');
  block.innerHTML = `<p class="dash-label">${titel}</p><ul class="dash-liste">${items}</ul>`;
  return block;
}

// ============================================================================
// Admin-Bereich
// ============================================================================

function renderAdminBereich() {
  const container = document.createElement('div');
  container.className = 'admin-bereich';
  container.innerHTML = `<h2>Admin-Bereich</h2>`;

  container.appendChild(renderSchuljahreBlock());
  container.appendChild(renderZugriffBlock());
  container.appendChild(renderVorlagenVerwaltung());

  return container;
}

function renderSchuljahreBlock() {
  const sjBlock = document.createElement('div');
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
    <form class="inline-form" id="neues-schuljahr-form">
      <div class="feld"><label>Neues Schuljahr</label><input type="text" id="neues-schuljahr-label" placeholder="2026/2027" required></div>
      <button class="btn" type="submit" style="width:auto;">Anlegen (kopiert die Vorlage)</button>
    </form>
  `;
  sjBlock.querySelectorAll('[data-aktivieren]').forEach((btn) => {
    btn.addEventListener('click', () => aktiviereSchuljahr(btn.dataset.aktivieren));
  });
  sjBlock.querySelector('#neues-schuljahr-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const label = sjBlock.querySelector('#neues-schuljahr-label').value.trim();
    if (label) neuesSchuljahr(label);
  });
  return sjBlock;
}

function renderZugriffBlock() {
  const rollenBlock = document.createElement('div');
  rollenBlock.innerHTML = `
    <h3 style="font-size:13px;color:var(--muted);margin-top:24px;">Zugriff</h3>
    <table class="admin-tabelle">
      <thead><tr><th>WebUntis-Kürzel</th><th>Anzeigename</th><th>Rolle</th></tr></thead>
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
  rollenBlock.querySelector('#neue-person-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const webuntis_user = rollenBlock.querySelector('#neue-person-user').value.trim();
    const anzeigename = rollenBlock.querySelector('#neue-person-name').value.trim();
    const rolle = rollenBlock.querySelector('#neue-person-rolle').value;
    if (webuntis_user) setzeRolle(webuntis_user, rolle, anzeigename || webuntis_user);
  });
  return rollenBlock;
}

// --- Checklisten-Vorlage verwalten (Drag-and-Drop innerhalb einer Phase) ---

function renderVorlagenVerwaltung() {
  const block = document.createElement('div');
  block.innerHTML = '<h3 style="font-size:13px;color:var(--muted);margin-top:24px;">Checkliste verwalten</h3>';

  const phasenNamen = [...new Set(STATE.vorlagen.map((v) => v.phase))];

  for (const phase of phasenNamen) {
    const gruppe = STATE.vorlagen.filter((v) => v.phase === phase).sort((a, b) => a.reihenfolge - b.reihenfolge);
    const farbe = gruppe[0]?.phase_farbe ?? '#5B6FA8';

    const phasenBlock = document.createElement('div');
    phasenBlock.innerHTML = `<p class="phase-title" style="color:${farbe};margin-top:14px;">${phase}</p>`;

    const liste = document.createElement('div');
    liste.className = 'vorlagen-liste';

    for (const v of gruppe) {
      liste.appendChild(renderVorlagenZeile(v, phasenNamen));
    }

    liste.addEventListener('dragover', (e) => e.preventDefault());
    liste.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragZustand || dragZustand.phase !== phase) {
        return; // kein phasenübergreifendes Drag-and-Drop - siehe Kommentar im Backend
      }
      const zielEl = e.target.closest('[data-vorlage-id]');
      const aktuelleIds = gruppe.map((v) => v.id);
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
      reihenfolgeAendern(phase, neueReihe);
    });

    phasenBlock.appendChild(liste);
    block.appendChild(phasenBlock);
  }

  const neuerSchrittForm = document.createElement('form');
  neuerSchrittForm.className = 'inline-form';
  neuerSchrittForm.style.marginTop = '14px';
  neuerSchrittForm.innerHTML = `
    <div class="feld"><label>Phase</label>
      <select id="neuer-schritt-phase">
        ${phasenNamen.map((p) => `<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>
    <div class="feld" style="flex:1;"><label>Neuer Schritt</label><input type="text" id="neuer-schritt-titel" required style="width:100%;"></div>
    <button class="btn" type="submit" style="width:auto;">Hinzufügen</button>
  `;
  neuerSchrittForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phase = neuerSchrittForm.querySelector('#neuer-schritt-phase').value;
    const titel = neuerSchrittForm.querySelector('#neuer-schritt-titel').value.trim();
    if (titel) neueVorlage(phase, titel);
  });
  block.appendChild(neuerSchrittForm);

  const hinweis = document.createElement('p');
  hinweis.style.cssText = 'font-size:12px;color:var(--muted);margin-top:8px;';
  hinweis.textContent = 'Zum Umsortieren innerhalb einer Phase per Drag-and-Drop am Griff (⠿) ziehen. '
    + 'Phasenwechsel über das Auswahlfeld in der Zeile. Neue/geänderte Schritte wirken sich sofort auf das aktuell laufende Schuljahr aus.';
  block.appendChild(hinweis);

  return block;
}

function renderVorlagenZeile(v, phasenNamen) {
  const wrapper = document.createElement('div');
  wrapper.className = 'vorlagen-zeile-wrapper' + (v.aktiv ? '' : ' inaktiv');
  wrapper.draggable = true;
  wrapper.dataset.vorlageId = v.id;

  wrapper.innerHTML = `
    <div class="vorlagen-zeile">
      <span class="zieh-griff" title="Ziehen zum Umsortieren">⠿</span>
      <input type="text" class="vorlagen-titel-feld" value="${v.titel}" data-feld="titel">
      <select class="vorlagen-phase-feld" data-feld="phase">
        ${phasenNamen.map((p) => `<option value="${p}" ${p === v.phase ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
      <button class="btn-sekundaer btn" data-toggle-aktiv style="width:auto;">${v.aktiv ? 'deaktivieren' : 'reaktivieren'}</button>
      <span class="chev" data-rolle="vorlagen-chevron">▸</span>
    </div>
    <div class="schritt-detail" data-rolle="vorlagen-detail" style="padding:0 14px 14px 26px;">
      <label style="font-size:10.5px;color:var(--muted);display:block;margin-bottom:4px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.04em;">
        Weiterführende Infos (nur für angemeldete Personen sichtbar)
      </label>
      <textarea class="vorlagen-beschreibung-feld" data-feld="beschreibung" rows="3" placeholder="z. B. Schritt-für-Schritt-Hinweise, Links, worauf zu achten ist ...">${v.beschreibung ?? ''}</textarea>
    </div>
  `;

  wrapper.querySelector('[data-rolle="vorlagen-chevron"]').addEventListener('click', () => {
    wrapper.querySelector('[data-rolle="vorlagen-detail"]').classList.toggle('offen');
    wrapper.querySelector('[data-rolle="vorlagen-chevron"]').classList.toggle('offen');
  });

  wrapper.addEventListener('dragstart', () => {
    dragZustand = { id: v.id, phase: v.phase };
    wrapper.classList.add('wird-gezogen');
  });
  wrapper.addEventListener('dragend', () => {
    wrapper.classList.remove('wird-gezogen');
    dragZustand = null;
  });

  wrapper.querySelector('[data-feld="titel"]').addEventListener('change', (e) => {
    vorlageAktualisieren(v.id, { titel: e.target.value });
  });
  wrapper.querySelector('[data-feld="phase"]').addEventListener('change', (e) => {
    vorlageAktualisieren(v.id, { phase: e.target.value });
  });
  wrapper.querySelector('[data-feld="beschreibung"]').addEventListener('change', (e) => {
    vorlageAktualisieren(v.id, { beschreibung: e.target.value });
  });
  wrapper.querySelector('[data-toggle-aktiv]').addEventListener('click', () => {
    vorlageAktualisieren(v.id, { aktiv: !v.aktiv });
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
