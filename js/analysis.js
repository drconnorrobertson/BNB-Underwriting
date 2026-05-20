'use strict';

// ── SEED DATA INIT ─────────────────────────────────────────────────────────────
function initSeedData() {
  if (typeof SEED_PROPS === 'undefined') return;
  let changed = false;
  Object.entries(SEED_PROPS).forEach(([sid, props]) => {
    if (!APP.props[sid] || APP.props[sid].length === 0) {
      APP.props[sid] = props;
      changed = true;
    }
  });
  if (changed) save();
}

// ── PRELIM SCREEN ALL PROPERTIES (no API, instant) ────────────────────────────
function runPrelimAll() {
  let count = 0;
  Object.entries(APP.props).forEach(([sid, props]) => {
    const search = APP.searches.find(s => s.id === sid);
    if (!search) return;
    props.forEach(prop => {
      if (!prop) return;
      if (prop.beds < 1) prop.beds = 3; // default to 3 beds if missing
      const screening = prelimScreen(prop, search);
      prop.prelim = screening;
      // Apply auto-DQ rules if buybox module loaded
      if (typeof applyDQRules === 'function') {
        const dq = applyDQRules(prop);
        if (!dq.pass) { prop.autoDQ = true; prop.dqReasons = dq.failedRules; }
      }
      count++;
    });
  });
  save();
  if (typeof renderPropGrid === 'function') renderPropGrid();
  if (typeof updateNavCounts === 'function') updateNavCounts();
  return count;
}

// ── LOAD FRESH PROPERTIES FROM RAPIDAPI ───────────────────────────────────────
async function loadSearchProps(searchId) {
  const search = APP.searches.find(s => s.id === searchId);
  if (!search) return;
  ST(`Loading listings - ${search.name}...`);
  try {
    const results = await fetchRealProps(search, 200);
    if (results.length > 0) {
      const existing = APP.props[searchId] || [];
      const existingMap = Object.fromEntries(existing.map(p => [p.propertyId || p.id, p]));
      APP.props[searchId] = results.map(r => ({
        ...r,
        prelim: existingMap[r.propertyId]?.prelim || null,
      }));
      APP.props[searchId].forEach(prop => {
        if (!prop.prelim) {
          prop.prelim = prelimScreen(prop, search);
        }
        if (typeof applyDQRules === 'function') {
          const dq = applyDQRules(prop);
          if (!dq.pass) { prop.autoDQ = true; prop.dqReasons = dq.failedRules; }
        }
      });
      save();
      if(window.updateLastUpdatedBar)updateLastUpdatedBar();ST(`Loaded ${results.length} listings for ${search.name}`);
      setTimeout(HIDE, 3000);
    } else {
      ST(`No listings returned for ${search.name}`);
      setTimeout(HIDE, 3000);
    }
  } catch (e) {
    HIDE(); ERR(`Failed to load ${search.name}: ${e.message}`); console.error(e);
  }
  if (typeof renderPropGrid === 'function') renderPropGrid();
  if (typeof updateNavCounts === 'function') updateNavCounts();
}

