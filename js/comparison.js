'use strict';

// ── COMPARISON + PORTFOLIO + OFFER SUMMARY ────────────────────────────────────

if (!APP.compareList) APP.compareList = JSON.parse(localStorage.getItem('bnb_cmp') || '[]');

function saveCompareList() {
  localStorage.setItem('bnb_cmp', JSON.stringify(APP.compareList));
}

function toggleCompare(propId) {
  const idx = APP.compareList.indexOf(propId);
  if (idx >= 0) { APP.compareList.splice(idx, 1); }
  else if (APP.compareList.length < 3) { APP.compareList.push(propId); }
  else { alert('Max 3 properties for comparison. Remove one first.'); return; }
  saveCompareList();
}

// ── SIDE-BY-SIDE COMPARISON ───────────────────────────────────────────────────
function renderCompareView() {
  const el = G('compareContent');
  if (!el) return;

  if (APP.compareList.length < 2) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">⚖️</div><div class="empty-title">Select 2-3 Properties to Compare</div><div class="empty-sub">Use the "Compare" button on property cards to add them here.</div></div>`;
    return;
  }

  const allProps = getAllProps();
  const props = APP.compareList.map(id => allProps.find(p => p.id === id)).filter(Boolean);
  if (props.length < 2) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">⚖️</div><div class="empty-title">Properties not found</div></div>';
    return;
  }

  const colW = props.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr';
  const metrics = [
    { label: 'List Price', key: 'listPrice', fmt: fm, better: 'low' },
    { label: 'Beds / Baths', key: null, fn: p => `${p.beds}bd / ${p.baths}ba` },
    { label: 'Sqft', key: 'sqft', fmt: v => v ? v.toLocaleString() : '--', better: 'high' },
    { label: 'Price / Bed', key: null, fn: p => fm(p.beds > 0 ? p.listPrice / p.beds : 0), val: p => p.beds > 0 ? p.listPrice / p.beds : 999999, better: 'low' },
    { label: 'Est. Revenue', key: 'rev', fmt: v => v ? fm(v) + '/yr' : '--', better: 'high' },
    { label: 'Cash on Cash', key: 'coc', fmt: v => v ? fpc(v) : '--', better: 'high' },
    { label: 'Monthly CF', key: null, fn: p => p.analysis?.better ? fm(p.analysis.better.ncfMo) : '--', val: p => p.analysis?.better?.ncfMo || 0, better: 'high' },
    { label: 'Annual CF', key: null, fn: p => p.analysis?.better ? fm(p.analysis.better.ncfYr) : '--', val: p => p.analysis?.better?.ncfYr || 0, better: 'high' },
    { label: 'Total Cash In', key: null, fn: p => p.analysis?.better ? fm(p.analysis.better.totalCash) : '--', val: p => p.analysis?.better?.totalCash || 999999, better: 'low' },
    { label: 'Enhancement', key: null, fn: p => p.analysis?.better ? fm(p.analysis.better.amenCost) : '--' },
    { label: 'Year 1 ROI', key: null, fn: p => p.analysis?.better ? fpc(p.analysis.better.roi) : '--', val: p => p.analysis?.better?.roi || 0, better: 'high' },
    { label: 'Deal Score', key: null, fn: p => { const s = typeof scoreDeal === 'function' ? scoreDeal(p) : 0; return s ? renderScoreBadge(s) : '--'; }, val: p => typeof scoreDeal === 'function' ? scoreDeal(p) : 0, better: 'high' },
    { label: 'Days on Market', key: 'dom', fmt: v => (v || 0) + ' days', better: 'high' },
    { label: 'HOA', key: 'hoa', fmt: v => v ? '$' + v + '/mo' : 'None', better: 'low' },
  ];

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div><div style="font-size:18px;font-weight:700">⚖️ Side-by-Side Comparison</div><div style="font-size:12px;color:var(--tx3)">Comparing ${props.length} properties</div></div>
    <button class="btn btn-out btn-sm" onclick="APP.compareList=[];saveCompareList();renderCompareView()">Clear Comparison</button>
  </div>`;

  html += `<div class="compare-table">`;

  // Header with photos
  html += `<div class="cmp-row cmp-header" style="grid-template-columns:160px ${colW}">
    <div class="cmp-label"></div>
    ${props.map(p => `<div class="cmp-cell cmp-prop-header">
      ${p.photo ? `<img src="${p.photo}" class="cmp-photo" loading="lazy"/>` : '<div class="cmp-photo-ph">🏠</div>'}
      <div class="cmp-addr">${p.address}</div>
      <div class="cmp-loc">${p.city}, ${p.state}</div>
      <button class="btn btn-ghost btn-sm" onclick="toggleCompare('${p.id}');renderCompareView()">✕ Remove</button>
    </div>`).join('')}
  </div>`;

  // Metric rows
  metrics.forEach(m => {
    const values = props.map(p => {
      if (m.fn) return { display: m.fn(p), val: m.val ? m.val(p) : 0 };
      const raw = p[m.key];
      return { display: m.fmt ? m.fmt(raw) : raw, val: raw || 0 };
    });

    // Find best
    let bestIdx = -1;
    if (m.better && values.some(v => v.val > 0)) {
      if (m.better === 'high') bestIdx = values.reduce((bi, v, i) => v.val > values[bi].val ? i : bi, 0);
      else bestIdx = values.reduce((bi, v, i) => v.val < values[bi].val && v.val > 0 ? i : bi, 0);
    }

    html += `<div class="cmp-row" style="grid-template-columns:160px ${colW}">
      <div class="cmp-label">${m.label}</div>
      ${values.map((v, i) => `<div class="cmp-cell ${i === bestIdx ? 'cmp-best' : ''}">${v.display}</div>`).join('')}
    </div>`;
  });

  html += '</div>';
  el.innerHTML = html;
}

// ── PORTFOLIO ROLLUP ──────────────────────────────────────────────────────────
function getPortfolioProps() {
  const allProps = getAllProps();
  return allProps.filter(p => {
    const stage = APP.pipeline?.[p.id]?.stage;
    return stage === 'under_contract' || stage === 'closed';
  });
}

function renderPortfolio() {
  const el = G('portfolioContent');
  if (!el) return;
  const props = getPortfolioProps();

  if (!props.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">💼</div><div class="empty-title">No Portfolio Properties</div><div class="empty-sub">Move deals to "Under Contract" or "Closed" in the pipeline to see them here.</div></div>`;
    return;
  }

  const totalValue = props.reduce((s, p) => s + (p.listPrice || 0), 0);
  const totalCash = props.reduce((s, p) => s + (p.analysis?.better?.totalCash || 0), 0);
  const totalMoCF = props.reduce((s, p) => s + (p.analysis?.better?.ncfMo || 0), 0);
  const totalAnnCF = totalMoCF * 12;
  const totalUnits = props.reduce((s, p) => s + (p.beds || 0), 0);
  const avgCoc = totalCash > 0 ? (totalAnnCF / totalCash) * 100 : 0;
  const closed = props.filter(p => APP.pipeline[p.id]?.stage === 'closed').length;
  const underContract = props.filter(p => APP.pipeline[p.id]?.stage === 'under_contract').length;

  let html = `<div style="margin-bottom:14px">
    <div style="font-size:18px;font-weight:700">💼 Portfolio Rollup</div>
    <div style="font-size:12px;color:var(--tx3)">${closed} closed, ${underContract} under contract</div>
  </div>`;

  html += `<div class="port-stats">
    <div class="port-stat"><div class="port-sv">${props.length}</div><div class="port-sk">Properties</div></div>
    <div class="port-stat"><div class="port-sv">${totalUnits}</div><div class="port-sk">Total Beds</div></div>
    <div class="port-stat"><div class="port-sv" style="color:var(--gold)">${fm(totalCash)}</div><div class="port-sk">Capital Deployed</div></div>
    <div class="port-stat"><div class="port-sv" style="color:var(--gr)">${fm(totalMoCF)}</div><div class="port-sk">Monthly CF</div></div>
    <div class="port-stat"><div class="port-sv" style="color:var(--gr)">${fm(totalAnnCF)}</div><div class="port-sk">Annual CF</div></div>
    <div class="port-stat"><div class="port-sv" style="color:${avgCoc >= 10 ? 'var(--gr)' : 'var(--am)'}">${fpc(avgCoc)}</div><div class="port-sk">Portfolio CoC</div></div>
    <div class="port-stat"><div class="port-sv">${fm(totalValue)}</div><div class="port-sk">Total Value</div></div>
  </div>`;

  // Table
  html += `<div style="overflow-x:auto;margin-top:14px"><table class="dq-table">
    <thead><tr><th>Property</th><th>Price</th><th>Beds</th><th>Revenue</th><th>CoC</th><th>Monthly CF</th><th>Cash In</th><th>Stage</th></tr></thead>
    <tbody>${props.map(p => {
      const t = p.analysis?.better;
      const stage = APP.pipeline[p.id]?.stage === 'closed' ? '<span class="tag gr">Closed</span>' : '<span class="tag am">Under Contract</span>';
      return `<tr>
        <td><div style="font-weight:500">${p.address}</div><div style="font-size:10px;color:var(--tx3)">${p.city}, ${p.state}</div></td>
        <td style="font-family:'DM Mono',monospace">${fm(p.listPrice)}</td>
        <td>${p.beds}</td>
        <td style="font-family:'DM Mono',monospace">${t ? fm(t.revenue) : '--'}</td>
        <td style="font-weight:600;color:${(t?.coc || 0) >= 10 ? 'var(--gr)' : 'var(--am)'}">${t ? fpc(t.coc) : '--'}</td>
        <td style="font-family:'DM Mono',monospace;color:${(t?.ncfMo || 0) >= 0 ? 'var(--gr)' : 'var(--rd)'}">${t ? fm(t.ncfMo) : '--'}</td>
        <td style="font-family:'DM Mono',monospace">${t ? fm(t.totalCash) : '--'}</td>
        <td>${stage}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;

  el.innerHTML = html;
}

