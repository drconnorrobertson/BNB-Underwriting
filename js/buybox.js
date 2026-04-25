'use strict';

// ── BUY BOX + SEARCH + DQ RULES ──────────────────────────────────────────────

// Buy Boxes stored separately from old searches for clean migration
if (!APP.buyBoxes) APP.buyBoxes = JSON.parse(localStorage.getItem('bnb_bb') || 'null');
if (!APP.dqRules) APP.dqRules = JSON.parse(localStorage.getItem('bnb_dqr') || 'null');

// Default DQ rules
const DQ_RULES_DEFAULT = [
  { id: 'r1', field: 'price', op: 'gt', value: 1000000, enabled: true, label: 'Price over $1M' },
  { id: 'r2', field: 'beds', op: 'lt', value: 2, enabled: true, label: 'Less than 2 beds' },
  { id: 'r3', field: 'hoa', op: 'gt', value: 500, enabled: true, label: 'HOA over $500/mo' },
];

// ── MIGRATION: convert old searches to buy boxes ──────────────────────────────
function migrateToBuyBoxes() {
  if (APP.buyBoxes && APP.buyBoxes.length > 0) return;
  APP.buyBoxes = APP.searches.map(s => ({
    id: s.id, name: s.name, city: s.city, state: s.state, zip: '',
    lat: s.lat, lng: s.lng, beds_min: s.beds_min, beds_max: null,
    pmin: s.pmin || 300000, pmax: s.pmax || 1000000, maxHoa: null,
    propertyTypes: [], tags: s.tags || [], radius: s.radius || 20,
    createdAt: Date.now(), lastRunAt: null, newCount: 0, resultsCount: 0,
  }));
  saveBuyBoxes();
}

function initDQRules() {
  if (APP.dqRules && APP.dqRules.length >= 0) return;
  APP.dqRules = DQ_RULES_DEFAULT;
  saveDQRules();
}

function saveBuyBoxes() {
  localStorage.setItem('bnb_bb', JSON.stringify(APP.buyBoxes));
}

function saveDQRules() {
  localStorage.setItem('bnb_dqr', JSON.stringify(APP.dqRules));
}

// ── BUY BOX CRUD ──────────────────────────────────────────────────────────────
function saveBuyBox(box) {
  const idx = APP.buyBoxes.findIndex(b => b.id === box.id);
  if (idx >= 0) APP.buyBoxes[idx] = box;
  else APP.buyBoxes.push(box);
  saveBuyBoxes();
  // Also ensure it exists in searches array for compatibility
  const sIdx = APP.searches.findIndex(s => s.id === box.id);
  const searchObj = { id: box.id, name: box.name, city: box.city, state: box.state, lat: box.lat || 0, lng: box.lng || 0, beds_min: box.beds_min || 3, pmin: box.pmin, pmax: box.pmax, tags: box.tags || [] };
  if (sIdx >= 0) APP.searches[sIdx] = searchObj;
  else APP.searches.push(searchObj);
  save();
}

function deleteBuyBox(boxId) {
  APP.buyBoxes = APP.buyBoxes.filter(b => b.id !== boxId);
  delete APP.props[boxId];
  APP.searches = APP.searches.filter(s => s.id !== boxId);
  saveBuyBoxes(); save();
}

// ── SEARCH EXECUTION ──────────────────────────────────────────────────────────
async function runBuyBox(boxId) {
  const box = APP.buyBoxes.find(b => b.id === boxId);
  if (!box) return 0;
  const search = { id: box.id, name: box.name, city: box.city, state: box.state, lat: box.lat || 0, lng: box.lng || 0, beds_min: box.beds_min || 3, pmin: box.pmin || 100000, pmax: box.pmax || 2000000, tags: box.tags || [] };

  ST(`Searching ${box.name}...`);
  try {
    let results = await fetchRealProps(search, 200);
    // Apply local filters
    if (box.beds_max) results = results.filter(p => p.beds <= box.beds_max);
    if (box.maxHoa) results = results.filter(p => (p.hoa || 0) <= box.maxHoa);

    // Prelim screen each (FREE)
    results.forEach(r => { r.prelim = prelimScreen(r, search); });

    // Apply auto-DQ rules
    results.forEach(r => {
      const dq = applyDQRules(r);
      if (!dq.pass) { r.autoDQ = true; r.dqReasons = dq.failedRules; }
    });

    const oldCount = (APP.props[box.id] || []).length;
    APP.props[box.id] = results;
    box.lastRunAt = Date.now();
    box.resultsCount = results.length;
    box.newCount = Math.max(0, results.length - oldCount);
    saveBuyBoxes(); save();
    HIDE();
    return results.length;
  } catch (e) {
    HIDE(); ERR(`Search failed for ${box.name}: ${e.message}`);
    return 0;
  }
}

