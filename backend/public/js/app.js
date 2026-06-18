// ============================================================================
// Schuljahreswechsel WebUntis - Frontend
// ============================================================================
// Bewusst ohne Build-Schritt/Framework: ein STATE-Objekt hält den aktuellen
// Zustand, render() baut daraus jedes Mal die komplette #app-Ansicht neu auf.
// Das ist für die Größe dieser App einfacher zu warten als ein "richtiges"
// Reaktivitätssystem und entspricht dem Stil von Projektstunden NRW.
// ============================================================================

const STATE = {
  user: null,        // { webuntis_user, anzeigename, rolle } oder null
  schritte: [],       // aktuelle Checkliste
  schuljahre: [],     // nur für Admins geladen
  rollen: [],          // nur für Admins geladen
};

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
  render();
}

async function doLogout() {
  await api('/api/logout', { method: 'POST' });
  STATE.user = null;
  render();
}

// --- Daten laden ---------------------------------------------------------
async function ladeAlles() {
  const schritteRes = await api('/api/schritte');
  STATE.schritte = schritteRes.schritte;
  STATE.schuljahrId = schritteRes.schuljahr_id;

  if (STATE.user?.rolle === 'admin') {
    STATE.schuljahre = await api('/api/schuljahre');
    STATE.rollen = await api('/api/rollen');
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
  render();
}

async function aktiviereSchuljahr(id) {
  await api(`/api/schuljahre/${id}/aktivieren`, { method: 'POST' });
  await ladeAlles();
  render();
}

async function setzeRolle(webuntis_user, rolle, anzeigename) {
  await api('/api/rollen', { method: 'POST', body: { webuntis_user, rolle, anzeigename } });
  await ladeAlles();
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
  if (!STATE.user) {
    $app.appendChild(renderLogin());
  } else {
    $app.appendChild(renderChecklist());
    if (STATE.user.rolle === 'admin') {
      $app.appendChild(renderAdminBereich());
    }
  }
}

function renderLogin() {
  const wrapper = document.createElement('div');
  wrapper.className = 'login-box';
  wrapper.innerHTML = `
    <p style="font-size:13px;color:var(--muted);margin-top:0;">
      Anmeldung mit den gewohnten WebUntis-Zugangsdaten.
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

  // Abmelden muss immer möglich sein, auch bevor ein Schuljahr existiert -
  // deshalb hier oben, statt erst im "es gibt schon Schritte"-Zweig unten.
  const kopf = document.createElement('div');
  kopf.className = 'top-leiste';
  kopf.innerHTML = `<span></span><button class="btn btn-sekundaer" id="logout-btn">Abmelden</button>`;
  kopf.querySelector('#logout-btn').addEventListener('click', doLogout);
  container.appendChild(kopf);

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

function renderAdminBereich() {
  const container = document.createElement('div');
  container.className = 'admin-bereich';
  container.innerHTML = `<h2>Admin-Bereich</h2>`;

  // --- Schuljahre ---
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
  container.appendChild(sjBlock);

  // --- Rollen ---
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
    <p style="font-size:12px;color:var(--muted);">
      Neue Personen erscheinen hier automatisch nach ihrem ersten Login (Rolle "mitglied").
    </p>
  `;
  rollenBlock.querySelectorAll('select[data-rolle-user]').forEach((select) => {
    select.addEventListener('change', () => {
      setzeRolle(select.dataset.rolleUser, select.value, select.dataset.rolleName);
    });
  });
  container.appendChild(rollenBlock);

  return container;
}

// --- Start -----------------------------------------------------------------
(async function start() {
  await checkAuth();
  if (STATE.user) {
    await ladeAlles();
  }
  render();
})();
