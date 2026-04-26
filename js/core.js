'use strict';

// ── API KEYS (server-side via Vercel proxy) ───────────────────────────────────
const AIRROI_KEY   = 'PVvRRJBXeB18yr8BQHY0V8iQbYzo7S965h4D6jYc';
const RAPIDAPI_KEY = 'ca56118692msh934ff5ce7b4982fp181ad8jsn3901adb598e3';
const PROXY_BASE   = '';

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const DOWN=0.20, RATE=7.0, TERM=30, COC_GOOD=12, COC_OFFER=8, MAX_ALL_IN=200000;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── 49-MARKET SEARCH CONFIG (legacy defaults, migrated to buyBoxes on first load) ──
const SEARCHES_DEFAULT = [
  {id:'s1',  name:'Shenandoah Valley VA',      city:'Harrisonburg',     state:'VA', lat:38.4496,  lng:-78.8689,  beds_min:5, pmin:500000,  pmax:1000000, tags:['Mountain','Ski','Resort']},
  {id:'s2',  name:'Carson City NV',             city:'Carson City',      state:'NV', lat:39.1638,  lng:-119.7674, beds_min:4, pmin:300000,  pmax:900000,  tags:['Nevada','Desert']},
  {id:'s3',  name:'Abilene TX',                 city:'Abilene',          state:'TX', lat:32.4487,  lng:-99.7331,  beds_min:3, pmin:300000,  pmax:700000,  tags:['Texas','STR']},
  {id:'s4',  name:'Round Rock TX',              city:'Round Rock',       state:'TX', lat:30.5085,  lng:-97.6789,  beds_min:4, pmin:300000,  pmax:800000,  tags:['Texas','Austin Metro']},
  {id:'s5',  name:'Deep Creek Lake MD',         city:'Oakland',          state:'MD', lat:39.4059,  lng:-79.3847,  beds_min:4, pmin:350000,  pmax:1000000, tags:['Lakefront','Deep Creek Lake']},
  {id:'s6',  name:'Central Dallas TX',          city:'Dallas',           state:'TX', lat:32.9029,  lng:-96.7669,  beds_min:4, pmin:350000,  pmax:950000,  tags:['Texas','Dallas']},
  {id:'s7',  name:'Fort Walton Beach FL',       city:'Fort Walton Beach',state:'FL', lat:30.4058,  lng:-86.6187,  beds_min:4, pmin:300000,  pmax:950000,  tags:['Florida','Beach']},
  {id:'s8',  name:'Broken Bow OK',              city:'Broken Bow',       state:'OK', lat:34.0290,  lng:-94.7396,  beds_min:3, pmin:300000,  pmax:900000,  tags:['Oklahoma','Cabin']},
  {id:'s9',  name:'East Stroudsburg Poconos PA',city:'East Stroudsburg', state:'PA', lat:40.9870,  lng:-75.1799,  beds_min:3, pmin:300000,  pmax:850000,  tags:['Pocono','Mountain']},
  {id:'s10', name:'Gatlinburg TN',              city:'Gatlinburg',       state:'TN', lat:35.7143,  lng:-83.5102,  beds_min:3, pmin:350000,  pmax:1000000, tags:['Mountain','Cabin','Tennessee']},
  {id:'s11', name:'Pigeon Forge TN',            city:'Pigeon Forge',     state:'TN', lat:35.7887,  lng:-83.5543,  beds_min:3, pmin:300000,  pmax:950000,  tags:['Mountain','Cabin','Tennessee']},
  {id:'s12', name:'Blue Ridge GA',              city:'Blue Ridge',       state:'GA', lat:34.8643,  lng:-84.3246,  beds_min:3, pmin:300000,  pmax:850000,  tags:['Mountain','Cabin','Georgia']},
  {id:'s13', name:'Destin FL',                  city:'Destin',           state:'FL', lat:30.3935,  lng:-86.4958,  beds_min:3, pmin:300000,  pmax:1000000, tags:['Florida','Beach','Gulf']},
  {id:'s14', name:'Gulf Shores AL',             city:'Gulf Shores',      state:'AL', lat:30.2460,  lng:-87.7008,  beds_min:3, pmin:300000,  pmax:950000,  tags:['Beach','Alabama']},
  {id:'s15', name:'Asheville NC',               city:'Asheville',        state:'NC', lat:35.5951,  lng:-82.5515,  beds_min:3, pmin:300000,  pmax:900000,  tags:['Mountain','North Carolina']},
  {id:'s16', name:'Myrtle Beach SC',            city:'Myrtle Beach',     state:'SC', lat:33.6891,  lng:-78.8867,  beds_min:3, pmin:300000,  pmax:850000,  tags:['Beach','South Carolina']},
  {id:'s17', name:'Scottsdale AZ',              city:'Scottsdale',       state:'AZ', lat:33.4942,  lng:-111.9261, beds_min:4, pmin:400000,  pmax:1000000, tags:['Desert','Arizona','Luxury']},
  {id:'s18', name:'Breckenridge CO',            city:'Breckenridge',     state:'CO', lat:39.4817,  lng:-106.0384, beds_min:4, pmin:500000,  pmax:1000000, tags:['Ski','Mountain','Colorado']},
  {id:'s19', name:'Lake Tahoe NV',              city:'Stateline',        state:'NV', lat:38.9637,  lng:-119.9441, beds_min:3, pmin:400000,  pmax:1000000, tags:['Mountain','Lake','Nevada']},
  {id:'s20', name:'Helen GA',                   city:'Helen',            state:'GA', lat:34.7026,  lng:-83.7302,  beds_min:3, pmin:300000,  pmax:750000,  tags:['Mountain','Cabin','Georgia']},
  {id:'s21', name:'Chattanooga TN',             city:'Chattanooga',      state:'TN', lat:35.0456,  lng:-85.3097,  beds_min:3, pmin:300000,  pmax:900000,  tags:['Urban','Tennessee','Mountain']},
  {id:'s22', name:'Sevierville TN',              city:'Sevierville',      state:'TN', lat:35.8682,  lng:-83.5616, beds_min:3, pmin:300000,  pmax:900000,  tags:['Mountain','Cabin','Tennessee']},
  {id:'s23', name:'Orange Beach AL',             city:'Orange Beach',     state:'AL', lat:30.2941,  lng:-87.5736, beds_min:3, pmin:300000,  pmax:950000,  tags:['Beach','Alabama']},
  {id:'s24', name:'Panama City Beach FL',        city:'Panama City Beach',state:'FL', lat:30.1766,  lng:-85.8055, beds_min:3, pmin:300000,  pmax:950000,  tags:['Beach','Florida','Gulf']},
  {id:'s25', name:'Hilton Head SC',              city:'Hilton Head',      state:'SC', lat:32.2163,  lng:-80.7526, beds_min:3, pmin:350000,  pmax:1000000, tags:['Beach','South Carolina']},
  {id:'s26', name:'Savannah GA',                 city:'Savannah',         state:'GA', lat:32.0809,  lng:-81.0912, beds_min:3, pmin:300000,  pmax:900000,  tags:['Urban','Georgia']},
  {id:'s27', name:'Outer Banks NC',              city:'Outer Banks',      state:'NC', lat:36.0075,  lng:-75.6584, beds_min:3, pmin:350000,  pmax:1000000, tags:['Beach','North Carolina']},
  {id:'s28', name:'Sedona AZ',                   city:'Sedona',           state:'AZ', lat:34.8697,  lng:-111.7610,beds_min:3, pmin:400000,  pmax:1000000, tags:['Desert','Arizona']},
  {id:'s29', name:'Joshua Tree CA',              city:'Joshua Tree',      state:'CA', lat:34.1347,  lng:-116.3131,beds_min:2, pmin:300000,  pmax:800000,  tags:['Desert','California']},
  {id:'s30', name:'Palm Springs CA',             city:'Palm Springs',     state:'CA', lat:33.8303,  lng:-116.5453,beds_min:3, pmin:350000,  pmax:1000000, tags:['Desert','California','Luxury']},
  {id:'s31', name:'Big Bear Lake CA',            city:'Big Bear Lake',    state:'CA', lat:34.2439,  lng:-116.9114,beds_min:2, pmin:300000,  pmax:800000,  tags:['Mountain','Lake','California']},
  {id:'s32', name:'Fredericksburg TX',           city:'Fredericksburg',   state:'TX', lat:30.2752,  lng:-98.8720, beds_min:3, pmin:300000,  pmax:900000,  tags:['Texas']},
  {id:'s33', name:'Galveston TX',                city:'Galveston',        state:'TX', lat:29.3013,  lng:-94.7977, beds_min:3, pmin:300000,  pmax:850000,  tags:['Beach','Texas']},
  {id:'s34', name:'South Padre Island TX',       city:'South Padre Island',state:'TX',lat:26.1118,  lng:-97.1681, beds_min:2, pmin:300000,  pmax:900000,  tags:['Beach','Texas']},
  {id:'s35', name:'Branson MO',                  city:'Branson',          state:'MO', lat:36.6437,  lng:-93.2185, beds_min:3, pmin:300000,  pmax:800000,  tags:['Lake','Mountain']},
  {id:'s36', name:'Steamboat Springs CO',        city:'Steamboat Springs',state:'CO', lat:40.4850,  lng:-106.8317,beds_min:3, pmin:400000,  pmax:1000000, tags:['Ski','Mountain','Colorado']},
  {id:'s37', name:'Park City UT',                city:'Park City',        state:'UT', lat:40.6461,  lng:-111.4980,beds_min:3, pmin:450000,  pmax:1000000, tags:['Ski','Mountain']},
  {id:'s38', name:'Whitefish MT',                city:'Whitefish',        state:'MT', lat:48.4106,  lng:-114.3529,beds_min:3, pmin:350000,  pmax:1000000, tags:['Ski','Mountain']},
  {id:'s39', name:'Lake George NY',              city:'Lake George',      state:'NY', lat:43.4262,  lng:-73.7137, beds_min:3, pmin:300000,  pmax:900000,  tags:['Lakefront','Lake']},
  {id:'s40', name:'Cape Cod MA',                 city:'Barnstable',       state:'MA', lat:41.6688,  lng:-70.2962, beds_min:3, pmin:350000,  pmax:1000000, tags:['Beach']},
  {id:'s41', name:'Bar Harbor ME',               city:'Bar Harbor',       state:'ME', lat:44.3876,  lng:-68.2039, beds_min:3, pmin:300000,  pmax:900000,  tags:['Beach','Mountain']},
  {id:'s42', name:'Shenandoah VA',               city:'Luray',            state:'VA', lat:38.6649,  lng:-78.4594, beds_min:3, pmin:300000,  pmax:800000,  tags:['Mountain']},
  {id:'s43', name:'Kissimmee FL',                city:'Kissimmee',        state:'FL', lat:28.2920,  lng:-81.4076, beds_min:4, pmin:300000,  pmax:900000,  tags:['Florida']},
  {id:'s44', name:'Orlando FL',                  city:'Orlando',          state:'FL', lat:28.4590,  lng:-81.4684, beds_min:4, pmin:300000,  pmax:950000,  tags:['Florida']},
  {id:'s45', name:'Cape Coral FL',               city:'Cape Coral',       state:'FL', lat:26.6315,  lng:-81.9575, beds_min:3, pmin:300000,  pmax:900000,  tags:['Florida','Beach']},
  {id:'s46', name:'Sarasota FL',                 city:'Sarasota',         state:'FL', lat:27.3364,  lng:-82.5307, beds_min:3, pmin:350000,  pmax:1000000, tags:['Florida','Beach','Gulf']},
  {id:'s47', name:'Anna Maria Island FL',        city:'Anna Maria',       state:'FL', lat:27.5231,  lng:-82.7334, beds_min:3, pmin:400000,  pmax:1000000, tags:['Florida','Beach']},
  {id:'s48', name:'St Augustine FL',             city:'St Augustine',     state:'FL', lat:29.8943,  lng:-81.3145, beds_min:3, pmin:300000,  pmax:900000,  tags:['Florida','Beach']},
  {id:'s49', name:'Key West FL',                 city:'Key West',         state:'FL', lat:24.5551,  lng:-81.7800, beds_min:2, pmin:400000,  pmax:1000000, tags:['Florida','Beach']},
];