async function runAllBuyBoxes() {
  const btn = G('loadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
  let total = 0;
  for (let i = 0; i < APP.buyBoxes.length; i++) {
    if (btn) btn.textContent = `Loading ${i + 1}/${APP.buyBoxes.length}...`;
    const count = await runBuyBox(APP.buyBoxes[i].id);
    total += count;
    if (i < APP.buyBoxes.length - 1) await new Promise(r => setTimeout(r, 400));
  }
  if (btn) { btn.disabled = false; btn.textContent = '↻ Refresh'; }
  ST(`Loaded ${total} properties across ${APP.buyBoxes.length} markets`);
  setTimeout(HIDE, 3000);
  renderPropGrid(); updateNavCounts();
}

// ── DQ RULES ENGINE ───────────────────────────────────────────────────────────
function applyDQRules(prop) {
  if (!APP.dqRules) return { pass: true, failedRules: [] };
  const failed = [];
  APP.dqRules.filter(r => r.enabled).forEach(rule => {
    let val;
    switch (rule.field) {
      case 'price': val = prop.listPrice; break;
      case 'beds': val = prop.beds; break;
      case 'baths': val = prop.baths; break;
      case 'hoa': val = prop.hoa || 0; break;
      case 'sqft': val = prop.sqft || 0; break;
      case 'dom': val = prop.dom || 0; break;
      default: return;
    }
    let fail = false;
    switch (rule.op) {
      case 'gt': fail = val > rule.value; break;
      case 'gte': fail = val >= rule.value; break;
      case 'lt': fail = val < rule.value; break;
      case 'lte': fail = val <= rule.value; break;
      case 'eq': fail = val === rule.value; break;
      case 'neq': fail = val !== rule.value; break;
    }
    if (fail) failed.push(rule);
  });
  return { pass: failed.length === 0, failedRules: failed };
}

function getAutoDQCount() {
  return Object.values(APP.props).flat().filter(p => p.autoDQ).length;
}

// ── BUY BOX MODAL HANDLING ────────────────────────────────────────────────────
function openBuyBoxModal(editId) {
  if (editId) {
    const box = APP.buyBoxes.find(b => b.id === editId);
    if (box) {
      const f = (id, v) => { const e = G(id); if (e) e.value = v || ''; };
      f('bbName', box.name); f('bbCity', box.city); f('bbState', box.state);
      f('bbZip', box.zip); f('bbPriceMin', box.pmin); f('bbPriceMax', box.pmax);
      f('bbBedsMin', box.beds_min); f('bbBedsMax', box.beds_max);
      f('bbMaxHoa', box.maxHoa); f('bbTags', (box.tags || []).join(', '));
      f('bbLat', box.lat); f('bbLng', box.lng);
      G('buyBoxModal')?.setAttribute('data-edit-id', editId);
    }
  } else {
    G('buyBoxModal')?.removeAttribute('data-edit-id');
    ['bbName', 'bbCity', 'bbState', 'bbZip', 'bbPriceMin', 'bbPriceMax', 'bbBedsMin', 'bbBedsMax', 'bbMaxHoa', 'bbTags', 'bbLat', 'bbLng'].forEach(id => { const e = G(id); if (e) e.value = ''; });
  }
  G('buyBoxModal')?.classList.add('open');
}

function handleSaveBuyBox() {
  const name = G('bbName')?.value?.trim();
  const city = G('bbCity')?.value?.trim();
  const state = G('bbState')?.value?.trim()?.toUpperCase();
  if (!name || !city || !state) { alert('Name, city, and state are required.'); return; }

  const editId = G('buyBoxModal')?.getAttribute('data-edit-id');
  const box = {
    id: editId || ('bb_' + Date.now()),
    name: name,
    city: city,
    state: state,
    zip: G('bbZip')?.value?.trim() || '',
    lat: parseFloat(G('bbLat')?.value) || 0,
    lng: parseFloat(G('bbLng')?.value) || 0,
    beds_min: parseInt(G('bbBedsMin')?.value) || 3,
    beds_max: parseInt(G('bbBedsMax')?.value) || null,
    pmin: parseInt(G('bbPriceMin')?.value) || 100000,
    pmax: parseInt(G('bbPriceMax')?.value) || 2000000,
    maxHoa: parseInt(G('bbMaxHoa')?.value) || null,
    propertyTypes: [],
    tags: (G('bbTags')?.value || '').split(',').map(t => t.trim()).filter(Boolean),
    createdAt: editId ? (APP.buyBoxes.find(b => b.id === editId)?.createdAt || Date.now()) : Date.now(),
    lastRunAt: null,
    newCount: 0,
    resultsCount: editId ? (APP.buyBoxes.find(b => b.id === editId)?.resultsCount || 0) : 0,
  };

  saveBuyBox(box);
  G('buyBoxModal')?.classList.remove('open');
  populateSearchFilter();
  renderSavedSearches();
}

// ── SAVED SEARCHES VIEW ───────────────────────────────────────────────────────
function renderSavedSearches() {
  const el = G('savedSearchesGrid');
  if (!el) return;
  if (!APP.buyBoxes || !APP.buyBoxes.length) {
    el.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-title">No saved searches</div><div class="empty-sub">Click "+ New Buy Box" to add a market search.</div></div>';
    return;
  }
  el.innerHTML = APP.buyBoxes.map(box => {
    const propCount = (APP.props[box.id] || []).length;
    const lastRun = box.lastRunAt ? new Date(box.lastRunAt).toLocaleString() : 'Never';
    const tags = (box.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join(' ');
    return `<div class="ss-card">
      <div class="ss-header">
        <div class="ss-name">${escH(box.name)}</div>
        <div class="ss-count">${propCount} properties</div>
      </div>
      <div class="ss-criteria">
        <span>${box.city}, ${box.state}</span>
        <span>${fm(box.pmin)} - ${fm(box.pmax)}</span>
        <span>${box.beds_min}+ beds${box.beds_max ? ' (max ' + box.beds_max + ')' : ''}</span>
        ${box.maxHoa ? `<span>Max HOA $${box.maxHoa}</span>` : ''}
      </div>
      <div class="ss-tags">${tags}</div>
      <div class="ss-meta">
        <span>Last run: ${lastRun}</span>
        ${box.newCount > 0 ? `<span class="tag gr">${box.newCount} new</span>` : ''}
      </div>
      <div class="ss-actions">
        <button class="btn btn-gold btn-sm" onclick="refreshBuyBox('${box.id}')">↻ Refresh</button>
        <button class="btn btn-out btn-sm" onclick="openBuyBoxModal('${box.id}')">Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="if(confirm('Delete this search?'))deleteBuyBox('${box.id}');renderSavedSearches();populateSearchFilter();">Delete</button>
      </div>
    </div>`;
  }).join('');
}

async function refreshBuyBox(boxId) {
  const count = await runBuyBox(boxId);
  renderSavedSearches();
  renderPropGrid();
  updateNavCounts();
  ST(`Found ${count} properties`);
  setTimeout(HIDE, 2000);
}

// ── DQ RULES PANEL ────────────────────────────────────────────────────────────
function renderDQRulesPanel() {
  const el = G('dqRulesPanel');
  if (!el) return;
  const dqCount = getAutoDQCount();

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <div><div style="font-size:13px;font-weight:600">Auto-DQ Rules</div><div style="font-size:10px;color:var(--tx3)">${dqCount} properties auto-disqualified</div></div>
  </div>`;

  html += `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">`;
  (APP.dqRules || []).forEach(rule => {
    const opLabels = { gt: '>', gte: '>=', lt: '<', lte: '<=', eq: '=', neq: '!=' };
    const fieldLabels = { price: 'Price', beds: 'Beds', baths: 'Baths', hoa: 'HOA/mo', sqft: 'Sqft', dom: 'Days on Market' };
    html += `<div class="dq-rule-row">
      <label class="dq-toggle"><input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="toggleDQRule('${rule.id}',this.checked)"/><span class="dq-slider"></span></label>
      <span class="dq-rule-text">${fieldLabels[rule.field] || rule.field} ${opLabels[rule.op] || rule.op} ${rule.field === 'price' || rule.field === 'hoa' ? fm(rule.value) : rule.value}</span>
      <button class="btn btn-ghost btn-sm" onclick="removeDQRule('${rule.id}')">✕</button>
    </div>`;
  });
  html += `</div>`;

  // Add new rule form
  html += `<div style="display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap">
    <div class="fg"><label>Field</label><select id="newDqField" class="fi" style="width:100px"><option value="price">Price</option><option value="beds">Beds</option><option value="hoa">HOA</option><option value="sqft">Sqft</option><option value="dom">DOM</option></select></div>
    <div class="fg"><label>Op</label><select id="newDqOp" class="fi" style="width:60px"><option value="gt">></option><option value="lt"><</option><option value="gte">>=</option><option value="lte"><=</option></select></div>
    <div class="fg"><label>Value</label><input id="newDqVal" type="number" class="fi" style="width:100px" placeholder="500000"/></div>
    <button class="btn btn-out btn-sm" onclick="addDQRule()">+ Add Rule</button>
  </div>`;

  el.innerHTML = html;
}

function toggleDQRule(ruleId, enabled) {
  const rule = (APP.dqRules || []).find(r => r.id === ruleId);
  if (rule) { rule.enabled = enabled; saveDQRules(); }
}

function removeDQRule(ruleId) {
  APP.dqRules = (APP.dqRules || []).filter(r => r.id !== ruleId);
  saveDQRules();
  renderDQRulesPanel();
}

function addDQRule() {
  const field = G('newDqField')?.value;
  const op = G('newDqOp')?.value;
  const value = parseFloat(G('newDqVal')?.value);
  if (!field || !op || isNaN(value)) { alert('Fill all fields.'); return; }
  if (!APP.dqRules) APP.dqRules = [];
  APP.dqRules.push({ id: 'r_' + Date.now(), field, op, value, enabled: true });
  saveDQRules();
  renderDQRulesPanel();
  G('newDqVal').value = '';
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initBuyBox() {
  migrateToBuyBoxes();
  initDQRules();
}
