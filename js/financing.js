'use strict';

// ── FINANCING SCENARIOS + SENSITIVITY + RENO COSTS ────────────────────────────

const FINANCING_PRESETS = {
  conventional: { label: 'Conventional', down: 0.10, rate: 6.0, term: 30, pmi: true, closingPct: 0.03 },
  dscr: { label: 'DSCR Loan', down: 0.25, rate: 7.5, term: 30, pmi: false, closingPct: 0.05 },
  seller: { label: 'Seller Finance', down: 0.10, rate: 5.0, term: 20, pmi: false, closingPct: 0.02 },
  cash: { label: 'All Cash', down: 1.0, rate: 0, term: 0, pmi: false, closingPct: 0.01 },
};

function buildTierWithFinancing(est, price, state, beds, amenCost, fin) {
  const downAmt = price * fin.down;
  const mort = price - downAmt;
  const cc = price * fin.closingPct;
  const totalCash = downAmt + cc + amenCost;
  const pi = fin.rate > 0 && fin.term > 0 ? calcPI(mort, fin.rate, fin.term) : 0;
  const taxMo = price * taxR(state) / 12;
  const insMo = price * insR(state) / 12;
  const pmi = fin.pmi && fin.down < 0.20 ? mort * 0.006 / 12 : 0;
  const gasElec = beds >= 6 ? 320 : beds >= 5 ? 260 : beds >= 4 ? 210 : 160;
  const fixedTotal = pi + taxMo + insMo + pmi + 80 + 80 + 140;
  const gbrMo = est.revenue / 12;
  const variableTotal = gbrMo * 0.08 + gbrMo * 0.20 + gbrMo * 0.03 + 1500 + gasElec;
  const gmiMo = gbrMo + 1500;
  const totExpMo = fixedTotal + variableTotal;
  const ncfMo = gmiMo - totExpMo;
  const ncfYr = ncfMo * 12;
  const coc = totalCash > 0 ? (ncfYr / totalCash) * 100 : 0;
  const lp = landP(state), basis = price * (1 - lp);
  const bonusDep = basis * 0.30, slDep = basis * 0.70 / 27.5;
  const taxSav = (bonusDep + slDep) * 0.37;
  const yr1 = ncfYr + taxSav;
  const roi = totalCash > 0 ? (yr1 / totalCash) * 100 : 0;

  return { revenue: est.revenue, occ: est.occ, adr: est.adr, down: downAmt, mort, cc, amenCost, totalCash, pi, taxMo, insMo, pmi, fixedTotal, variableTotal, gmiMo, totExpMo, ncfMo, ncfYr, coc, taxSav, yr1, roi, gasElec, finType: fin.label };
}