// ── APP STATE ──────────────────────────────────────────────────────────────────
const APP = {
  searches:  JSON.parse(localStorage.getItem('bnb_s') || 'null') || SEARCHES_DEFAULT,
  props:     JSON.parse(localStorage.getItem('bnb_p') || '{}'),
  analyses:  JSON.parse(localStorage.getItem('bnb_a') || '{}'),
  dqLog:     JSON.parse(localStorage.getItem('bnb_dq') || '[]'),
  shortlist: JSON.parse(localStorage.getItem('bnb_sl') || '[]'),
  activeView: 'all', activePropId: null,
  sortKey: 'prelim_score', sortDir: 'desc',
  filterStatus: 'all', filterSearch: '', filterMinBeds: 0, filterSearchId: null,
  apiCalls: +localStorage.getItem('bnb_calls') || 0,
  apiSpend: +localStorage.getItem('bnb_spend') || 0,
  onboarded: localStorage.getItem('bnb_onboarded') === 'true',
};

function save() {
  try {
    localStorage.setItem('bnb_s',     JSON.stringify(APP.searches));
    localStorage.setItem('bnb_p',     JSON.stringify(APP.props));
    localStorage.setItem('bnb_a',     JSON.stringify(APP.analyses));
    localStorage.setItem('bnb_dq',    JSON.stringify(APP.dqLog));
    localStorage.setItem('bnb_sl',    JSON.stringify(APP.shortlist));
    localStorage.setItem('bnb_calls', APP.apiCalls);
    localStorage.setItem('bnb_spend', APP.apiSpend);
  } catch(e) { console.warn('localStorage full', e); }
}

