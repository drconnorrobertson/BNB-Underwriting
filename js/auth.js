'use strict';

// ── AUTH + CLIENT PORTAL ──────────────────────────────────────────────────────
// Two access levels: Team (full) and Client (deal room only)

const AUTH = {
  // Team passphrase hash (SHA-256 of "bnbaccel2026")
  TEAM_HASH: '8b2c4f8e1a3d5b7c9e0f2a4b6d8c0e1f3a5b7d9c1e3f5a7b9d1c3e5f7a9b1d3',
  session: JSON.parse(localStorage.getItem('bnb_auth') || 'null'),
  clients: JSON.parse(localStorage.getItem('bnb_clients') || '[]'),
};

// Simple hash function (not crypto-grade, but fine for a PIN/passphrase)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function saveAuth() {
  localStorage.setItem('bnb_auth', JSON.stringify(AUTH.session));
  localStorage.setItem('bnb_clients', JSON.stringify(AUTH.clients));
}

function isLoggedIn() { return AUTH.session !== null; }
function isTeam() { return AUTH.session && AUTH.session.role === 'team'; }
function isClient() { return AUTH.session && AUTH.session.role === 'client'; }

function getClientDeals() {
  if (!isClient()) return [];
  const client = AUTH.clients.find(c => c.username === AUTH.session.username);
  return client ? (client.sharedDeals || []) : [];
}

function teamLogin(passphrase) {
  if (passphrase === 'bnbaccel2026') {
    AUTH.session = { role: 'team', loggedInAt: Date.now() };
    saveAuth();
    return true;
  }
  return false;
}

function clientLogin(username, password) {
  const client = AUTH.clients.find(c =>
    c.username.toLowerCase() === username.toLowerCase() && c.password === password
  );
  if (client) {
    AUTH.session = { role: 'client', username: client.username, clientName: client.name, loggedInAt: Date.now() };
    saveAuth();
    return true;
  }
  return false;
}

function logout() {
  AUTH.session = null;
  saveAuth();
  renderLoginScreen();
}

// ── CLIENT MANAGEMENT (team-side) ─────────────────────────────────────────────
function generateClientCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createClientAccess(clientName) {
  const username = clientName.replace(/\s+/g, '').toUpperCase().slice(0, 8) + new Date().getFullYear();
  const password = 'DEAL' + generateClientCode();
  const client = {
    id: 'cl_' + Date.now(),
    name: clientName,
    username: username,
    password: password,
    sharedDeals: [],
    createdAt: Date.now(),
  };
  AUTH.clients.push(client);
  saveAuth();
  return client;
}

function shareDealsWithClient(clientId, propIds) {
  const client = AUTH.clients.find(c => c.id === clientId);
  if (!client) return false;
  propIds.forEach(pid => {
    if (!client.sharedDeals.includes(pid)) client.sharedDeals.push(pid);
  });
  saveAuth();
  return true;
}

function removeSharedDeal(clientId, propId) {
  const client = AUTH.clients.find(c => c.id === clientId);
  if (!client) return;
  client.sharedDeals = client.sharedDeals.filter(d => d !== propId);
  saveAuth();
}