async function loadAllSearches() {
  // Use buy boxes if available, otherwise fall back to old searches
  if (typeof runAllBuyBoxes === 'function' && APP.buyBoxes && APP.buyBoxes.length > 0) {
    return runAllBuyBoxes();
  }
  const btn = G('loadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
  let total = 0;
  for (let i = 0; i < APP.searches.length; i++) {
    const s = APP.searches[i];
    if (btn) btn.textContent = `Loading ${i + 1}/${APP.searches.length}...`;
    try {
      const results = await fetchRealProps(s, 200);
      if (results.length > 0) {
        results.forEach(r => { r.prelim = prelimScreen(r, s); });
        APP.props[s.id] = results; total += results.length;
      }
    } catch (e) { console.warn(`${s.name}: ${e.message}`); }
    if (i < APP.searches.length - 1) await new Promise(r => setTimeout(r, 400));
  }
  save();
  if (btn) { btn.disabled = false; btn.textContent = '↻ Refresh'; }
  if(window.updateLastUpdatedBar)updateLastUpdatedBar();ST(`Refreshed ${total} properties across ${APP.searches.length} markets`);
  setTimeout(HIDE, 4000);
  if (typeof renderPropGrid === 'function') renderPropGrid();
  if (typeof updateNavCounts === 'function') updateNavCounts();
}

// ── AIRROI FULL ANALYSIS (runs on "Build Proforma" click ONLY) ────────────────
async function buildProforma(propId) {
  const prop = getAllProps().find(p => p.id === propId);
  if (!prop) return;
  const search = APP.searches.find(s => s.id === prop.searchId);
  if (!search) return;

  const body = G('panelBody');
  if (body) body.innerHTML = `<div style="padding:40px 20px;text-align:center"><div class="spin" style="margin:0 auto 16px;width:24px;height:24px;border-width:3px"></div><div style="font-size:14px;font-weight:600;color:var(--tx2)">Running AirROI Analysis...</div><div style="font-size:11px;color:var(--tx3);margin-top:6px">3 API calls - Good / Better / Best scenarios</div><div style="font-size:10px;color:var(--am);margin-top:10px;padding:8px;background:var(--ambg);border-radius:var(--r)">This will use 3 API credits ($0.15)</div></div>`;

  initAmen(search.tags);

  try {
    const lat = prop.lat || search.lat, lng = prop.lng || search.lng;
    const beds = prop.beds || search.beds_min, baths = prop.baths || Math.ceil(beds * .6);

    ST(`${prop.address} - Good scenario...`);
    const gRaw = await getEstimate(lat, lng, beds, baths, getIds('good'));

    ST(`${prop.address} - Better scenario...`);
    const bRaw = await getEstimate(lat, lng, beds, baths, getIds('better'));

    ST(`${prop.address} - Best scenario...`);
    const xRaw = await getEstimate(lat, lng, beds, baths, getIds('best'));
    HIDE();

    // Calculate separate amenity costs per tier
    const betterAmens = allA().filter(a => (a.tier === 'good' || a.tier === 'better') && AS[a.id] && !a.always);
    const bestAmens = allA().filter(a => AS[a.id] && !a.always);
    const betterAmenCost = betterAmens.reduce((s, a) => s + (a.cost || 0), 0);
    const bestAmenCost = bestAmens.reduce((s, a) => s + (a.cost || 0), 0);
    
    const gE = extractEst(gRaw), bE = extractEst(bRaw), xE = extractEst(xRaw);
    const G_t = buildTier(gE, prop.listPrice, prop.state, beds, 0);
    const B_t = buildTier(bE, prop.listPrice, prop.state, beds, betterAmenCost);
    const X_t = buildTier(xE, prop.listPrice, prop.state, beds, bestAmenCost);
    
    // Store amenity lists per tier for display
    G_t.amenityList = AMEN.essentials.map(a => a.label);
    G_t.amenityListCost = AMEN.essentials.reduce((s, a) => s + (a.cost || 0), 0);
    B_t.amenityList = [...AMEN.essentials, ...betterAmens].map(a => a.label);
    B_t.amenityListCost = betterAmenCost;
    X_t.amenityList = [...AMEN.essentials, ...bestAmens].map(a => a.label);
    X_t.amenityListCost = bestAmenCost;
    const classification = classifyDeal(B_t, prop.listPrice, prop.state, beds, amenCost);

    APP.analyses[propId] = { propId, analyzedAt: Date.now(), good: G_t, better: B_t, best: X_t, classification };

    // Update prelim with real data
    const pIdx = (APP.props[prop.searchId] || []).findIndex(p => p.id === propId);
    if (pIdx >= 0) APP.props[prop.searchId][pIdx].prelim = {
      prelim_status: classification.status === 'good' ? 'good' : classification.status === 'needs-offer' ? 'needs-offer' : 'reject',
      prelim_coc: B_t.coc, prelim_revenue: B_t.revenue, prelim_tier: B_t, is_airroi: true
    };

    // Auto-add to pipeline as "analyzed"
    if (typeof setPipelineStage === 'function' && typeof getPipelineStage === 'function') {
      if (!getPipelineStage(propId)) {
        setPipelineStage(propId, 'analyzed');
      }
    }

    // Auto-score
    if (typeof scoreDeal === 'function' && APP.pipeline?.[propId]) {
      APP.pipeline[propId].score = scoreDeal(prop);
    }

    save();
    if (typeof renderPropGrid === 'function') renderPropGrid();
    if (typeof updateNavCounts === 'function') updateNavCounts();
    openPropPanel(propId);

  } catch (e) {
    HIDE(); ERR(`AirROI failed: ${e.message}`); console.error(e);
    openPropPanel(propId);
  }
}

// ── SEARCH DROPDOWN ────────────────────────────────────────────────────────────
function populateSearchFilter() {
  const sel = G('searchFilter');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  // Use buy boxes if available
  const sources = (APP.buyBoxes && APP.buyBoxes.length > 0) ? APP.buyBoxes : APP.searches;
  sources.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.name;
    sel.appendChild(o);
  });
}