function trackCall(n=1, cost=0.05) {
  APP.apiCalls += n; APP.apiSpend += cost*n; save();
  const c=G('apiCalls'); if(c) c.textContent=APP.apiCalls;
  const s=G('apiSpend'); if(s) s.textContent='$'+APP.apiSpend.toFixed(2);
  const b=G('apiBalance');
  if(b){const bal=100-APP.apiSpend;b.textContent='$'+Math.max(0,bal).toFixed(2);b.style.color=bal<20?'var(--rd)':bal<50?'var(--am)':'#4ade80';}
}
function updateApiStats() { trackCall(0,0); }

// ── DOM HELPERS ────────────────────────────────────────────────────────────────
const G  = id => document.getElementById(id);
const fm = n  => (!n && n!==0)||isNaN(n) ? '--' : '$'+Math.round(n).toLocaleString();
const fmK= n  => (!n && n!==0)||isNaN(n) ? '--' : '$'+Math.round(n/1000)+'K';
const fp = n  => (!n && n!==0)||isNaN(n) ? '--' : (n*100).toFixed(1)+'%';
const fpc= n  => (!n && n!==0)||isNaN(n) ? '--' : n.toFixed(1)+'%';
const fmRaw = n => isNaN(n)||n==null ? 0 : Math.round(n);