// ── FINANCING TABS ────────────────────────────────────────────────────────────
function renderFinancingTabs(prop, estimate, amenCost) {
  if (!estimate) return '';
  const est = { revenue: estimate.revenue || 0, occ: estimate.occ || 0.5, adr: estimate.adr || 0 };
  const results = {};
  Object.entries(FINANCING_PRESETS).forEach(([key, fin]) => {
    results[key] = buildTierWithFinancing(est, prop.listPrice, prop.state, prop.beds, amenCost || 0, fin);
  });

  let html = `<div class="pf-section">
    <div class="pf-section-title">💰 FINANCING SCENARIOS</div>
    <div style="padding:12px 20px">
      <div class="fin-tabs">
        ${Object.entries(FINANCING_PRESETS).map(([key, fin], i) => `<button class="fin-tab ${i === 0 ? 'active' : ''}" onclick="switchFinTab('${key}')">${fin.label}</button>`).join('')}
      </div>`;

  Object.entries(results).forEach(([key, t], i) => {
    const cocColor = t.coc >= COC_GOOD ? 'var(--gr)' : t.coc >= COC_OFFER ? 'var(--am)' : 'var(--rd)';
    html += `<div class="fin-panel ${i === 0 ? 'active' : ''}" id="finPanel_${key}">
      <div class="fin-grid">
        <div class="fin-metric"><div class="fin-mv">${fm(t.totalCash)}</div><div class="fin-mk">Total Cash Needed</div></div>
        <div class="fin-metric"><div class="fin-mv">${fm(t.down)}</div><div class="fin-mk">Down (${Math.round((t.down / prop.listPrice) * 100)}%)</div></div>
        <div class="fin-metric"><div class="fin-mv">${fm(t.pi)}</div><div class="fin-mk">Monthly P&I</div></div>
        <div class="fin-metric"><div class="fin-mv" style="color:${t.ncfMo >= 0 ? 'var(--gr)' : 'var(--rd)'}">${fm(t.ncfMo)}</div><div class="fin-mk">Monthly Cash Flow</div></div>
        <div class="fin-metric"><div class="fin-mv" style="color:${t.ncfYr >= 0 ? 'var(--gr)' : 'var(--rd)'}">${fm(t.ncfYr)}</div><div class="fin-mk">Annual Cash Flow</div></div>
        <div class="fin-metric"><div class="fin-mv" style="color:${cocColor};font-size:22px;font-weight:700">${fpc(t.coc)}</div><div class="fin-mk">Cash on Cash</div></div>
      </div>
      <div class="fin-details">
        <div class="fin-row"><span>Purchase Price</span><span>${fm(prop.listPrice)}</span></div>
        <div class="fin-row"><span>Down Payment</span><span>${fm(t.down)} (${Math.round((t.down / prop.listPrice) * 100)}%)</span></div>
        <div class="fin-row"><span>Loan Amount</span><span>${fm(t.mort)}</span></div>
        <div class="fin-row"><span>Interest Rate</span><span>${FINANCING_PRESETS[key].rate}%</span></div>
        <div class="fin-row"><span>Term</span><span>${FINANCING_PRESETS[key].term ? FINANCING_PRESETS[key].term + ' years' : 'N/A'}</span></div>
        <div class="fin-row"><span>Monthly P&I</span><span>${fm(t.pi)}</span></div>
        <div class="fin-row"><span>PMI</span><span>${t.pmi > 0 ? fm(t.pmi) + '/mo' : 'None'}</span></div>
        <div class="fin-row"><span>Closing Costs</span><span>${fm(t.cc)} (${Math.round(FINANCING_PRESETS[key].closingPct * 100)}%)</span></div>
        <div class="fin-row total"><span>Year 1 Total Return (CF + Tax)</span><span style="color:var(--gr)">${fm(t.yr1)}</span></div>
        <div class="fin-row total"><span>Year 1 ROI</span><span style="color:var(--gold)">${fpc(t.roi)}</span></div>
      </div>
    </div>`;
  });

  html += '</div></div>';
  return html;
}

