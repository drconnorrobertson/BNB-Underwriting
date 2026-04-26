'use strict';

// ── NAV (see expanded showView at bottom of file) ────────────────────────────

// ── ALL PROPERTIES (enriched with prelim + analysis data) ──────────────────────
function getAllProps() {
  const all = Object.values(APP.props).flat();
  const minBeds = APP.filterMinBeds||0;
  return all
    .filter(p=>p&&p.beds>=minBeds&&p.listPrice>=300000&&p.listPrice<=1000000)
    .map(p=>{
      const a=APP.analyses[p.id];
      const dq=APP.dqLog.find(d=>d.propId===p.id);
      const sl=APP.shortlist.includes(p.id);
      const isAirROI=p.prelim?.is_airroi;
      // Effective status
      let status = 'unscored';
      if (dq||p.dqd) status='dq';
      else if (a?.classification) status=a.classification.status;
      else if (p.prelim?.prelim_status==='prelim_good') status='good';
      else if (p.prelim?.prelim_status==='prelim_offer') status='needs-offer';
      else if (p.prelim?.prelim_status==='prelim_dq') status='dq';
      else if (p.prelim) status='prelim';
      const coc = a?.better?.coc ?? p.prelim?.prelim_coc ?? null;
      const rev = a?.better?.revenue ?? p.prelim?.prelim_revenue ?? null;
      const isPrelim = !a && p.prelim;
      return {...p, analysis:a||null, status, coc, rev, isPrelim, sl, isAirROI,
        prelim_score: coc!=null ? coc : -99};
    });
}

function sortProps(props) {
  const dir=APP.sortDir==='asc'?1:-1;
  const ord={good:0,'needs-offer':1,prelim:2,unscored:3,dq:4};
  return [...props].sort((a,b)=>{
    if(APP.sortKey==='status') return dir*((ord[a.status]||99)-(ord[b.status]||99));
    if(APP.sortKey==='coc')    return dir*((a.coc||0)-(b.coc||0));
    if(APP.sortKey==='rev')    return dir*((a.rev||0)-(b.rev||0));
    if(APP.sortKey==='price')  return dir*(a.listPrice-b.listPrice);
    if(APP.sortKey==='dom')    return dir*((a.dom||0)-(b.dom||0));
    if(APP.sortKey==='beds')   return dir*(a.beds-b.beds);
    // default: prelim_score desc
    return -(a.prelim_score-b.prelim_score);
  });
}

function filterProps(props) {
  let out=props;
  if(APP.filterStatus!=='all') out=out.filter(p=>p.status===APP.filterStatus);
  if(APP.filterSearchId) out=out.filter(p=>p.searchId===APP.filterSearchId);
  if(APP.filterSearch){const q=APP.filterSearch.toLowerCase();out=out.filter(p=>p.address?.toLowerCase().includes(q)||p.city?.toLowerCase().includes(q));}
  return out;
}

function updateNavCounts() {
  const all=getAllProps();
  const good=all.filter(p=>p.status==='good').length;
  const offer=all.filter(p=>p.status==='needs-offer').length;
  const dq=APP.dqLog.length;
  const sl=APP.shortlist.length;
  [['nc_good',good],['nc_offer',offer],['nc_dq',dq],['nc_sl',sl]].forEach(([id,v])=>{const e=G(id);if(e)e.textContent=v;});
  [['sTot',all.length],['sGood',good],['sOff',offer],['sDq',dq],['sPend',all.filter(p=>p.status==='unscored'||p.status==='prelim').length]].forEach(([id,v])=>{const e=G(id);if(e)e.textContent=v;});
}

function renderPropGrid() {
  const all=getAllProps(), sorted=sortProps(all), filtered=filterProps(sorted);
  const container=G('propGrid'); if(!container) return;
  updateNavCounts();
  if(!filtered.length){
    container.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🏠</div><div class="empty-title">${all.length?'No properties match filters':'No properties loaded'}</div><div class="empty-sub" style="margin-bottom:16px">${all.length?'Try adjusting your filters':'Click ↻ Refresh to pull real listings from Realtor.com'}</div>${!all.length?'<button class="btn btn-gold btn-lg" onclick="loadAllSearches()">↻ Load Real Properties</button>':''}</div>`;
    return;
  }
  container.innerHTML=filtered.map(p=>propCardHTML(p)).join('');
}

function renderSubGrid(status) {
  const props=sortProps(getAllProps().filter(p=>p.status===status));
  const el=G(status==='good'?'goodGrid':'offerGrid'); if(!el) return;
  const label=status==='good'?'Good Deals':'Custom Offer Deals';
  if(!props.length){el.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-icon">${status==='good'?'✓':'⚡'}</div><div class="empty-title">No ${label} yet</div><div class="empty-sub">Preliminary screening runs automatically on load. AirROI confirms.</div></div>`;return;}
  el.innerHTML=props.map(p=>propCardHTML(p)).join('');
}