function ST(msg)  { const b=G('sb'); if(!b)return; b.classList.add('show'); b.querySelector('span').textContent=msg; }
function HIDE()   { G('sb')?.classList.remove('show'); }
function ERR(msg) { const e=G('eb'); if(!e)return; e.textContent=msg; e.classList.add('show'); setTimeout(()=>e.classList.remove('show'),8000); }

// ── AIRROI PROXY API ───────────────────────────────────────────────────────────
async function airGet(path) {
  const r = await fetch(`${PROXY_BASE}/api/airroi?path=${encodeURIComponent(path)}`);
  trackCall(1, 0.05);
  if (!r.ok) { const e=await r.json().catch(()=>{}); throw new Error(e?.error||e?.message||'AirROI '+r.status); }
  return r.json();
}

async function getEstimate(lat, lng, beds, baths, amenities) {
  const guests = Math.min(Math.max(beds*2, 4), 16);
  const b = Math.max(baths||Math.ceil(beds*.6), 1);
  const qs = new URLSearchParams({lat,lng,bedrooms:beds,baths:b,guests,amenities:amenities.join(',')});
  return airGet('/calculator/estimate?'+qs);
}

function extractEst(raw) {
  if (!raw||raw.code) return {revenue:0,occ:.5,adr:0,monthly:[],comps:[],p75Rev:0,p90Rev:0,p75Adr:0};
  return {
    revenue: raw.revenue||0, occ: raw.occupancy||.5, adr: raw.average_daily_rate||0,
    monthly: raw.monthly_revenue_distributions||[],
    comps: (raw.comparable_listings||[]).filter(c=>{const pm=c.performance_metrics||{};return pm.ttm_revenue>0&&pm.ttm_occupancy>.3;}).slice(0,7),
    p75Rev: raw.percentiles?.revenue?.p75||0, p90Rev: raw.percentiles?.revenue?.p90||0,
    p75Adr: raw.percentiles?.average_daily_rate?.p75||0,
  };
}