function switchFinTab(key) {
  document.querySelectorAll('.fin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.fin-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.fin-tab[onclick*="${key}"]`)?.classList.add('active');
  G('finPanel_' + key)?.classList.add('active');
}

// ── SENSITIVITY ANALYSIS ──────────────────────────────────────────────────────
function renderSensitivity(prop, betterTier) {
  if (!betterTier) return '';
  const baseOcc = betterTier.occ || 0.55;
  const baseAdr = betterTier.adr || 250;
  const baseRate = RATE;
  const baseExpMult = 1.0;

  let html = `<div class="pf-section">
    <div class="pf-section-title">📉 SENSITIVITY ANALYSIS</div>
    <div style="padding:12px 20px" id="sensitivityPanel" data-price="${prop.listPrice}" data-state="${prop.state}" data-beds="${prop.beds}" data-amen="${betterTier.amenCost || 0}" data-rev="${betterTier.revenue}" data-occ="${baseOcc}" data-adr="${baseAdr}">
      <div class="sens-sliders">
        <div class="sens-row">
          <label class="sens-label">Occupancy: <strong id="sensOccVal">${(baseOcc * 100).toFixed(0)}%</strong></label>
          <input type="range" class="sens-slider" id="sensOcc" min="${Math.max(0.20, baseOcc - 0.20)}" max="${Math.min(0.95, baseOcc + 0.20)}" step="0.01" value="${baseOcc}" oninput="updateSensitivity()"/>
        </div>
        <div class="sens-row">
          <label class="sens-label">ADR: <strong id="sensAdrVal">${fm(baseAdr)}</strong></label>
          <input type="range" class="sens-slider" id="sensAdr" min="${Math.round(baseAdr * 0.70)}" max="${Math.round(baseAdr * 1.30)}" step="5" value="${baseAdr}" oninput="updateSensitivity()"/>
        </div>
        <div class="sens-row">
          <label class="sens-label">Interest Rate: <strong id="sensRateVal">${baseRate}%</strong></label>
          <input type="range" class="sens-slider" id="sensRate" min="4.0" max="10.0" step="0.25" value="${baseRate}" oninput="updateSensitivity()"/>
        </div>
        <div class="sens-row">
          <label class="sens-label">Expense Multiplier: <strong id="sensExpVal">${(baseExpMult * 100).toFixed(0)}%</strong></label>
          <input type="range" class="sens-slider" id="sensExp" min="0.85" max="1.15" step="0.01" value="${baseExpMult}" oninput="updateSensitivity()"/>
        </div>
      </div>
      <div class="sens-results" id="sensResults">
        <div class="sens-result-card" id="sensResultCard">
          <div style="font-size:9px;font-weight:600;color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Adjusted Metrics</div>
          <div class="sens-grid">
            <div><div class="sens-rv" id="sensRevResult">${fm(betterTier.revenue)}</div><div class="sens-rk">Revenue</div></div>
            <div><div class="sens-rv" id="sensCFResult" style="color:var(--gr)">${fm(betterTier.ncfYr)}</div><div class="sens-rk">Annual CF</div></div>
            <div><div class="sens-rv" id="sensCoCResult" style="color:var(--gr)">${fpc(betterTier.coc)}</div><div class="sens-rk">CoC Return</div></div>
            <div><div class="sens-rv" id="sensCashResult">${fm(betterTier.totalCash)}</div><div class="sens-rk">Cash Needed</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  return html;
}

function updateSensitivity() {
  const panel = G('sensitivityPanel');
  if (!panel) return;
  const price = +panel.dataset.price;
  const state = panel.dataset.state;
  const beds = +panel.dataset.beds;
  const amenCost = +panel.dataset.amen;
  const baseRev = +panel.dataset.rev;
  const baseOcc = +panel.dataset.occ;
  const baseAdr = +panel.dataset.adr;

  const occ = parseFloat(G('sensOcc')?.value || baseOcc);
  const adr = parseFloat(G('sensAdr')?.value || baseAdr);
  const rate = parseFloat(G('sensRate')?.value || RATE);
  const expMult = parseFloat(G('sensExp')?.value || 1.0);

  // Update labels
  const sv = (id, v) => { const e = G(id); if (e) e.textContent = v; };
  sv('sensOccVal', (occ * 100).toFixed(0) + '%');
  sv('sensAdrVal', fm(adr));
  sv('sensRateVal', rate.toFixed(2) + '%');
  sv('sensExpVal', (expMult * 100).toFixed(0) + '%');

  // Recalculate
  const adjRev = adr * occ * 365;
  const est = { revenue: adjRev, occ: occ, adr: adr };
  const fin = { ...FINANCING_PRESETS.conventional, rate: rate };
  const tier = buildTierWithFinancing(est, price, state, beds, amenCost, fin);

  // Apply expense multiplier
  const adjExpMo = tier.totExpMo * expMult;
  const adjNcfMo = tier.gmiMo - adjExpMo;
  const adjNcfYr = adjNcfMo * 12;
  const adjCoc = tier.totalCash > 0 ? (adjNcfYr / tier.totalCash) * 100 : 0;

  const cocColor = adjCoc >= COC_GOOD ? 'var(--gr)' : adjCoc >= COC_OFFER ? 'var(--am)' : 'var(--rd)';
  const cfColor = adjNcfYr >= 0 ? 'var(--gr)' : 'var(--rd)';

  sv('sensRevResult', fm(adjRev));
  const cfEl = G('sensCFResult'); if (cfEl) { cfEl.textContent = fm(adjNcfYr); cfEl.style.color = cfColor; }
  const cocEl = G('sensCoCResult'); if (cocEl) { cocEl.textContent = fpc(adjCoc); cocEl.style.color = cocColor; }
  sv('sensCashResult', fm(tier.totalCash));
}

// ── RENOVATION COST ESTIMATOR ─────────────────────────────────────────────────
const RENO_ITEMS = [
  { id: 'reno_hottub', name: 'Hot Tub', min: 6000, max: 10000, default: 8000 },
  { id: 'reno_gameroom', name: 'Game Room', min: 3000, max: 8000, default: 5000 },
  { id: 'reno_pool', name: 'Pool', min: 30000, max: 60000, default: 45000 },
  { id: 'reno_firepit', name: 'Fire Pit', min: 1500, max: 3000, default: 2500 },
  { id: 'reno_smart', name: 'Smart Home', min: 2000, max: 4000, default: 3000 },
  { id: 'reno_outdoor_kitchen', name: 'Outdoor Kitchen', min: 5000, max: 15000, default: 8000 },
  { id: 'reno_sauna', name: 'Sauna', min: 8000, max: 15000, default: 12000 },
  { id: 'reno_theater', name: 'Theater Room', min: 10000, max: 20000, default: 15000 },
];

function renderRenoCosts() {
  let html = `<div class="pf-section">
    <div class="pf-section-title">🔧 RENOVATION COST ESTIMATOR</div>
    <div style="padding:12px 20px">
      <div style="font-size:10px;color:var(--tx3);margin-bottom:10px">Select amenities and enter actual contractor quotes. Defaults are market averages.</div>
      <div class="reno-list">`;

  RENO_ITEMS.forEach(item => {
    html += `<div class="reno-item">
      <label class="reno-cb"><input type="checkbox" id="cb_${item.id}" onchange="updateRenoTotal()"/></label>
      <div class="reno-name">${item.name}</div>
      <div class="reno-range">${fmK(item.min)} - ${fmK(item.max)}</div>
      <div class="reno-input-wrap"><span>$</span><input type="number" id="cost_${item.id}" class="fi reno-cost-input" value="${item.default}" oninput="updateRenoTotal()"/></div>
    </div>`;
  });

  html += `</div>
      <div class="reno-total-bar">
        <span>Total Enhancement Cost:</span>
        <strong id="renoTotal">$0</strong>
      </div>
      <button class="btn btn-gold btn-sm" onclick="applyRenoCosts()" style="margin-top:8px">Apply to Proforma</button>
    </div>
  </div>`;
  return html;
}

function updateRenoTotal() {
  let total = 0;
  RENO_ITEMS.forEach(item => {
    const cb = G('cb_' + item.id);
    const cost = G('cost_' + item.id);
    if (cb?.checked && cost) total += parseInt(cost.value) || 0;
  });
  const el = G('renoTotal');
  if (el) el.textContent = fm(total);
  return total;
}

function applyRenoCosts() {
  const total = updateRenoTotal();
  // Update the enhancement total display
  const et = G('enhTotal');
  if (et) et.textContent = fm(total);
  ST('Enhancement budget updated to ' + fm(total));
  setTimeout(HIDE, 2000);
}