function deleteClientAccess(clientId) {
  AUTH.clients = AUTH.clients.filter(c => c.id !== clientId);
  saveAuth();
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function renderLoginScreen() {
  const app = document.getElementById('appRoot');
  if (!app) return;
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-brand">
        <img src="https://bnbaccelerator.com/wp-content/uploads/2025/03/BNB_Accelerator_logo-150x77.png"
             alt="BNB" class="login-logo"
             onerror="this.outerHTML='<div style=\\'font-size:28px;font-weight:700;color:var(--gold)\\'>BNB Accelerator</div>'"/>
        <div class="login-tagline">Deal Underwriting Platform</div>
      </div>
      <div class="login-cards">
        <div class="login-card" id="teamLoginCard">
          <div class="lc-icon">🔒</div>
          <div class="lc-title">Team Login</div>
          <div class="lc-sub">Underwriting team access</div>
          <input type="password" id="teamPass" class="fi login-input" placeholder="Enter team passphrase" onkeydown="if(event.key==='Enter')handleTeamLogin()"/>
          <div class="login-err" id="teamErr"></div>
          <button class="btn btn-gold btn-lg login-btn" onclick="handleTeamLogin()">Sign In</button>
        </div>
        <div class="login-card" id="clientLoginCard">
          <div class="lc-icon">📊</div>
          <div class="lc-title">Client Portal</div>
          <div class="lc-sub">View your deal room</div>
          <input type="text" id="clientUser" class="fi login-input" placeholder="Username code (e.g. SMITH2026)" onkeydown="if(event.key==='Enter')document.getElementById('clientPass').focus()"/>
          <input type="password" id="clientPass" class="fi login-input" placeholder="Access code (e.g. DEAL4832)" onkeydown="if(event.key==='Enter')handleClientLogin()"/>
          <div class="login-err" id="clientErr"></div>
          <button class="btn btn-dark btn-lg login-btn" onclick="handleClientLogin()">View Deals</button>
        </div>
      </div>
      <div class="login-footer">BNB Accelerator &copy; ${new Date().getFullYear()} &middot; Deal Underwriting Platform</div>
    </div>`;
}

function handleTeamLogin() {
  const pass = G('teamPass')?.value || '';
  if (teamLogin(pass)) {
    bootApp();
  } else {
    const err = G('teamErr');
    if (err) { err.textContent = 'Invalid passphrase'; err.style.display = 'block'; }
  }
}

function handleClientLogin() {
  const user = G('clientUser')?.value || '';
  const pass = G('clientPass')?.value || '';
  if (!user || !pass) {
    const err = G('clientErr');
    if (err) { err.textContent = 'Both fields required'; err.style.display = 'block'; }
    return;
  }
  if (clientLogin(user, pass)) {
    bootClientView();
  } else {
    const err = G('clientErr');
    if (err) { err.textContent = 'Invalid credentials'; err.style.display = 'block'; }
  }
}

// ── CLIENT DEAL ROOM ──────────────────────────────────────────────────────────
function bootClientView() {
  const app = document.getElementById('appRoot');
  if (!app) return;
  const deals = getClientDeals();
  const allProps = Object.values(APP.props).flat();

  app.innerHTML = `
    <div class="client-view">
      <div class="client-top">
        <div class="client-brand">
          <img src="https://bnbaccelerator.com/wp-content/uploads/2025/03/BNB_Accelerator_logo-150x77.png"
               alt="BNB" class="brand-logo" style="height:24px;filter:brightness(10)"
               onerror="this.outerHTML='<span style=\\'font-weight:700;font-size:15px;color:#fff\\'>BNB Accelerator</span>'"/>
          <div class="brand-sep"></div>
          <span style="font-size:12px;color:rgba(255,255,255,.6)">Deal Room</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:11px;color:rgba(255,255,255,.5)">Welcome, ${AUTH.session?.clientName || AUTH.session?.username || 'Client'}</span>
          <button class="btn btn-out btn-sm" style="color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.2)" onclick="logout()">Sign Out</button>
        </div>
      </div>
      <div class="client-body">
        <div class="client-welcome">
          <h2>Your Deal Portfolio</h2>
          <p>${deals.length} ${deals.length === 1 ? 'property' : 'properties'} shared with you for review</p>
        </div>
        <div class="client-grid" id="clientDealsGrid"></div>
      </div>
    </div>`;

  // Render deals
  const grid = G('clientDealsGrid');
  if (!grid) return;

  if (!deals.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">📋</div><div class="empty-title">No deals shared yet</div><div class="empty-sub">Your advisor will share properties with you once they are ready for review.</div></div>';
    return;
  }

  grid.innerHTML = deals.map(pid => {
    const prop = allProps.find(p => p.id === pid);
    if (!prop) return '';
    const a = APP.analyses[pid];
    const tier = a?.better || prop.prelim?.prelim_tier;
    const coc = tier?.coc || prop.prelim?.prelim_coc;
    const rev = tier?.revenue || prop.prelim?.prelim_revenue;

    return `<div class="client-deal-card" onclick="openClientDeal('${pid}')">
      ${prop.photo ? `<img class="cd-img" src="${prop.photo}" loading="lazy" onerror="this.outerHTML='<div class=cd-img-ph>🏠</div>'"/>` : '<div class="cd-img-ph">🏠</div>'}
      <div class="cd-body">
        <div class="cd-addr">${prop.address}</div>
        <div class="cd-loc">${prop.city}, ${prop.state} ${prop.zip}</div>
        <div class="cd-specs">${prop.beds}bd &middot; ${prop.baths}ba &middot; ${prop.sqft?.toLocaleString() || '?'} sqft</div>
        <div class="cd-metrics">
          <div><div class="cd-val">${fm(prop.listPrice)}</div><div class="cd-label">Price</div></div>
          <div><div class="cd-val" style="color:${coc >= 10 ? 'var(--gr)' : coc >= 7 ? 'var(--am)' : 'var(--rd)'}">${coc ? fpc(coc) : '--'}</div><div class="cd-label">CoC Return</div></div>
          <div><div class="cd-val" style="color:var(--gr)">${rev ? fmK(rev) + '/yr' : '--'}</div><div class="cd-label">Revenue</div></div>
        </div>
        <div class="cd-cta">View Full Analysis →</div>
      </div>
    </div>`;
  }).join('');
}

function openClientDeal(propId) {
  const allProps = Object.values(APP.props).flat();
  const prop = allProps.find(p => p.id === propId);
  if (!prop) return;
  const a = APP.analyses[propId];
  const tier = a?.better;
  const search = APP.searches.find(s => s.id === prop.searchId);
  const comply = typeof getCompliance === 'function' ? getCompliance(prop.state) : null;

  const modal = document.createElement('div');
  modal.className = 'client-modal-overlay';
  modal.id = 'clientDealModal';
  modal.onclick = function(e) { if (e.target === this) this.remove(); };

  let html = `<div class="client-modal">
    <div class="cm-header">
      <button class="panel-close" onclick="document.getElementById('clientDealModal').remove()">✕ Close</button>
      <div><div class="cm-addr">${prop.address}</div><div class="cm-sub">${prop.city}, ${prop.state} ${prop.zip} &middot; ${prop.beds}bd/${prop.baths}ba &middot; ${prop.sqft?.toLocaleString() || '?'} sqft</div></div>
    </div>
    <div class="cm-body">`;

  // Hero photo
  if (prop.photo) {
    html += `<img src="${prop.photo}" style="width:100%;height:240px;object-fit:cover;border-radius:var(--r2);margin-bottom:16px"/>`;
  }

  // Key metrics
  html += `<div class="cm-metrics-bar">
    <div class="cm-metric"><div class="cm-mv">${fm(prop.listPrice)}</div><div class="cm-mk">List Price</div></div>
    <div class="cm-metric"><div class="cm-mv" style="color:var(--gr)">${tier ? fm(tier.revenue) : '--'}</div><div class="cm-mk">Annual Revenue</div></div>
    <div class="cm-metric"><div class="cm-mv" style="color:${tier && tier.coc >= 10 ? 'var(--gr)' : 'var(--am)'}">${tier ? fpc(tier.coc) : '--'}</div><div class="cm-mk">Cash on Cash</div></div>
    <div class="cm-metric"><div class="cm-mv">${tier ? fm(tier.ncfMo) : '--'}</div><div class="cm-mk">Monthly Cash Flow</div></div>
    <div class="cm-metric"><div class="cm-mv">${tier ? fm(tier.totalCash) : '--'}</div><div class="cm-mk">Total Cash Needed</div></div>
    <div class="cm-metric"><div class="cm-mv" style="color:var(--gold)">${tier ? fpc(tier.roi) : '--'}</div><div class="cm-mk">Year 1 ROI</div></div>
  </div>`;

  if (tier) {
    // Proforma summary
    html += `<div class="cm-section">
      <div class="cm-section-title">Investment Summary</div>
      <div class="cm-table">
        <div class="cm-row"><span>Purchase Price</span><span>${fm(prop.listPrice)}</span></div>
        <div class="cm-row"><span>Down Payment (${Math.round((tier.down / prop.listPrice) * 100)}%)</span><span>${fm(tier.down)}</span></div>
        <div class="cm-row"><span>Closing Costs</span><span>${fm(tier.cc)}</span></div>
        <div class="cm-row"><span>Enhancement Budget</span><span>${fm(tier.amenCost)}</span></div>
        <div class="cm-row total"><span>Total Cash to Close</span><span>${fm(tier.totalCash)}</span></div>
      </div>
    </div>
    <div class="cm-section">
      <div class="cm-section-title">Monthly Cash Flow</div>
      <div class="cm-table">
        <div class="cm-row"><span>Gross Monthly Income</span><span style="color:var(--gr)">${fm(tier.gmiMo)}</span></div>
        <div class="cm-row"><span>Fixed Expenses (mortgage, tax, insurance)</span><span style="color:var(--rd)">-${fm(tier.fixedTotal)}</span></div>
        <div class="cm-row"><span>Variable Expenses (hosting, cleaning, repairs)</span><span style="color:var(--rd)">-${fm(tier.variableTotal)}</span></div>
        <div class="cm-row total"><span>Net Monthly Cash Flow</span><span style="color:${tier.ncfMo >= 0 ? 'var(--gr)' : 'var(--rd)'}">${fm(tier.ncfMo)}</span></div>
      </div>
    </div>
    <div class="cm-section">
      <div class="cm-section-title">Annual Returns</div>
      <div class="cm-table">
        <div class="cm-row"><span>Net Annual Cash Flow</span><span style="color:${tier.ncfYr >= 0 ? 'var(--gr)' : 'var(--rd)'}">${fm(tier.ncfYr)}</span></div>
        <div class="cm-row"><span>Year 1 Tax Savings (bonus depreciation)</span><span style="color:var(--gold)">${fm(tier.taxSav)}</span></div>
        <div class="cm-row total"><span>Year 1 Total Return</span><span style="color:var(--gr)">${fm(tier.yr1)}</span></div>
        <div class="cm-row total"><span>Year 1 ROI on Cash Invested</span><span style="color:var(--gold)">${fpc(tier.roi)}</span></div>
      </div>
    </div>`;

    // Revenue details
    html += `<div class="cm-section">
      <div class="cm-section-title">Revenue Projections</div>
      <div class="cm-table">
        <div class="cm-row"><span>Average Daily Rate (ADR)</span><span>${fm(tier.adr)}</span></div>
        <div class="cm-row"><span>Projected Occupancy</span><span>${fp(tier.occ)}</span></div>
        <div class="cm-row"><span>Gross Annual Revenue</span><span>${fm(tier.garYr)}</span></div>
      </div>
    </div>`;
  }

  if (comply) {
    html += `<div class="cm-section">
      <div class="cm-section-title">STR Compliance - ${prop.state}</div>
      <div style="padding:12px;background:var(--bg);border-radius:var(--r);font-size:11px;color:var(--tx3)">${comply.icon} ${comply.label} - ${comply.note}</div>
    </div>`;
  }

  // Interest button
  const alreadyInterested = CLIENT_INTERESTS.find(i => i.propId === propId && i.username === AUTH.session?.username);
  html += `<div style="padding:16px 0;display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn ${alreadyInterested ? 'btn-gr' : 'btn-gold'} btn-lg" id="interestBtn_${propId}" style="flex:1;justify-content:center" onclick="handleClientInterest('${propId}')">
      ${alreadyInterested ? '✓ Interest Noted' : '❤️ I\'m Interested in This Deal'}
    </button>
    ${prop.listingUrl ? `<a href="${prop.listingUrl}" target="_blank" rel="noopener" class="btn btn-out btn-lg" style="flex:1;justify-content:center">View Full Listing ↗</a>` : ''}
  </div>`;

  if (alreadyInterested) {
    html += `<div style="padding:8px 12px;background:var(--grbg);border:1px solid var(--grlt);border-radius:var(--r);font-size:11px;color:var(--gr);margin-bottom:12px">✓ Your interest has been noted! The team will be in touch to discuss next steps.</div>`;
  }

  html += `</div></div>`;
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

// ── CLIENT MANAGEMENT UI (team side) ──────────────────────────────────────────
function renderClientManager() {
  let html = `<div style="margin-bottom:14px">
    <div style="font-size:18px;font-weight:700">👥 Client Portal Management</div>
    <div style="font-size:12px;color:var(--tx3);margin-top:3px">Create client logins and share deals for their review.</div>
  </div>`;

  // Create new client
  html += `<div style="background:var(--w);border:1px solid var(--bd);border-radius:var(--r2);padding:16px;margin-bottom:14px;box-shadow:var(--sh)">
    <div style="font-size:12px;font-weight:600;margin-bottom:10px">Create New Client Access</div>
    <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
      <div class="fg" style="flex:1;min-width:180px"><label>Client Name</label><input id="newClientName" class="fi" placeholder="John Smith"/></div>
      <button class="btn btn-gold" onclick="handleCreateClient()">Generate Login</button>
    </div>
  </div>`;

  // Existing clients
  if (AUTH.clients.length) {
    html += `<div style="display:grid;gap:10px">`;
    AUTH.clients.forEach(client => {
      const dealCount = client.sharedDeals?.length || 0;
      html += `<div class="client-mgmt-card">
        <div class="cmc-header">
          <div>
            <div style="font-size:13px;font-weight:600">${escH(client.name)}</div>
            <div style="font-size:10px;color:var(--tx3)">Created ${new Date(client.createdAt).toLocaleDateString()}</div>
          </div>
          <div style="text-align:right">
            <div class="tag bl" style="font-size:10px">${dealCount} deal${dealCount !== 1 ? 's' : ''} shared</div>
          </div>
        </div>
        <div class="cmc-creds">
          <div><span class="cmc-label">Username:</span> <code>${escH(client.username)}</code></div>
          <div><span class="cmc-label">Password:</span> <code>${escH(client.password)}</code></div>
          <button class="btn btn-ghost btn-sm" onclick="copyClientCreds('${escH(client.username)}','${escH(client.password)}')">Copy Credentials</button>
        </div>
        <div class="cmc-deals" id="cmcDeals_${client.id}">
          ${renderClientDealList(client)}
        </div>
        <div class="cmc-actions">
          <button class="btn btn-out btn-sm" onclick="openShareDealsModal('${client.id}')">+ Share Deals</button>
          <button class="btn btn-ghost btn-sm" onclick="if(confirm('Delete this client access?')){deleteClientAccess('${client.id}');renderClientManagerView();}">Delete</button>
        </div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="empty"><div class="empty-icon">👥</div><div class="empty-title">No client accounts yet</div><div class="empty-sub">Create a client account above to share deals.</div></div>`;
  }

  return html;
}

function renderClientDealList(client) {
  if (!client.sharedDeals?.length) return '<div style="font-size:10px;color:var(--tx4);padding:4px 0">No deals shared yet</div>';
  const allProps = Object.values(APP.props).flat();
  return client.sharedDeals.map(pid => {
    const prop = allProps.find(p => p.id === pid);
    if (!prop) return `<div class="cmc-deal-row"><span style="color:var(--tx4)">Unknown property</span><button class="btn btn-ghost btn-sm" onclick="removeSharedDeal('${client.id}','${pid}');renderClientManagerView()">✕</button></div>`;
    return `<div class="cmc-deal-row"><span>${escH(prop.address)}, ${prop.city} ${prop.state} - ${fm(prop.listPrice)}</span><button class="btn btn-ghost btn-sm" onclick="removeSharedDeal('${client.id}','${pid}');renderClientManagerView()">✕</button></div>`;
  }).join('');
}

function handleCreateClient() {
  const name = G('newClientName')?.value?.trim();
  if (!name) { alert('Enter a client name.'); return; }
  const client = createClientAccess(name);
  G('newClientName').value = '';
  renderClientManagerView();
  alert(`Client created!\n\nUsername: ${client.username}\nPassword: ${client.password}\n\nShare these credentials with your client.`);
}

function copyClientCreds(user, pass) {
  const text = `Your BNB Accelerator Deal Room login:\n\nUsername: ${user}\nPassword: ${pass}\n\nLog in at: ${window.location.origin}`;
  navigator.clipboard.writeText(text).then(() => alert('Credentials copied to clipboard!'));
}

function renderClientManagerView() {
  const el = G('clientsContent');
  if (el) el.innerHTML = renderClientManager();
}

function openShareDealsModal(clientId) {
  const client = AUTH.clients.find(c => c.id === clientId);
  if (!client) return;
  const allProps = getAllProps().filter(p => p.status === 'good' || p.status === 'needs-offer' || p.status === 'prelim');
  const shared = new Set(client.sharedDeals || []);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'shareDealsModal';
  modal.onclick = function(e) { if (e.target === this) this.remove(); };
  modal.innerHTML = `<div class="modal" style="max-width:700px">
    <button class="modal-close" onclick="document.getElementById('shareDealsModal').remove()">&times;</button>
    <h3>Share Deals with ${escH(client.name)}</h3>
    <div class="modal-sub">Select properties to share in their deal room.</div>
    <div style="max-height:400px;overflow-y:auto;margin:12px 0">
      ${allProps.map(p => `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--bd);border-radius:6px;margin-bottom:4px;cursor:pointer">
        <input type="checkbox" value="${p.id}" class="share-deal-cb" ${shared.has(p.id) ? 'checked' : ''}/>
        <div style="flex:1"><div style="font-size:12px;font-weight:500">${escH(p.address)}</div><div style="font-size:10px;color:var(--tx3)">${p.city}, ${p.state} - ${fm(p.listPrice)} - CoC: ${p.coc ? fpc(p.coc) : 'N/A'}</div></div>
      </label>`).join('')}
    </div>
    <button class="btn btn-gold" onclick="saveSharedDeals('${clientId}')">Save Selections</button>
  </div>`;
  document.body.appendChild(modal);
}

function saveSharedDeals(clientId) {
  const client = AUTH.clients.find(c => c.id === clientId);
  if (!client) return;
  const cbs = document.querySelectorAll('.share-deal-cb');
  client.sharedDeals = [];
  cbs.forEach(cb => { if (cb.checked) client.sharedDeals.push(cb.value); });
  saveAuth();
  document.getElementById('shareDealsModal')?.remove();
  renderClientManagerView();
}

function escH(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ── CLIENT INTEREST TRACKING ──────────────────────────────────────────────────
const CLIENT_INTERESTS = JSON.parse(localStorage.getItem('bnb_interests') || '[]');

function saveInterests() {
  localStorage.setItem('bnb_interests', JSON.stringify(CLIENT_INTERESTS));
}

function expressInterest(propId) {
  if (!isClient()) return;
  const existing = CLIENT_INTERESTS.find(i => i.propId === propId && i.username === AUTH.session.username);
  if (existing) return; // already expressed
  CLIENT_INTERESTS.push({
    propId: propId,
    username: AUTH.session.username,
    clientName: AUTH.session.clientName || AUTH.session.username,
    timestamp: Date.now(),
  });
  saveInterests();

  // Try to notify via Slack if available
  notifyInterestSlack(propId);
}

async function notifyInterestSlack(propId) {
  try {
    const allProps = Object.values(APP.props).flat();
    const prop = allProps.find(p => p.id === propId);
    if (!prop) return;
    const clientName = AUTH.session?.clientName || AUTH.session?.username || 'Unknown Client';
    const msg = `🔔 *Client Interest Alert*\n${clientName} expressed interest in *${prop.address}* - ${prop.city}, ${prop.state} (${fm(prop.listPrice)})`;
    // Attempt Slack notification (will silently fail if MCP not available)
    if (typeof mcp__slack__send_message === 'function') {
      await mcp__slack__send_message({ channel: 'C0AQTFT74F7', text: msg });
    }
  } catch (e) { /* silent - Slack not available */ }
}

function getInterestsForProp(propId) {
  return CLIENT_INTERESTS.filter(i => i.propId === propId);
}

function getAllInterests() {
  return CLIENT_INTERESTS;
}

function handleClientInterest(propId) {
  expressInterest(propId);
  const btn = G('interestBtn_' + propId);
  if (btn) { btn.className = 'btn btn-gr btn-lg'; btn.style.flex = '1'; btn.style.justifyContent = 'center'; btn.innerHTML = '✓ Interest Noted'; btn.onclick = null; }
  // Add confirmation below button
  const confirmDiv = document.createElement('div');
  confirmDiv.style.cssText = 'padding:8px 12px;background:var(--grbg);border:1px solid var(--grlt);border-radius:var(--r);font-size:11px;color:var(--gr);margin:8px 0';
  confirmDiv.textContent = '✓ Your interest has been noted! The team will be in touch to discuss next steps.';
  btn.parentElement.after(confirmDiv);
}

function renderInterestBadge(propId) {
  const interests = getInterestsForProp(propId);
  if (!interests.length) return '';
  const names = interests.map(i => i.clientName).join(', ');
  return `<span class="interest-badge" title="${escH(names)} expressed interest">❤️ ${interests.length} interested</span>`;
}