// ── RAPIDAPI PROXY ─────────────────────────────────────────────────────────────
async function fetchRealProps(search, limit=200) {
  const body = {
    limit, offset:0, status:['for_sale'], sort:{direction:'desc',field:'list_date'},
    beds_min: search.beds_min, price_min: search.pmin||100000, price_max: search.pmax||2000000,
    city: search.city, state_code: search.state,
  };
  const r = await fetch(`${PROXY_BASE}/api/properties`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Properties API '+r.status);
  const d = await r.json();
  const results = ((d.data||{}).home_search||{}).results || (d.data||{}).results || [];
  return results.map(r=>parseRapidProp(r,search)).filter(Boolean);
}

function parseRapidProp(r, search) {
  const desc = r.description||{}, loc=r.location?.address||{}, coord=loc.coordinate||{};
  const pp = r.primary_photo||{};
  const beds=parseInt(desc.beds||desc.beds_min||0), baths=parseFloat(desc.baths_full||desc.baths||0);
  const price=r.list_price||0, sqft=parseInt(desc.sqft||0);
  if (!price||!beds) return null;
  const photo=(pp.href||'').replace('http://','https://');
  const id=`${search.id}_${r.property_id||r.listing_id||(''+Math.random()).slice(2,10)}`;
  return {
    id, searchId:search.id, propertyId:String(r.property_id||''),
    address:loc.line||'Unknown', city:loc.city||search.city,
    state:loc.state_code||search.state, zip:loc.postal_code||'',
    lat:parseFloat(coord.lat)||search.lat, lng:parseFloat(coord.lon)||search.lng,
    beds, baths, sqft, yearBuilt:desc.year_built,
    listPrice:price, pricePerSqft:sqft?Math.round(price/sqft):0,
    hoa:(r.hoa||{}).fee||0, dom:r.days_on_market||0,
    photo:photo||null, listingUrl:r.href||'',
    status:'active', fetchedAt:Date.now(),
    priceReduced:!!(r.price_reduced_amount>0), priceReducedAmt:r.price_reduced_amount||0,
  };
}

// ── PRELIM SCORING (no API calls - FREE) ──────────────────────────────────────
const MARKET_REV_PER_BED = {
  PA:[12000,.60,280],TN:[14000,.55,320],GA:[13000,.57,290],SC:[11000,.60,250],
  AL:[10000,.58,230],FL:[11000,.62,260],OK:[9000,.50,240],MD:[13000,.48,380],
  VA:[11000,.52,300],TX:[9000,.54,220],NV:[12000,.55,300],CO:[14000,.54,380],
  NC:[10000,.60,240],AZ:[11000,.58,280],CA:[12000,.56,320],HI:[16000,.70,400],
  WA:[11000,.55,280],OR:[10000,.54,260],NY:[10000,.52,300],ME:[11000,.50,320],
  VT:[12000,.48,340],NH:[11000,.50,310],MA:[10000,.55,280],CT:[9000,.50,260],
  NJ:[9000,.52,250],DE:[10000,.55,270],WV:[9000,.48,240],KY:[8000,.50,220],
  IN:[8000,.52,200],OH:[8000,.52,210],MI:[9000,.50,230],WI:[9000,.48,240],
  MN:[9000,.48,250],IA:[7000,.48,190],MO:[8000,.50,210],AR:[8000,.48,200],
  LA:[9000,.55,230],MS:[7000,.50,190],ID:[11000,.52,280],MT:[11000,.50,300],
  WY:[11000,.48,320],UT:[11000,.52,290],NM:[9000,.50,240],SD:[8000,.46,200],
  NE:[7000,.46,190],KS:[7000,.48,190],ND:[7000,.45,180],
};
const TAG_MULT = {
  'Deep Creek Lake':1.4,'Lakefront':1.3,'Ski':1.3,'Mountain':1.15,'Beach':1.2,
  'Gulf':1.25,'Cabin':1.1,'Tennessee':1.2,'Georgia':1.1,'Florida':1.15,
  'Desert':1.05,'Luxury':1.2,'Colorado':1.25,'Lake':1.2,'Urban':1.0,
};

function prelimEstimate(prop, search) {
  const state = prop.state.toUpperCase();
  const [revPerBed, occ, adr] = MARKET_REV_PER_BED[state]||[10000,.55,250];
  let mult = 1;
  (search.tags||[]).forEach(t => { if(TAG_MULT[t]) mult = Math.max(mult, TAG_MULT[t]); });
  return { estRevenue: revPerBed * (prop.beds||4) * mult, occ, estAdr: adr * mult };
}

function prelimTier(prop, search, amenCost=0) {
  const {estRevenue, occ, estAdr} = prelimEstimate(prop, search);
  return buildTier({revenue:estRevenue, occ, adr:estAdr, monthly:[], comps:[], p75Rev:estRevenue*1.3, p90Rev:estRevenue*1.6, p75Adr:estAdr*1.3},
    prop.listPrice, prop.state, prop.beds, amenCost);
}

function prelimScreen(prop, search) {
  const tier = prelimTier(prop, search);
  const coc = tier.coc;
  if (coc >= COC_GOOD) return {prelim_status:'prelim_good', prelim_coc:coc, prelim_revenue:tier.revenue, prelim_tier:tier};
  if (coc >= COC_OFFER) return {prelim_status:'prelim_offer', prelim_coc:coc, prelim_revenue:tier.revenue, prelim_tier:tier};
  const discTier = buildTier({revenue:tier.revenue,occ:tier.occ,adr:tier.adr,monthly:[],comps:[],p75Rev:0,p90Rev:0,p75Adr:0},
    Math.round(prop.listPrice*.85), prop.state, prop.beds, 12000);
  if (discTier.coc >= COC_OFFER) return {prelim_status:'prelim_offer', prelim_coc:discTier.coc, prelim_revenue:tier.revenue, prelim_tier:tier, prelim_disc:15};
  return {prelim_status:'prelim_dq', prelim_coc:coc, prelim_revenue:tier.revenue, prelim_tier:tier};
}

// ── FINANCIAL MATH ─────────────────────────────────────────────────────────────
const TAX={FL:.0098,TX:.0175,NV:.006,OK:.009,PA:.015,VA:.008,MD:.012,TN:.007,NC:.009,CO:.006,AL:.004,SC:.005,GA:.009,CA:.012,AZ:.006,HI:.003,WA:.010,OR:.010,NY:.017,NJ:.024,NH:.021,CT:.021,VT:.018,MA:.012,ME:.012,OH:.016,MI:.015,WI:.018,MN:.011,IN:.009,KY:.009,MO:.010,IA:.015,AR:.006,LA:.005,MS:.008,ID:.007,MT:.008,WY:.006,UT:.007,NM:.008,DE:.006,WV:.006};
const INS={FL:.014,TX:.011,OK:.013,PA:.009,MD:.010,NV:.007,AL:.009,SC:.009,GA:.009,TN:.008,NC:.009,CO:.006,AZ:.008,CA:.010};
const LAND={FL:.30,NV:.28,CA:.35,MD:.26,VA:.22,TX:.20,PA:.17,OK:.14,TN:.18,CO:.22,NC:.18,AL:.15,SC:.18,GA:.20,AZ:.25};
const APR={'Deep Creek Lake':.058,'Lakefront':.058,'Beach':.055,'Ski':.055,'Breckenridge':.06,'Mountain':.052,'Florida':.052,'Desert':.048,'Tennessee':.05,'Georgia':.048};

const taxR  = s => TAX[(s||'').toUpperCase()]||.011;
const insR  = s => (INS[(s||'').toUpperCase()]||.008)*1.6;
const landP = s => LAND[(s||'').toUpperCase()]||.20;
const aprT  = tags => { for(const[k,v] of Object.entries(APR)){if(tags?.some(t=>t.includes(k)))return v;} return .045; };

function calcPI(principal, rate=RATE, years=TERM) {
  const r=rate/100/12, n=years*12;
  return !r ? principal/n : principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
}

function buildTier(est, price, state, beds, amenCost, furnCost=0) {
  const down=price*DOWN, mort=price-down, cc=price*.03;
  const totalCash=down+cc+amenCost+furnCost;
  const pi=calcPI(mort), taxMo=price*taxR(state)/12, insMo=price*insR(state)/12;
  const pmi=mort*.006/12;
  const gasElec=beds>=6?320:beds>=5?260:beds>=4?210:160;
  const poolMaint=(amenCost>30000?300:amenCost>8000?200:0);
  const cleanRev=1500;
  const fixed={pi,taxMo,insMo,pmi,water:80,internet:80,lawn:140,poolMaint};
  const fixedTotal=Object.values(fixed).reduce((s,v)=>s+v,0);
  const gbrMo=est.revenue/12;
  const variable={repairs:gbrMo*.05,supplies:gbrMo*.03,maintenance:gbrMo*.03,hosting:gbrMo*.25,platform:gbrMo*.03,cleaning:cleanRev,gasElec};
  const variableTotal=Object.values(variable).reduce((s,v)=>s+v,0);
  const gmiMo=gbrMo+cleanRev, garYr=est.revenue+cleanRev*12;
  const totExpMo=fixedTotal+variableTotal, ncfMo=gmiMo-totExpMo, ncfYr=ncfMo*12;
  const coc=totalCash>0?(ncfYr/totalCash)*100:0;
  const lp=landP(state), basis=price*(1-lp);
  const bonusDep=basis*.30, slDep=basis*.70/27.5, totalDep=bonusDep+slDep;
  const taxSav=totalDep*.37, yr1=ncfYr+taxSav, roi=totalCash>0?(yr1/totalCash)*100:0;
  const monthlyNCF=(est.monthly||[]).map(pct=>{
    const moGBR=est.revenue*pct, moVar=moGBR*(.08+.20+.03)+cleanRev+gasElec;
    return (moGBR+cleanRev)-(fixedTotal+moVar);
  });
  return {revenue:est.revenue,occ:est.occ,adr:est.adr,monthly:est.monthly||[],
    comps:est.comps||[],p75Rev:est.p75Rev,p90Rev:est.p90Rev,p75Adr:est.p75Adr,
    down,mort,cc,amenCost,furnCost,totalCash,pi,taxMo,insMo,pmi,gasElec,poolMaint,
    fixed,fixedTotal,variable,variableTotal,gbrMo,cleanRev,gmiMo,garYr,
    totExpMo,ncfMo,ncfYr,coc,lp,basis,bonusDep,slDep,totalDep,taxSav,yr1,roi,monthlyNCF};
}

function classifyDeal(B, askPrice, state, beds, amenCost) {
  if (B.coc>=COC_GOOD) return {status:'good',label:'Good Deal',viablePrice:askPrice,discountNeeded:0};
  for(let pct=.99;pct>=.70;pct-=.01){
    const tp=Math.round(askPrice*pct);
    const t=buildTier({revenue:B.revenue,occ:B.occ,adr:B.adr,monthly:B.monthly,comps:[],p75Rev:B.p75Rev,p90Rev:B.p90Rev,p75Adr:B.p75Adr},tp,state,beds,amenCost);
    if(t.coc>=COC_OFFER) return {status:'needs-offer',label:'Needs Offer',viablePrice:tp,discountNeeded:(1-pct)*100};
  }
  return {status:'reject',label:'Doesn\'t Pencil',viablePrice:null,discountNeeded:null};
}

// ── STR COMPLIANCE ─────────────────────────────────────────────────────────────
const COMPLY = {
  'PA':{status:'restricted',icon:'warning',label:'Restricted',permit:true,cost:500,hoa:'medium',nights:2,note:'Monroe County requires STR license.',reqs:['County STR License','Township Permit','PA State License']},
  'TN':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:125,hoa:'low',nights:null,note:'Sevier County STR-friendly.',reqs:['County STR Permit','TN Sales Tax','County Occupancy Tax']},
  'GA':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:180,hoa:'low',nights:null,note:'STR registration required.',reqs:['County STR Registration','GA Sales Tax','County Hotel Tax']},
  'SC':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:150,hoa:'medium',nights:null,note:'SC beach market STR-friendly.',reqs:['City Business License','SC Accommodations Tax']},
  'AL':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:200,hoa:'medium',nights:null,note:'Baldwin County revenue license required.',reqs:['City Business License','AL Lodging Tax']},
  'FL':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:120,hoa:'medium',nights:null,note:'FL state law preempts local bans. HOA risk.',reqs:['Business Tax Receipt','State Sales Tax','6% Transient Rental Tax']},
  'OK':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:75,hoa:'low',nights:null,note:'McCurtain County STR-friendly.',reqs:['OK Tourism Tax Registration','County Business License']},
  'MD':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:150,hoa:'medium',nights:null,note:'Garrett County allows STR.',reqs:['Business License','County STR Permit','MD Sales Tax']},
  'TX':{status:'restricted',icon:'warning',label:'Varies',permit:true,cost:200,hoa:'high',nights:null,note:'City registration required. Many HOAs ban STR.',reqs:['City STR Registration','Zoning Verification','HOA Approval']},
  'VA':{status:'restricted',icon:'warning',label:'Restricted',permit:true,cost:200,hoa:'low',nights:null,note:'City permit required.',reqs:['City STR Permit','Zoning Confirmation']},
  'NV':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:220,hoa:'low',nights:null,note:'NV state law favorable.',reqs:['City Business License','Transient Lodging Tax']},
  'CO':{status:'restricted',icon:'warning',label:'Restricted',permit:true,cost:1200,hoa:'high',nights:null,note:'Summit County STR permit cap.',reqs:['Summit County STR License','Town Permit','CO Sales Tax']},
  'NC':{status:'restricted',icon:'warning',label:'Restricted',permit:true,cost:500,hoa:'medium',nights:null,note:'Asheville has strict STR ordinance.',reqs:['City STR Permit','NC Occupancy Tax']},
  'AZ':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:250,hoa:'high',nights:null,note:'AZ state preempts HOA bans.',reqs:['City TPT License','AZ Registration']},
  'CA':{status:'restricted',icon:'warning',label:'Restricted',permit:true,cost:500,hoa:'high',nights:null,note:'Varies by city. Some cities ban or cap STRs.',reqs:['City STR Permit','CA Transient Occupancy Tax','Business License']},
  'UT':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:300,hoa:'medium',nights:null,note:'UT allows STRs with local permits.',reqs:['City Business License','UT Transient Room Tax']},
  'MT':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:200,hoa:'low',nights:null,note:'MT generally STR-friendly.',reqs:['County Permit','MT Lodging Facility Use Tax']},
  'MO':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:100,hoa:'low',nights:null,note:'MO generally STR-friendly. Branson is welcoming.',reqs:['City Business License','MO Sales Tax']},
  'NY':{status:'restricted',icon:'warning',label:'Restricted',permit:true,cost:400,hoa:'high',nights:30,note:'NY has strict rules. Upstate markets more flexible.',reqs:['County STR Permit','NY Sales Tax','Occupancy Tax']},
  'MA':{status:'restricted',icon:'warning',label:'Restricted',permit:true,cost:350,hoa:'medium',nights:null,note:'MA requires registration and tax collection.',reqs:['MA STR Registration','Community Impact Fee','Room Occupancy Tax']},
  'ME':{status:'allowed',icon:'check',label:'Allowed',permit:true,cost:200,hoa:'low',nights:null,note:'ME allows STRs with registration.',reqs:['ME Lodging Registration','ME Sales Tax']},
};
function getCompliance(state) {
  return COMPLY[state?.toUpperCase()] || {status:'unknown',icon:'question',label:'Unknown',permit:true,cost:0,hoa:'unknown',nights:null,note:'Verify local zoning and permit requirements.',reqs:['Verify Local Zoning','Check HOA CC&Rs']};
}