// ── OFFER SUMMARY ─────────────────────────────────────────────────────────────
function renderOfferSummary(propId) {
  const allProps = getAllProps();
  const prop = allProps.find(p => p.id === propId);
  if (!prop) return;
  const a = APP.analyses[propId];
  const B = a?.better;
  const defaultPrice = a?.classification?.viablePrice || prop.listPrice;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'offerModal';
  modal.onclick = function(e) { if (e.target === this) this.remove(); };

  modal.innerHTML = `<div class="modal" style="max-width:700px">
    <button class="modal-close" onclick="document.getElementById('offerModal').remove()">&times;</button>
    <div id="offerSummaryContent" class="offer-summary">
      <div class="os-header">
        <img src="https://bnbaccelerator.com/wp-content/uploads/2025/03/BNB_Accelerator_logo-150x77.png" style="height:32px;margin-bottom:8px" onerror="this.style.display='none'"/>
        <div style="font-size:18px;font-weight:700">Deal Summary</div>
        <div style="font-size:11px;color:var(--tx3)">Generated ${new Date().toLocaleDateString()}</div>
      </div>
      <div class="os-section">
        <div class="os-section-title">Property Details</div>
        <div class="os-grid">
          <div><span class="os-k">Address</span><span class="os-v">${prop.address}, ${prop.city}, ${prop.state} ${prop.zip}</span></div>
          <div><span class="os-k">Beds / Baths</span><span class="os-v">${prop.beds}bd / ${prop.baths}ba</span></div>
          <div><span class="os-k">Sqft</span><span class="os-v">${prop.sqft?.toLocaleString() || '--'}</span></div>
          <div><span class="os-k">Year Built</span><span class="os-v">${prop.yearBuilt || '--'}</span></div>
          <div><span class="os-k">List Price</span><span class="os-v">${fm(prop.listPrice)}</span></div>
          <div><span class="os-k">Days on Market</span><span class="os-v">${prop.dom || 0}</span></div>
        </div>
      </div>
      ${B ? `<div class="os-section">
        <div class="os-section-title">Proforma Highlights</div>
        <div class="os-grid">
          <div><span class="os-k">Annual Revenue</span><span class="os-v">${fm(B.revenue)}</span></div>
          <div><span class="os-k">Occupancy</span><span class="os-v">${fp(B.occ)}</span></div>
          <div><span class="os-k">ADR</span><span class="os-v">${fm(B.adr)}</span></div>
          <div><span class="os-k">Cash on Cash</span><span class="os-v" style="color:var(--gr)">${fpc(B.coc)}</span></div>
          <div><span class="os-k">Monthly Cash Flow</span><span class="os-v">${fm(B.ncfMo)}</span></div>
          <div><span class="os-k">Annual Cash Flow</span><span class="os-v">${fm(B.ncfYr)}</span></div>
          <div><span class="os-k">Total Cash Needed</span><span class="os-v">${fm(B.totalCash)}</span></div>
          <div><span class="os-k">Year 1 ROI</span><span class="os-v" style="color:var(--gold)">${fpc(B.roi)}</span></div>
        </div>
      </div>` : ''}
      <div class="os-section">
        <div class="os-section-title">Proposed Offer</div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
          <span>Offer Price: $</span>
          <input type="number" id="offerPriceInput" class="fi" style="width:140px;font-weight:700" value="${defaultPrice}" oninput="updateOfferPreview()"/>
          <span id="offerDiscount" style="font-size:11px;color:var(--am)">${defaultPrice < prop.listPrice ? fpc(((prop.listPrice - defaultPrice) / prop.listPrice) * 100) + ' below ask' : 'At ask'}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-gold" onclick="window.print()">Export PDF</button>
      <button class="btn btn-out" onclick="copyOfferSummary('${propId}')">Copy as Text</button>
      <button class="btn btn-ghost" onclick="document.getElementById('offerModal').remove()">Close</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

function updateOfferPreview() {
  // Simple update of discount display
  const input = G('offerPriceInput');
  const disc = G('offerDiscount');
  if (!input || !disc) return;
  const propId = APP.activePropId;
  const allProps = getAllProps();
  const prop = allProps.find(p => p.id === propId);
  if (!prop) return;
  const offer = parseInt(input.value) || 0;
  if (offer < prop.listPrice) {
    disc.textContent = fpc(((prop.listPrice - offer) / prop.listPrice) * 100) + ' below ask';
  } else {
    disc.textContent = 'At or above ask';
  }
}

function copyOfferSummary(propId) {
  const allProps = getAllProps();
  const prop = allProps.find(p => p.id === propId);
  if (!prop) return;
  const a = APP.analyses[propId];
  const B = a?.better;
  const offerPrice = parseInt(G('offerPriceInput')?.value) || prop.listPrice;
  let text = `DEAL SUMMARY - BNB Accelerator\n${'='.repeat(40)}\n`;
  text += `Property: ${prop.address}, ${prop.city}, ${prop.state} ${prop.zip}\n`;
  text += `${prop.beds}bd / ${prop.baths}ba / ${prop.sqft || '?'} sqft\n`;
  text += `List Price: ${fm(prop.listPrice)}\n`;
  text += `Proposed Offer: ${fm(offerPrice)}\n`;
  if (B) {
    text += `\nPROFORMA:\n`;
    text += `Revenue: ${fm(B.revenue)}/yr | ADR: ${fm(B.adr)} | Occ: ${fp(B.occ)}\n`;
    text += `Cash on Cash: ${fpc(B.coc)} | Monthly CF: ${fm(B.ncfMo)} | Annual CF: ${fm(B.ncfYr)}\n`;
    text += `Total Cash: ${fm(B.totalCash)} | Year 1 ROI: ${fpc(B.roi)}\n`;
  }
  navigator.clipboard.writeText(text).then(() => { alert('Summary copied!'); });
}