function submitAddSearch() {
  // Legacy - now redirects to buy box modal
  if (typeof openBuyBoxModal === 'function') {
    openBuyBoxModal();
    G('addModal')?.classList.remove('open');
    return;
  }
  // Fallback to old behavior
  const name = G('newName')?.value.trim(), loc = G('newLoc')?.value.trim();
  const lat = parseFloat(G('nLat')?.value) || 0, lng = parseFloat(G('nLng')?.value) || 0;
  if (!name || !loc) { alert('Name and location required.'); return; }
  const tags = (G('nTags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
  const ns = { id: 'u' + Date.now(), name, city: loc.split(',')[0].trim(), state: loc.split(',').pop()?.trim() || '',
    lat, lng, radius: 20, beds_min: parseInt(G('nBeds')?.value) || 4,
    pmin: parseInt(G('nPMin')?.value) || 300000, pmax: parseInt(G('nPMax')?.value) || 1000000, tags };
  APP.searches.push(ns); save(); populateSearchFilter();
  G('addModal')?.classList.remove('open');
  renderPropGrid();
}

// ── DQ FUNCTIONS ───────────────────────────────────────────────────────────────
function dqProp(propId) {
  APP.dqPropId = propId;
  G('dqModal')?.classList.add('open');
  regenMemo();
}

function saveDQ() {
  const propId = APP.dqPropId;
  const prop = getAllProps().find(p => p.id === propId);
  if (!prop) return;
  const a = APP.analyses[propId];
  const ex = APP.dqLog.findIndex(d => d.propId === propId);
  const entry = { propId, address: prop.address, city: prop.city, state: prop.state,
    askPrice: prop.listPrice, coc: a?.better?.coc || prop.prelim?.prelim_coc || 0,
    viablePrice: a?.classification?.viablePrice || null,
    reason: G('dqReason')?.value || 'price_too_high',
    agentName: G('agentName')?.value || '', agentEmail: G('agentEmail')?.value || '', agentPhone: G('agentPhone')?.value || '',
    memoSent: false, date: Date.now() };
  if (ex >= 0) APP.dqLog[ex] = entry; else APP.dqLog.push(entry);
  const si = prop.searchId;
  const pi = (APP.props[si] || []).findIndex(p => p.id === propId);
  if (pi >= 0) APP.props[si][pi].dqd = true;

  // Also update pipeline
  if (typeof setPipelineStage === 'function') {
    setPipelineStage(propId, 'dqd');
  }

  save(); G('dqModal')?.classList.remove('open');
  if (typeof renderPropGrid === 'function') renderPropGrid();
  if (typeof updateNavCounts === 'function') updateNavCounts();
  if (typeof renderDQView === 'function') renderDQView();
}

function regenMemo() {
  const propId = APP.dqPropId;
  const prop = getAllProps().find(p => p.id === propId);
  const a = APP.analyses[propId];
  if (!prop) return;
  const B = a?.better;
  const ask = prop.listPrice;
  const viable = a?.classification?.viablePrice || Math.round(ask * .88);
  const gap = ask - viable;
  const agentName = G('agentName')?.value || '';
  const terms = ['ct_pr', 'ct_sc', 'ct_sx', 'ct_rb', 'ct_lo'].filter(id => G(id)?.checked).map(id => G(id)?.value);
  const tm = {
    price_reduction: `  - Price reduction to ${fm(viable)} (${fpc((gap / ask) * 100)} below ask)`,
    seller_credit: `  - Seller credit of ${fm(Math.round(gap * .6))} at closing`,
    seller_carry: `  - Seller carry 2nd mortgage of ${fm(Math.round(gap * 1.1))} at 5% for 5 years`,
    rate_buydown: `  - 2/1 buydown (${fm(Math.round(gap * .4))} cost)`,
    lease_option: `  - Lease-option at ${fm(Math.round(ask * .006))}/mo for 24 months, option at ${fm(viable)}`,
  };
  const tLines = terms.map(t => tm[t] || '').filter(Boolean).join('\n') || `  - Purchase price of ${fm(viable)}`;
  const memo = `Subject: ${prop.address}, ${prop.city} ${prop.state} - Alternative Offer Structures\n\n${agentName ? `Dear ${agentName},` : 'Dear Listing Agent,'}\n\nThank you for reviewing ${prop.address}. After completing our STR underwriting, I want to share our analysis and propose structures that could work for both parties.\n\nWHY WE CANNOT PROCEED AT ${fm(ask)}\n  - Estimated Annual Revenue: ${fm(B?.revenue || prop.prelim?.prelim_revenue)}\n  - Projected Net Cash Flow: ${fm(B?.ncfYr)}/year\n  - Cash on Cash Return: ${fpc(B?.coc || prop.prelim?.prelim_coc)} (minimum: ${COC_OFFER}%)\n\nWHAT WOULD WORK\n${tLines}\n\nABOUT OUR GROUP\nWe close multiple STR properties monthly. Conventional financing, quick inspection, no extended contingencies.\n\nBest regards,\nBNB Accelerator Acquisitions\n\n[Internal: ${propId} | Ask: ${fm(ask)} | CoC: ${fpc(B?.coc || prop.prelim?.prelim_coc)} | Viable: ${fm(viable)}]`;
  const mp = G('memoPreview');
  if (mp) mp.value = memo;
}

function copyMemo() { const t = G('memoPreview'); if (!t) return; navigator.clipboard.writeText(t.value); const b = G('copyMemoBtn'); if (b) { b.textContent = 'Copied!'; setTimeout(() => b.textContent = 'Copy Memo', 2000); } }
function markSent() { const d = APP.dqLog.find(x => x.propId === APP.dqPropId); if (d) { d.memoSent = true; d.memoSentDate = Date.now(); } save(); G('dqModal')?.classList.remove('open'); if (typeof renderDQView === 'function') renderDQView(); }