// ── PROPERTY CARD ──────────────────────────────────────────────────────────────
function propCardHTML(p) {
  const a=p.analysis, pr=p.prelim;
  const statusMap={
    good:{cls:'chip-good',label:'✓ Good Deal'},
    'needs-offer':{cls:'chip-offer',label:'⚡ Needs Offer'},
    prelim:{cls:'chip-prelim',label:'◎ Prelim Good'},
    dq:{cls:'chip-dq',label:'✗ DQ\'d'},
    unscored:{cls:'chip-unscored',label:'Not Screened'},
    reject:{cls:'chip-dq',label:'✗ Doesn\'t Pencil'},
  };
  const sm=statusMap[p.status]||statusMap.unscored;
  const isGoodOrOffer=p.status==='good'||p.status==='needs-offer'||p.status==='prelim';
  const hasAirROI=!!a;
  const cocColor=p.coc==null?'var(--tx4)':p.coc>=COC_GOOD?'var(--gr)':p.coc>=COC_OFFER?'var(--am)':'var(--rd)';
  const cocLabel=p.isPrelim&&!hasAirROI?`~${fpc(p.coc)} est.`:fpc(p.coc);
  const revLabel=p.isPrelim&&!hasAirROI?`~${fmK(p.rev)}/yr est.`:fmK(p.rev);
  const offerPrice=a?.classification?.viablePrice;

  return `<div class="pcard ${p.status}" onclick="openPropPanel('${p.id}')">
    ${p.photo
      ? `<img class="pcard-img" src="${p.photo}" loading="lazy" onerror="this.outerHTML='<div class=pcard-img-ph>🏠</div>'"/>`
      : `<div class="pcard-img-ph">🏠</div>`}
    <div class="pcard-body">
      <div class="pcard-head">
        <div>
          <div class="pcard-addr">${p.address}${p.sl?` <span class="tag gr" style="font-size:7px;vertical-align:middle">★</span>`:''}</div>
          <div class="pcard-loc">${p.city}, ${p.state} ${p.zip}${p.priceReduced?` <span style="color:var(--rd);font-size:9px">▼ Reduced</span>`:''}</div>
        </div>
        <span class="status-chip ${sm.cls}">${sm.label}</span>
      </div>
      <div class="pcard-spec">${p.beds}bd · ${p.baths}ba · ${p.sqft?.toLocaleString()||'?'} sqft · ${p.yearBuilt||'?'} built · ${p.dom||0}d on market${p.hoa?` · HOA $${p.hoa}/mo`:''}</div>
      <div class="pcard-metrics">
        <div><div class="pm-v">${fm(p.listPrice)}</div><div class="pm-k">List Price</div></div>
        <div><div class="pm-v" style="color:${cocColor};font-size:${p.coc==null?'14px':'14px'}">${p.coc!=null?cocLabel:'--'}</div><div class="pm-k">CoC${p.isPrelim&&!hasAirROI?' (est.)':''}</div></div>
        <div><div class="pm-v" style="color:${p.rev?'var(--gr)':'var(--tx4)'}">${p.rev?revLabel:'--'}</div><div class="pm-k">Rev/yr${p.isPrelim&&!hasAirROI?' (est.)':''}</div></div>
      </div>
    </div>
    <div class="pcard-footer" onclick="event.stopPropagation()">
      <button class="btn btn-dark btn-sm" onclick="event.stopPropagation();openPropPanel('${p.id}');setTimeout(()=>buildProforma('${p.id}'),50)">
        ${hasAirROI?'↻ Re-run AirROI':'📊 Build Proforma'}
      </button>
      ${isGoodOrOffer&&!p.dqd?`<button class="btn btn-out btn-sm" onclick="event.stopPropagation();toggleShortlist('${p.id}');">${p.sl?'★ Listed':'☆ Shortlist'}</button>`:''}
      ${p.listingUrl?`<a href="${p.listingUrl}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" onclick="event.stopPropagation()">Listing ↗</a>`:''}
      ${!p.dqd?`<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();dqProp('${p.id}')">DQ</button>`:`<span class="tag rd">DQ'd</span>`}
    </div>
  </div>`;
}

function toggleShortlist(id) {
  const i=APP.shortlist.indexOf(id);
  if(i>=0) APP.shortlist.splice(i,1); else APP.shortlist.push(id);
  save(); renderPropGrid(); updateNavCounts();
}

// ── PROPERTY DETAIL PANEL ──────────────────────────────────────────────────────
function openPropPanel(propId) {
  const prop=getAllProps().find(p=>p.id===propId); if(!prop) return;
  APP.activePropId=propId;
  const search=APP.searches.find(s=>s.id===prop.searchId);
  const a=prop.analysis;
  const comply=getCompliance(prop.state);

  G('panelAddr').textContent=prop.address;
  G('panelSub').textContent=`${prop.city}, ${prop.state} ${prop.zip} · ${prop.beds}bd/${prop.baths}ba · ${prop.sqft?.toLocaleString()||'?'} sqft · ${prop.yearBuilt||'?'} built · ${prop.dom||0}d on market${prop.hoa?` · HOA $${prop.hoa}/mo`:''}`;

  const body=G('panelBody'); if(!body) return;

  // Build the full panel content
  let html = '';

  // ── STATUS BANNER ──
  if (a?.classification) {
    const cls=a.classification;
    const isGood=cls.status==='good';
    const isOffer=cls.status==='needs-offer';
    html+=`<div class="prelim-banner ${isGood?'good':isOffer?'offer':'dq'}" style="margin:16px 20px">
      <div class="pb-icon">${isGood?'✓':isOffer?'⚡':'✗'}</div>
      <div><div class="pb-title">${cls.label} <span class="tag" style="font-size:9px">AirROI Verified</span></div>
      <div class="pb-body">${isGood?`${fpc(a.better?.coc)} Cash on Cash with recommended amenity stack. Enhancement: ${fm(a.better?.amenCost)}. Total cash needed: ${fm(a.better?.totalCash)}.`:isOffer?`Offer ${fm(cls.viablePrice)} (${fpc(cls.discountNeeded)} below ask of ${fm(prop.listPrice)}) to reach ${COC_OFFER}%+ CoC. Enhancement budget: ${fm(a.better?.amenCost)}.`:`Doesn't pencil at any offer above 70% of ask. Consider DQ'ing and sending creative offer memo.`}</div>
      </div></div>`;
  } else if (prop.prelim) {
    const ps=prop.prelim.prelim_status;
    const isGood=ps==='prelim_good';
    const isOffer=ps==='prelim_offer';
    html+=`<div class="prelim-banner ${isGood?'good':isOffer?'offer':'unknown'}" style="margin:16px 20px">
      <div class="pb-icon">${isGood?'◎':isOffer?'◑':'◯'}</div>
      <div><div class="pb-title">${isGood?'Preliminary: Looks Good':'Preliminary: Needs Review'} <span class="tag bl">Claude Estimate</span></div>
      <div class="pb-body">${isGood?`Estimated ${fpc(prop.prelim.prelim_coc)} CoC based on market benchmarks. Click <strong>Build Proforma</strong> to run AirROI for confirmed numbers.`:isOffer?`Estimated ${fpc(prop.prelim.prelim_coc)} CoC — borderline. May work with discount or amenities. Click <strong>Build Proforma</strong> to confirm.`:`Estimated ${fpc(prop.prelim.prelim_coc)} CoC — likely doesn't pencil at current price. Build proforma to confirm or find the right offer price.`}</div>
      </div></div>`;
  } else {
    html+=`<div class="prelim-banner unknown" style="margin:16px 20px"><div class="pb-icon">◯</div><div><div class="pb-title">Not Screened</div><div class="pb-body">Click <strong>Build Proforma</strong> to run full AirROI analysis.</div></div></div>`;
  }

  // ── BUILD PROFORMA BUTTON (always visible, top of panel) ──
  html+=`<div style="display:flex;gap:8px;padding:0 20px 14px;flex-wrap:wrap">
    <button class="btn btn-dark btn-lg" onclick="buildProforma('${propId}')">${a?'↻ Re-run AirROI Analysis':'📊 Build Proforma (3 AirROI calls)'}</button>
    ${prop.listingUrl?`<a href="${prop.listingUrl}" target="_blank" rel="noopener" class="btn btn-out">View Listing ↗</a>`:''}
    ${prop.dqd?'<span class="tag rd" style="align-self:center">DQ\'d</span>':`<button class="btn btn-rd" onclick="dqProp('${propId}')">DQ + Send Memo</button>`}
    ${APP.shortlist.includes(propId)?`<button class="btn btn-out" onclick="toggleShortlist('${propId}');openPropPanel('${propId}')">★ Remove Shortlist</button>`:`<button class="btn btn-out" onclick="toggleShortlist('${propId}');openPropPanel('${propId}')">☆ Add to Shortlist</button>`}
    <button class="btn btn-ghost" onclick="window.print()">Print</button>
    <button class="btn btn-out" onclick="shareDeal('${propId}')">🔗 Share Deal</button>
  </div>`;

  if (a) {
    // ── FULL AIRROI PROFORMA ──
    const {good:G_t,better:B_t,best:X_t,classification:cls} = a;
    
    // All-in budget bar
    const allIn=B_t.totalCash; const pct=Math.min(100,(allIn/MAX_ALL_IN)*100);
    const bc=allIn>MAX_ALL_IN?'var(--rd)':allIn>MAX_ALL_IN*.85?'var(--am)':'var(--gr)';
    html+=`<div style="margin:0 20px 14px;padding:12px 14px;background:var(--w);border:1px solid var(--bd);border-radius:var(--r2)">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:11px;font-weight:600">All-In Budget (Better)</span><span style="font-size:15px;font-weight:700;color:${bc}">${fm(allIn)} <span style="font-size:10px;font-weight:400;color:var(--tx3)">of $200K cap</span></span></div>
      <div style="height:6px;background:var(--bd);border-radius:4px;overflow:hidden"><div style="height:100%;border-radius:4px;width:${pct}%;background:${bc}"></div></div>
      <div style="font-size:10px;color:var(--tx3);margin-top:4px">Down ${fm(B_t.down)} + Closing ${fm(B_t.cc)} + Amenities ${fm(B_t.amenCost)} = ${fm(allIn)} ${allIn<=MAX_ALL_IN?'✓ Within budget':'⚠ Over $200K'}</div>
    </div>`;

    html+=renderScenarios(G_t,B_t,X_t);
    html+=renderPFTableFull(prop,G_t,B_t,X_t);
    html+=renderSeasonalityHTML(B_t,prop);
    html+=renderCompsHTML(B_t.comps,B_t.adr,B_t.occ,B_t.p75Adr,B_t.p75Rev);
    html+=renderOptimizerHTML(prop,B_t,search);
    html+=renderExitHTML(prop.listPrice,search?.tags,B_t);
    html+=renderDepHTML(prop.listPrice,prop.state);
  } else {
    // ── PRELIM PROFORMA (before AirROI) ──
    const pr=prop.prelim;
    if(pr?.prelim_tier) {
      html+=renderPFTablePrelim(prop, pr.prelim_tier, search);
    }
    html+=`<div style="margin:0 20px 14px;padding:16px;background:var(--blbg);border:1px solid var(--bllt);border-radius:var(--r2)">
      <div style="font-size:12px;font-weight:600;color:var(--bl);margin-bottom:6px">📊 Preliminary Estimate — Claude Market Benchmarks</div>
      <div style="font-size:11px;color:var(--tx3);line-height:1.6">Revenue estimates based on market benchmarks for ${prop.state} STR markets (${(search?.tags||[]).slice(0,2).join(', ')} area). Click <strong>Build Proforma</strong> above to run 3 AirROI API calls and get confirmed revenue projections, real comparables, and final CoC numbers.</div>
    </div>`;
  }

  html+=renderComplianceHTML(comply,prop);
  html+=renderAmenPanelHTML(search?.tags);
  
  body.innerHTML=html;
  initAmen(search?.tags);
  renderAllA();
  G('panelOverlay')?.classList.add('open');
}

function closePanel() { G('panelOverlay')?.classList.remove('open'); }

// ── SCENARIO CARDS ──────────────────────────────────────────────────────────────
function renderScenarios(G_t,B_t,X_t) {
  const sc=(t,cls,lbl)=>{
    const amenList = t.amenityList ? t.amenityList.filter((v,i,a)=>a.indexOf(v)===i).slice(0, 8) : [];
    const amenHtml = amenList.length ? '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)"><div style="font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--tx3);margin-bottom:4px">Included Amenities</div>' + amenList.map(a => '<div style="font-size:10px;color:var(--tx2);padding:1px 0">• ' + a + '</div>').join('') + (t.amenityList && t.amenityList.length > 8 ? '<div style="font-size:9px;color:var(--tx3)">+' + (t.amenityList.length - 8) + ' more</div>' : '') + '</div>' : '';
    return `<div class="sc-card ${cls}">
    <div class="sc-tier">${lbl}</div>
    <div class="sc-rev">${fm(t.revenue)}</div><div class="sc-sub">Annual Revenue · p75: ${fmK(t.p75Rev)}</div>
    <div class="sc-rows">
      <div class="sc-r"><span class="sc-k">Occupancy</span><span class="sc-v">${fp(t.occ)}</span></div>
      <div class="sc-r"><span class="sc-k">ADR</span><span class="sc-v">${fm(t.adr)}</span></div>
      <div class="sc-r"><span class="sc-k">Monthly Income</span><span class="sc-v">${fm(t.gmiMo)}</span></div>
      <div class="sc-r"><span class="sc-k">Monthly Expenses</span><span class="sc-v neg">${fm(t.totExpMo)}</span></div>
      <div class="sc-r"><span class="sc-k">Net CF/yr</span><span class="sc-v ${t.ncfYr>=0?'pos':'neg'}">${fm(t.ncfYr)}</span></div>
      <div class="sc-r"><span class="sc-k">Cash on Cash</span><span class="sc-v ${t.coc>=COC_GOOD?'pos':t.coc>=COC_OFFER?'gold':'neg'}">${fpc(t.coc)}</span></div>
      <div class="sc-r"><span class="sc-k">Enhancement Cost</span><span class="sc-v gold">${fm(t.amenCost)}</span></div>
      <div class="sc-r"><span class="sc-k">Total Cash In</span><span class="sc-v blue">${fm(t.totalCash)}</span></div>
    </div>
    ${amenHtml}
  </div>`;
  };
  const noSpreadNote = G_t.noSpread ? '<div style="background:#fff3cd;padding:10px 16px;border-radius:6px;margin:12px 20px 0;font-size:12px;color:#856404;border:1px solid #ffc107;text-align:center"><strong>Note:</strong> AirROI data shows additional amenity improvements do not significantly increase projected income in this market. Focus on deal price and basic setup quality rather than heavy improvement budgets.</div>' : '';
  return `<div class="sc-row">${sc(G_t,'gc','Good — Essentials')}${sc(B_t,'bc','Better — Rec. Stack')}${sc(X_t,'xc','Best — Full Stack')}</div>${noSpreadNote}`;
}

// ── PROFORMA TABLE (matches Excel template) ────────────────────────────────────
function pfRow(cls,lbl,gv,bv,xv,hint='') {
  return `<div class="pf-row ${cls}"><div class="pf-l">${lbl}${hint?`<span class="pf-hint"> — ${hint}</span>`:''}</div><div class="cv g">${gv}</div><div class="cv b">${bv}</div><div class="cv x">${xv}</div></div>`;
}
function pfSec(t) { return `<div class="pf-section-title">${t}</div>`; }

function renderPFTableFull(prop,G_t,B_t,X_t) {
  return `<div class="pf-section">
    <div class="pf-cols-head"><div></div><div class="pf-col-h cg">GOOD</div><div class="pf-col-h cb">BETTER</div><div class="pf-col-h cx">BEST</div></div>
    ${pfSec('PROPERTY / DEAL DETAILS')}
    ${pfRow('pf-row','Property Address',prop.address,prop.address,prop.address)}
    ${pfRow('pf-row','Purchase Price',fm(prop.listPrice),fm(prop.listPrice),fm(prop.listPrice))}
    ${pfRow('pf-row','Beds / Baths / Sqft',`${prop.beds}bd/${prop.baths}ba`,`${prop.beds}bd/${prop.baths}ba`,`${prop.beds}bd/${prop.baths}ba`)}
    ${pfSec('CASH NEEDED')}
    ${pfRow('pf-row','Purchase Price',fm(prop.listPrice),fm(prop.listPrice),fm(prop.listPrice))}
    ${pfRow('pf-row','Down Payment (10%)',fm(G_t.down),fm(B_t.down),fm(X_t.down))}
    ${pfRow('pf-row','Mortgage Amount (90%)',fm(G_t.mort),fm(B_t.mort),fm(X_t.mort))}
    ${pfRow('pf-row','Closing Costs (3%)',fm(G_t.cc),fm(B_t.cc),fm(X_t.cc))}
    ${pfRow('pf-row','Seller Credits','$0','$0','$0')}
    ${pfRow('pf-row','Enhancement Budget',fm(0),fm(B_t.amenCost),fm(X_t.amenCost))}
    ${pfRow('pf-row sub','Total Cash to Close',fm(G_t.totalCash),fm(B_t.totalCash),fm(X_t.totalCash))}
    ${pfSec('MONTHLY INCOME PROJECTIONS')}
    ${pfRow('pf-row','Avg Nightly Rate (ADR)',fm(G_t.adr),fm(B_t.adr),fm(X_t.adr),'from AirROI')}
    ${pfRow('pf-row','Avg Occupancy',fp(G_t.occ),fp(B_t.occ),fp(X_t.occ))}
    ${pfRow('pf-row','Gross Booking Revenue / mo',fm(G_t.gbrMo),fm(B_t.gbrMo),fm(X_t.gbrMo))}
    ${pfRow('pf-row','Cleaning Revenue / mo (avg 6 turns)','$1,500','$1,500','$1,500')}
    ${pfRow('pf-row sub','Gross Monthly Income',fm(G_t.gmiMo),fm(B_t.gmiMo),fm(X_t.gmiMo))}
    ${pfRow('pf-row sub','Gross Annual Revenue',fm(G_t.garYr),fm(B_t.garYr),fm(X_t.garYr))}
    ${pfSec('FIXED MONTHLY EXPENSES (do not scale with occupancy)')}
    ${pfRow('pf-row','Principal + Interest (6%, 30yr)',fm(G_t.pi),fm(B_t.pi),fm(X_t.pi))}
    ${pfRow('pf-row','Property Taxes',fm(G_t.taxMo),fm(B_t.taxMo),fm(X_t.taxMo),'state-adjusted')}
    ${pfRow('pf-row','STR Insurance Policy',fm(G_t.insMo),fm(B_t.insMo),fm(X_t.insMo),'1.6× homeowner rate')}
    ${pfRow('pf-row','PMI (10% down, 0.6%/yr)',fm(G_t.pmi),fm(B_t.pmi),fm(X_t.pmi))}
    ${pfRow('pf-row','HOA',fm(G_t.fixed?.hoa||0),fm(B_t.fixed?.hoa||0),fm(X_t.fixed?.hoa||0))}
    ${pfRow('pf-row','Water / Sewer','$80','$80','$80')}
    ${pfRow('pf-row','Internet + Smart Home','$80','$80','$80')}
    ${pfRow('pf-row','Lawn Care + Pest','$140','$140','$140')}
    ${pfRow('pf-row','Pool / Hot Tub Maintenance',G_t.poolMaint?fm(G_t.poolMaint):'—',B_t.poolMaint?fm(B_t.poolMaint):'—',X_t.poolMaint?fm(X_t.poolMaint):'—')}
    ${pfRow('pf-row sub','Total Fixed / mo',fm(G_t.fixedTotal),fm(B_t.fixedTotal),fm(X_t.fixedTotal))}
    ${pfSec('VARIABLE MONTHLY EXPENSES (scale with bookings)')}
    ${pfRow('pf-row vbl','Repairs + CapEx (8% of GBR)',fm(G_t.variable?.repairs),fm(B_t.variable?.repairs),fm(X_t.variable?.repairs))}
    ${pfRow('pf-row vbl','Co-Hosting Fee (20%)',fm(G_t.variable?.hosting),fm(B_t.variable?.hosting),fm(X_t.variable?.hosting))}
    ${pfRow('pf-row vbl','Platform Fee — Airbnb (3%)',fm(G_t.variable?.platform),fm(B_t.variable?.platform),fm(X_t.variable?.platform))}
    ${pfRow('pf-row vbl','Professional Cleaning (6 turns)',fm(G_t.variable?.cleaning),fm(B_t.variable?.cleaning),fm(X_t.variable?.cleaning))}
    ${pfRow('pf-row vbl','Gas + Electric',fm(G_t.gasElec),fm(B_t.gasElec),fm(X_t.gasElec))}
    ${pfRow('pf-row sub','Total Variable / mo',fm(G_t.variableTotal),fm(B_t.variableTotal),fm(X_t.variableTotal))}
    ${pfRow('pf-row sub','Total Monthly Expenses',fm(G_t.totExpMo),fm(B_t.totExpMo),fm(X_t.totExpMo))}
    ${pfSec('CASHFLOW, TAX SAVINGS AND RETURNS')}
    ${pfRow('pf-row hl','Net Monthly Cash Flow',fm(G_t.ncfMo),fm(B_t.ncfMo),fm(X_t.ncfMo))}
    ${pfRow('pf-row hl','Net Annual Cash Flow',fm(G_t.ncfYr),fm(B_t.ncfYr),fm(X_t.ncfYr))}
    ${pfRow('pf-row hl','Cash on Cash Return (CoC)',fpc(G_t.coc),fpc(B_t.coc),fpc(X_t.coc))}
    ${pfRow('pf-row','Bonus Depreciation Deduction',fm(G_t.bonusDep),fm(B_t.bonusDep),fm(X_t.bonusDep),'30% of basis')}
    ${pfRow('pf-row','Year 1 Tax Savings (37% bracket)',fm(G_t.taxSav),fm(B_t.taxSav),fm(X_t.taxSav))}
    ${pfRow('pf-row grand','Year 1 Total Return (CF + Tax)',fm(G_t.yr1),fm(B_t.yr1),fm(X_t.yr1))}
    ${pfRow('pf-row','Year 1 ROI on Total Cash',fpc(G_t.roi),fpc(B_t.roi),fpc(X_t.roi))}
  </div>`;
}

function renderPFTablePrelim(prop, tier, search) {
  // Shows preliminary proforma with estimated numbers
  const lbl='<span style="color:var(--bl);font-size:9px"> (est.)</span>';
  return `<div class="pf-section">
    <div class="pf-section-title">📊 PRELIMINARY PROFORMA ${lbl} — Based on Market Benchmarks</div>
    <div class="pf-cols-head"><div></div><div class="pf-col-h cb" style="grid-column:2/5">ESTIMATE (click Build Proforma for confirmed AirROI numbers)</div></div>
    ${pfSec('DEAL SNAPSHOT')}
    ${pfRow('pf-row','Purchase Price',fm(prop.listPrice),'—','—')}
    ${pfRow('pf-row','Down Payment (10%)',fm(tier.down),'—','—')}
    ${pfRow('pf-row','Enhancement Budget (est.)',fm(tier.amenCost||12000),'—','—')}
    ${pfRow('pf-row sub','Total Cash to Close (est.)',fm(tier.totalCash),'—','—')}
    ${pfSec('ESTIMATED MONTHLY INCOME')}
    ${pfRow('pf-row','Estimated ADR',fm(tier.adr)+lbl,'—','—')}
    ${pfRow('pf-row','Estimated Occupancy',fp(tier.occ)+lbl,'—','—')}
    ${pfRow('pf-row sub','Estimated Monthly Income',fm(tier.gmiMo)+lbl,'—','—')}
    ${pfRow('pf-row sub','Estimated Annual Revenue',fm(tier.garYr)+lbl,'—','—')}
    ${pfSec('ESTIMATED MONTHLY EXPENSES')}
    ${pfRow('pf-row','Principal + Interest',fm(tier.pi),'—','—')}
    ${pfRow('pf-row','Property Taxes + Insurance + PMI',fm((tier.taxMo||0)+(tier.insMo||0)+(tier.pmi||0)),'—','—')}
    ${pfRow('pf-row','Fixed Other (water,internet,lawn)',fm(80+80+140),'—','—')}
    ${pfRow('pf-row vbl','Variable (co-host,repairs,cleaning,platform)',fm((tier.variableTotal||0)),'—','—')}
    ${pfRow('pf-row sub','Total Monthly Expenses',fm(tier.totExpMo),'—','—')}
    ${pfSec('ESTIMATED RETURNS')}
    ${pfRow('pf-row hl','Net Monthly Cash Flow',fm(tier.ncfMo)+lbl,'—','—')}
    ${pfRow('pf-row hl','Net Annual Cash Flow',fm(tier.ncfYr)+lbl,'—','—')}
    ${pfRow('pf-row hl','Cash on Cash (est.)',fpc(tier.coc)+lbl,'—','—')}
    ${pfRow('pf-row grand','Year 1 Est. Return (CF + Tax Savings)',fm(tier.yr1)+lbl,'—','—')}
    <div class="pf-row" style="padding:10px 20px"><div style="grid-column:1/-1;font-size:10px;color:var(--bl)">⚠ These are <strong>preliminary estimates</strong> only, based on ${prop.state} market benchmarks. Click <strong>Build Proforma</strong> above to run confirmed AirROI analysis with real comparable Airbnb data.</div></div>
  </div>`;
}

// ── SEASONALITY CHART ──────────────────────────────────────────────────────────
function renderSeasonalityHTML(B,prop) {
  const monthly=B.monthly||[]; if(!monthly.length) return '';
  const data=monthly.map((pct,i)=>{
    const gbrMo=B.revenue*pct, moVar=gbrMo*(.08+.20+.03)+B.variable?.cleaning+B.gasElec;
    const ncf=(gbrMo+B.cleanRev)-(B.fixedTotal+(moVar||0));
    return {m:MONTHS[i],rev:Math.round(gbrMo),ncf:Math.round(ncf)};
  });
  const maxA=Math.max(...data.map(d=>Math.max(d.rev,Math.abs(d.ncf))),1);
  const profMos=data.filter(d=>d.ncf>0).length;
  const totP=data.filter(d=>d.ncf>0).reduce((s,d)=>s+d.ncf,0);
  const totL=data.filter(d=>d.ncf<0).reduce((s,d)=>s+d.ncf,0);

  const bars=data.map(d=>{
    const rH=Math.round(d.rev/maxA*80); const nH=Math.round(Math.abs(d.ncf)/maxA*80);
    return `<div class="season-col">
      <div class="season-bar-wrap">
        <div class="season-bar" style="height:${rH}px;background:var(--bllt)"></div>
        <div class="season-bar" style="height:${nH}px;background:${d.ncf>=0?'var(--gr)':'var(--rd)'};margin-top:1px"></div>
      </div>
      <div class="season-label">${d.m}</div>
    </div>`;
  }).join('');

  return `<div class="pf-section">
    <div class="pf-section-title">📅 SEASONALITY — Monthly Revenue + Cash Flow</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 20px;border-bottom:1px solid var(--bd)">
      <div style="text-align:center;padding:8px;background:var(--grbg);border-radius:6px"><div style="font-size:18px;font-weight:700;color:var(--gr)">${profMos}</div><div style="font-size:9px;color:var(--tx3)">Profitable Months</div></div>
      <div style="text-align:center;padding:8px;background:var(--rdbg);border-radius:6px"><div style="font-size:18px;font-weight:700;color:var(--rd)">${12-profMos}</div><div style="font-size:9px;color:var(--tx3)">Cash Negative Months</div></div>
      <div style="text-align:center;padding:8px;background:var(--grbg);border-radius:6px"><div style="font-size:14px;font-weight:700;color:var(--gr)">${fm(totP)}</div><div style="font-size:9px;color:var(--tx3)">Total Profit Months</div></div>
      <div style="text-align:center;padding:8px;background:var(--rdbg);border-radius:6px"><div style="font-size:14px;font-weight:700;color:var(--rd)">${fm(totL)}</div><div style="font-size:9px;color:var(--tx3)">Total Loss Months</div></div>
    </div>
    <div style="padding:12px 20px;border-bottom:1px solid var(--bd)">
      <div class="season-grid">${bars}</div>
      <div style="display:flex;gap:14px;margin-top:8px;font-size:10px;color:var(--tx3)">
        <span><span style="display:inline-block;width:8px;height:8px;background:var(--bllt);border-radius:2px;margin-right:3px;vertical-align:middle"></span>Revenue</span>
        <span><span style="display:inline-block;width:8px;height:8px;background:var(--gr);border-radius:2px;margin-right:3px;vertical-align:middle"></span>Positive CF</span>
        <span><span style="display:inline-block;width:8px;height:8px;background:var(--rd);border-radius:2px;margin-right:3px;vertical-align:middle"></span>Negative CF</span>
      </div>
    </div>
  </div>`;
}

// ── COMPS ──────────────────────────────────────────────────────────────────────
function renderCompsHTML(comps,subAdr,subOcc,p75Adr,p75Rev) {
  if(!comps?.length) return `<div class="section-block"><div class="section-title">Comparables</div><div style="color:var(--tx4);font-size:11px">No comps returned — AirROI may not have data for this location</div></div>`;
  const scored=comps.map(c=>{
    const pm=c.performance_metrics||{};
    const ca=pm.ttm_avg_rate||0,co=pm.ttm_occupancy||0,cr=pm.ttm_revenue||0;
    const ms=Math.max(0,100-Math.abs(ca-(subAdr||0))/Math.max(subAdr||1,1)*40-Math.abs(co-(subOcc||.6))/Math.max(subOcc||.6,.01)*40);
    return {...c,_a:ca,_o:co,_r:cr,_s:ms+(p75Rev>0?(cr/p75Rev)*60:0)};
  }).sort((a,b)=>b._s-a._s).slice(0,7);
  return `<div class="pf-section">
    <div class="pf-section-title">🏆 TOP COMPARABLES <span style="font-weight:400;text-transform:none;letter-spacing:0">— p75 ADR: ${fm(p75Adr)} · p75 Rev: ${fmK(p75Rev)}</span></div>
    <div style="padding:12px 20px">
      <div class="comp-list">${scored.map((c,i)=>{
        const pi=c.listing_info||{},pd=c.property_details||{};
        const cls=c._a>(subAdr||0)*1.05?'above':c._a<(subAdr||0)*0.95?'below':'at';
        const conf=c._s>=120?'HIGH':c._s>=80?'MED':'LOW';
        const cColor=c._s>=120?'var(--gr)':c._s>=80?'var(--am)':'var(--tx4)';
        const url=pi.listing_id?`https://www.airbnb.com/rooms/${pi.listing_id}`:'';
        const above75=c._r>(p75Rev||0);
        return `<div class="comp-item ${cls}">
          <div class="comp-rank" style="color:${above75?'var(--gr)':'var(--tx4)'}">#${i+1}</div>
          <div><div class="comp-name">${url?`<a href="${url}" target="_blank" rel="noopener">${pi.listing_name||'Listing'}</a>`:pi.listing_name||'Listing'} ${above75?'<span class="tag gr">p75+</span>':''}</div>
          <div class="comp-amens">${(pd.amenities||[]).slice(0,5).map(a=>`<span class="comp-amen">${a}</span>`).join('')}</div>
          <div style="font-size:9px;color:${cColor};margin-top:2px">${conf} MATCH · ${pd.bedrooms||'?'}bd/${pd.baths||'?'}ba · ${c._a>(subAdr||0)*1.05?'↑ Above ADR':c._a<(subAdr||0)*0.95?'↓ Below ADR':'≈ At ADR'}</div></div>
          <div><div class="comp-v">${fm(c._a)}</div><div class="comp-k">ADR</div></div>
          <div><div class="comp-v">${fp(c._o)}</div><div class="comp-k">Occ.</div></div>
          <div><div class="comp-v">${fmK(c._r)}</div><div class="comp-k">TTM Rev</div></div>
        </div>`;
      }).join('')}</div>
    </div>
  </div>`;
}

// ── OPTIMIZER ──────────────────────────────────────────────────────────────────
function renderOptimizerHTML(prop,B,search) {
  const pts=[1.0,.97,.95,.92,.90,.87,.85,.80];
  const rows=pts.map(pct=>{
    const price=Math.round(prop.listPrice*pct);
    const t=buildTier({revenue:B.revenue,occ:B.occ,adr:B.adr,monthly:B.monthly,comps:[],p75Rev:B.p75Rev,p90Rev:B.p90Rev,p75Adr:B.p75Adr},price,prop.state,prop.beds,B.amenCost);
    return {price,pct,coc:t.coc,ncfYr:t.ncfYr,cash:t.totalCash,viable:t.coc>=COC_GOOD,stretch:t.coc>=COC_OFFER&&t.coc<COC_GOOD};
  });
  return `<div class="pf-section">
    <div class="pf-section-title">⚡ DEAL OPTIMIZER — What offer price makes this work?</div>
    <div style="padding:0 20px">
      <table class="opt-table">
        <thead><tr><th>Offer Price</th><th>Discount</th><th>Cash In</th><th>CoC (Better)</th><th>Annual CF</th><th>Status</th></tr></thead>
        <tbody>${rows.map(r=>`<tr class="${r.pct===1?'ask':r.viable?'viable':r.stretch?'stretch':''}">
          <td style="font-weight:600">${fm(r.price)}${r.pct===1?' <span class="tag">Ask</span>':''}</td>
          <td>${r.pct<1?fpc((1-r.pct)*100)+' off':'—'}</td>
          <td style="font-family:'DM Mono',monospace">${fm(r.cash)}</td>
          <td style="font-weight:700;color:${r.viable?'var(--gr)':r.stretch?'var(--am)':'var(--rd)'}">${fpc(r.coc)}</td>
          <td style="color:${r.ncfYr>=0?'var(--gr)':'var(--rd)'};font-family:'DM Mono',monospace">${fm(r.ncfYr)}</td>
          <td><span class="tag ${r.viable?'gr':r.stretch?'am':'rd'}">${r.viable?'Viable':r.stretch?'Stretch':'No-Go'}</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

// ── EXIT ANALYSIS ──────────────────────────────────────────────────────────────
function renderExitHTML(price,tags,B) {
  const apr=aprT(tags||[]);
  const data=[3,5,7,10,15].map(yr=>{
    const fv=price*Math.pow(1+apr,yr);
    const r=RATE/100/12,n=TERM*12,e=yr*12;
    const pmt=calcPI(price*DOWN);
    const bal=e<n?pmt/r*(1-Math.pow(1+r,-(n-e))):0;
    const net=fv*.93-bal,cumCF=(B.ncfYr||0)*yr,total=net+cumCF;
    const irr=Math.pow(Math.max(.001,total/Math.max(1,B.totalCash||1)),1/yr)-1;
    return{yr,fv,net,cumCF,total,irr};
  });
  return `<div class="pf-section">
    <div class="pf-section-title">📈 EXIT ANALYSIS — ${fpc(apr*100)} appreciation · 7% cost of sale · Optimal hold: Yr 7-10</div>
    <div style="padding:12px 20px">
      <div class="exit-yrs">${data.map(d=>`<div class="exit-yr${d.yr===7?' active':''}">
        <div class="ey-label">Year ${d.yr}</div>
        <div class="ey-val">${fmK(d.fv)}</div>
        <div class="ey-net" style="color:${d.net>0?'var(--gr)':'var(--rd)'}">${fmK(d.net)} net</div>
        <div class="ey-net" style="color:var(--tx4)">${fpc(d.irr*100)} IRR</div>
      </div>`).join('')}</div>
    </div>
  </div>`;
}

// ── DEPRECIATION ───────────────────────────────────────────────────────────────
function renderDepHTML(price,state) {
  const lp=landP(state),land=price*lp,basis=price-land;
  const rows=[{n:'5-Year Personal Property',pct:.15,bonus:true},{n:'7-Year Fixtures',pct:.08,bonus:true},{n:'15-Year Land Improvements',pct:.07,bonus:true},{n:'27.5-Year Structure',pct:.70,bonus:false}];
  const comp=rows.map(r=>({...r,val:basis*r.pct,yr1:r.bonus?basis*r.pct:basis*r.pct/27.5}));
  const total=comp.reduce((s,r)=>s+r.yr1,0),ts=total*.37;
  return `<div class="pf-section">
    <div class="pf-section-title">💰 BONUS DEPRECIATION + COST SEGREGATION</div>
    <div style="padding:12px 20px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
        <div style="background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:10px"><div style="font-size:15px;font-weight:700">${fm(price)}</div><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em">Purchase Price</div></div>
        <div style="background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:10px"><div style="font-size:15px;font-weight:700;color:var(--rd)">${fm(land)}</div><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em">Land (${(lp*100).toFixed(0)}%)</div></div>
        <div style="background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:10px"><div style="font-size:15px;font-weight:700;color:var(--gold)">${fm(basis)}</div><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em">Depreciable Basis</div></div>
        <div style="background:var(--grbg);border:1px solid var(--grlt);border-radius:var(--r);padding:10px"><div style="font-size:15px;font-weight:700;color:var(--gr)">${fm(ts)}</div><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em">Yr1 Tax Savings (37%)</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr><th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--bd);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3)">Component</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid var(--bd);font-size:9px;font-weight:700;color:var(--tx3)">Value</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid var(--bd);font-size:9px;font-weight:700;color:var(--tx3)">Yr 1 Deduction</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid var(--bd);font-size:9px;font-weight:700;color:var(--tx3)">Method</th></tr></thead>
        <tbody>${comp.map(r=>`<tr><td style="padding:6px 8px;border-bottom:1px solid var(--bd)">${r.n}</td><td style="padding:6px 8px;border-bottom:1px solid var(--bd);text-align:right;font-family:'DM Mono',monospace">${fm(r.val)}</td><td style="padding:6px 8px;border-bottom:1px solid var(--bd);text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fm(r.yr1)}</td><td style="padding:6px 8px;border-bottom:1px solid var(--bd);text-align:right;font-size:9px;color:var(--tx3)">${r.bonus?'§168 Bonus':'§168(b)(3) SL'}</td></tr>`).join('')}
        <tr style="background:var(--ambg)"><td style="padding:7px 8px;font-weight:700" colspan="2">Total Year 1 Deduction</td><td style="padding:7px 8px;font-weight:700;text-align:right;font-family:'DM Mono',monospace;color:var(--gold)">${fm(total)}</td><td></td></tr></tbody>
      </table>
      <div style="margin-top:8px;font-size:10px;color:var(--tx3);padding:8px;background:var(--bg);border-radius:6px">Bonus dep phase-down: 40% (2025), 20% (2026) under TCJA. STR &lt;7 day avg stay = non-passive §469(c)(7). Full cost seg study recommended — contact AE Tax Advisors.</div>
    </div>
  </div>`;
}

// ── COMPLIANCE ─────────────────────────────────────────────────────────────────
function renderComplianceHTML(comply,prop) {
  const scMap={allowed:{cls:'allowed',icon:'✅',label:'STR Allowed'},restricted:{cls:'restricted',icon:'⚠️',label:'Restricted'},banned:{cls:'banned',icon:'🚫',label:'Banned'},unknown:{cls:'unknown',icon:'❓',label:'Unknown'}};
  const sc=scMap[comply.status]||scMap.unknown;
  return `<div class="pf-section">
    <div class="pf-section-title">🏛 STR COMPLIANCE — ${prop.city||''},  ${prop.state}</div>
    <div style="padding:12px 20px">
      <div class="comply-cards">
        <div class="comply-card ${sc.cls}"><div class="cc-icon">${sc.icon}</div><div class="cc-title">${sc.label}</div><div class="cc-detail">${comply.note}</div></div>
        <div class="comply-card ${comply.permit?'restricted':'allowed'}"><div class="cc-icon">${comply.permit?'📋':'✅'}</div><div class="cc-title">Permit: ${comply.permit?'Required':'Not Required'}</div><div class="cc-detail">Fee: ${comply.cost?'$'+comply.cost:'None'}${comply.nights?` · Min stay: ${comply.nights} nights`:''}</div></div>
        <div class="comply-card ${comply.hoa==='low'?'allowed':comply.hoa==='medium'?'restricted':'banned'}"><div class="cc-icon">${comply.hoa==='low'?'🟢':comply.hoa==='medium'?'🟡':'🔴'}</div><div class="cc-title">HOA Risk: ${(comply.hoa||'unknown').charAt(0).toUpperCase()+(comply.hoa||'').slice(1)}</div><div class="cc-detail">Always verify HOA CC&Rs. STR bans in HOA override municipal permits.</div></div>
        <div class="comply-card unknown"><div class="cc-icon">📋</div><div class="cc-title">Checklist</div><div class="cc-tags">${(comply.reqs||[]).map(r=>`<span class="cc-tag">${r}</span>`).join('')}</div></div>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--am);padding:8px 12px;background:var(--ambg);border:1px solid var(--amlt);border-radius:6px">⚠ Data as of 2026. Verify directly with city/county planning and request seller disclosure before purchase.</div>
    </div>
  </div>`;
}

// ── AMENITY PANEL ──────────────────────────────────────────────────────────────
function renderAmenPanelHTML(tags) {
  return `<div class="pf-section">
    <div class="pf-section-title">🏡 AMENITY STACK + ENHANCEMENT BUDGET</div>
    <div style="padding:12px 20px">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--gbg);border:1px solid var(--glt);border-radius:var(--r);margin-bottom:12px">
        <span style="font-size:11px;color:var(--tx3)">Enhancement Budget:</span>
        <span style="font-size:16px;font-weight:700;color:var(--gold)" id="enhTotal">$0</span>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Essentials (Always Included)</div>
      <div class="amen-grid" id="agEssentials"></div>
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px">Mid-Tier Upgrades</div>
      <div class="amen-grid" id="agMid"></div>
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px">Premium Amenities</div>
      <div class="amen-grid" id="agPremium"></div>
      <div style="display:flex;gap:5px;margin-top:10px;flex-wrap:wrap;align-items:flex-end">
        <input id="caName" class="fi" style="flex:1;min-width:130px" placeholder="Custom amenity…"/>
        <input id="caCost" type="number" class="fi" style="width:75px" placeholder="$Cost"/>
        <select id="caImpact" class="fi" style="width:75px"><option>+5%</option><option>+10%</option><option>+15%</option></select>
        <select id="caTier" class="fi" style="width:85px"><option value="better">Better</option><option value="best" selected>Best</option></select>
        <button class="btn btn-out btn-sm" onclick="addCA()">+ Add</button>
      </div>
    </div>
  </div>`;
}

// ── DQ VIEW ────────────────────────────────────────────────────────────────────
function renderDQView() {
  const el=G('dqContent'); if(!el) return;
  if(!APP.dqLog.length){el.innerHTML=`<div class="empty"><div class="empty-icon">📁</div><div class="empty-title">No DQ'd deals</div><div class="empty-sub">DQ a property from any property card or panel</div></div>`;return;}
  el.innerHTML=`<div style="overflow-x:auto"><table class="dq-table">
    <thead><tr><th>Property</th><th>Ask Price</th><th>CoC</th><th>Viable At</th><th>Reason</th><th>Agent</th><th>Memo</th><th>Date</th><th></th></tr></thead>
    <tbody>${APP.dqLog.map(d=>`<tr>
      <td><div style="font-weight:500">${d.address}</div><div style="font-size:10px;color:var(--tx3)">${d.city}, ${d.state}</div></td>
      <td style="font-family:'DM Mono',monospace">${fm(d.askPrice)}</td>
      <td style="color:var(--rd);font-weight:600;font-family:'DM Mono',monospace">${fpc(d.coc)}</td>
      <td style="color:var(--am);font-family:'DM Mono',monospace">${d.viablePrice?fm(d.viablePrice):'N/A'}</td>
      <td><span class="tag am" style="font-size:9px">${d.reason||'Price Too High'}</span></td>
      <td style="font-size:10px">${d.agentName||'—'}<br>${d.agentEmail?`<span style="color:var(--tx3)">${d.agentEmail}</span>`:''}</td>
      <td><span class="tag ${d.memoSent?'gr':'am'}">${d.memoSent?'✓ Sent':'Pending'}</span></td>
      <td style="font-size:10px;color:var(--tx3)">${d.date?new Date(d.date).toLocaleDateString():''}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="APP.dqPropId='${d.propId}';G('dqModal').classList.add('open');regenMemo()">Memo</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ── PREDICTION / PIPELINE ──────────────────────────────────────────────────────
function renderPrediction() {
  const el=G('predContent'); if(!el) return;
  const all=getAllProps();
  const an=all.filter(p=>p.analysis).length;
  const good=all.filter(p=>p.status==='good').length;
  const offer=all.filter(p=>p.status==='needs-offer').length;
  const prelimGood=all.filter(p=>p.status==='prelim'&&p.prelim?.prelim_status==='prelim_good').length;
  const hitRate=an>0?((good+offer)/an*100).toFixed(1):1;
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    ${[
      ['Properties Loaded',all.length,'Across '+APP.searches.length+' markets','var(--gold)'],
      ['Good Deals (AirROI)',good,'10%+ CoC confirmed','var(--gr)'],
      ['Needs Offer (AirROI)',offer,'Works below ask','var(--am)'],
      ['Prelim Good (Claude)',prelimGood,'Awaiting AirROI confirmation','var(--bl)'],
      ['AirROI Calls Made',APP.apiCalls,'$'+APP.apiSpend.toFixed(2)+' spent · $'+(100-APP.apiSpend).toFixed(2)+' balance','var(--tx2)'],
      ['Hit Rate',an>0?hitRate+'%':'—','Of AirROI-analyzed','var(--pu)'],
    ].map(([k,v,s,c])=>`<div style="background:var(--w);border:1px solid var(--bd);border-radius:var(--r2);padding:14px;box-shadow:var(--sh)"><div style="font-size:22px;font-weight:700;color:${c};margin-bottom:2px">${v}</div><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3)">${k}</div><div style="font-size:9px;color:var(--tx4);margin-top:2px">${s}</div></div>`).join('')}
  </div>
  <div style="background:var(--w);border:1px solid var(--bd);border-radius:var(--r2);padding:16px;box-shadow:var(--sh)">
    <div style="font-size:14px;font-weight:700;margin-bottom:12px">📊 Daily Workflow — Path to 150 Closings/Year</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${[['8:00 AM','Step 1: Prelim Screen (Free)','App auto-screens all ${all.length} loaded properties using Claude market benchmarks. No API calls. Finds prelim-good deals instantly.','var(--bl)'],
      ['8:30 AM','Step 2: Build Proformas (3 calls each)','Click "Build Proforma" on prelim-good properties. AirROI confirms revenue, ADR, occupancy with real Airbnb comparables.','var(--gold)'],
      ['9:30 AM','Step 3: Review + Sort Deals','Good Deals tab shows confirmed 10%+ CoC. Needs Offer tab shows below-ask deals. DQ the rest and send creative finance memos.','var(--gr)'],
      ['10:00 AM','Step 4: Submit Offers','For confirmed Good Deals: open listing, get agent contact, submit offer within 24 hours. Target 2-3 offers/day.','var(--gr)'],
      ['Daily','Step 5: DQ Memos','Send creative finance proposals to all DQ\'d agents. Even 5% response rate generates extra deal flow.','var(--am)'],
      ['2x/Day','Step 6: Refresh Listings','Click ↻ Refresh in morning and evening. Realtor.com API pulls fresh listings. New properties auto-screened.','var(--pu)']
      ].map(([t,title,desc,c])=>`<div style="padding:12px;background:var(--bg);border-radius:var(--r2);border-left:3px solid ${c}">
        <div style="font-size:9px;color:var(--tx3);font-weight:600;text-transform:uppercase;margin-bottom:3px">${t}</div>
        <div style="font-size:12px;font-weight:600;margin-bottom:4px">${title}</div>
        <div style="font-size:10px;color:var(--tx3)">${desc}</div>
      </div>`).join('')}
    </div>
    <div style="margin-top:14px;padding:12px;background:var(--ambg);border:1px solid var(--amlt);border-radius:var(--r);font-size:11px;color:var(--am)">
      💡 <strong>To close 150/year at 1/4 take rate:</strong> Need 600 qualified deals = 12 good deals/week. At ${hitRate}% AirROI hit rate on ${APP.searches.length} markets × avg 8 properties = ${APP.searches.length*8} properties. Prelim screen all free. AirROI-analyze the top prelim-good ones at $0.15 each. Scale markets via + Add Market.
    </div>
  </div>`;
}

// ── NEW VIEW ROUTING (map, pipeline, compare, portfolio, searches, clients) ─────
function showView(id) {
  APP.activeView=id;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.tn').forEach(b=>b.classList.remove('active'));
  G(id)?.classList.add('active');
  G('nav_'+id)?.classList.add('active');

  // Route to appropriate render function
  switch(id) {
    case 'all':
      renderPropGrid();
      break;
    case 'good':
      renderSubGrid('good');
      break;
    case 'offer':
      renderSubGrid('needs-offer');
      break;
    case 'dq':
      renderDQView();
      break;
    case 'prediction':
      renderPrediction();
      break;
    case 'map':
      if(typeof initMap==='function') {
        initMap();
        setTimeout(()=>{if(typeof refreshMap==='function')refreshMap();}, 100);
      }
      break;
    case 'pipeline':
      if(typeof renderKanban==='function') renderKanban();
      break;
    case 'compare':
      if(typeof renderCompareView==='function') renderCompareView();
      break;
    case 'portfolio':
      if(typeof renderPortfolio==='function') renderPortfolio();
      break;
    case 'searches':
      if(typeof renderSavedSearches==='function') renderSavedSearches();
      if(typeof renderDQRulesPanel==='function') renderDQRulesPanel();
      break;
    case 'clients':
      if(typeof renderClientManagerView==='function') renderClientManagerView();
      break;
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