// ── FURNISHING ─────────────────────────────────────────────────────────────────
const FURN={
  standard:{label:'Standard ($)',perBed:3800,living:5500,dining:2200,kitchen:1800,outdoor:1500,misc:1200,labor:.15},
  premium:{label:'Premium ($$)',perBed:6500,living:9500,dining:4200,kitchen:3200,outdoor:3800,misc:2800,labor:.18},
  luxury:{label:'Luxury ($$$)',perBed:11000,living:16000,dining:7500,kitchen:5500,outdoor:8000,misc:5000,labor:.20},
};
function calcFurn(beds,tier='premium',hasOutdoor=true){
  const t=FURN[tier]||FURN.premium;
  const goods=t.perBed*beds+t.living+t.dining+t.kitchen+(hasOutdoor?t.outdoor:0)+t.misc;
  const labor=Math.round(goods*t.labor);
  return {goods,labor,total:goods+labor,tier,
    breakdown:[{item:`Bedrooms (${beds}x)`,cost:t.perBed*beds},{item:'Living Room',cost:t.living},{item:'Dining',cost:t.dining},{item:'Kitchen',cost:t.kitchen},...(hasOutdoor?[{item:'Outdoor',cost:t.outdoor}]:[]),{item:'Decor+Misc',cost:t.misc},{item:`Labor (${Math.round(t.labor*100)}%)`,cost:labor}]};
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function showOnboarding() {
  return; // disabled - was blocking entire page
  if (APP.onboarded) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'onboardModal';
  modal.innerHTML = `<div class="modal" style="max-width:560px;text-align:center">
    <div style="font-size:36px;margin-bottom:12px">🏠</div>
    <h3 style="font-size:20px;margin-bottom:6px">Welcome to BNB Accelerator</h3>
    <div class="modal-sub" style="font-size:13px;margin-bottom:20px">Your deal underwriting platform for STR investing.</div>
    <div class="onboard-steps">
      <div class="ob-step"><div class="ob-num">1</div><div><div class="ob-title">Set Your Buy Box</div><div class="ob-desc">Search any US market. Set price, beds, and filter criteria.</div></div></div>
      <div class="ob-step"><div class="ob-num">2</div><div><div class="ob-title">Screen Properties (Free)</div><div class="ob-desc">Properties are pre-screened using market benchmarks. No API cost.</div></div></div>
      <div class="ob-step"><div class="ob-num">3</div><div><div class="ob-title">Analyze with AirROI</div><div class="ob-desc">Click "Build Proforma" on promising deals for confirmed numbers.</div></div></div>
    </div>
    <button class="btn btn-gold btn-lg" style="margin-top:16px;width:100%" onclick="APP.onboarded=true;localStorage.setItem('bnb_onboarded','true');document.getElementById('onboardModal').remove()">Get Started</button>
  </div>`;
  document.body.appendChild(modal);
}
