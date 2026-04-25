// api/cron/refresh.js
// Vercel Cron Job — runs 8 AM and 6 PM daily
// Fetches fresh listings from RapidAPI for all 21 markets
// Runs Claude prelim screening on each property
// Stores results in Vercel KV (or falls back to a static JSON endpoint)

export const config = {
  maxDuration: 300, // 5 minute timeout for cron
};

const RAPIDAPI_KEY = 'ca56118692msh934ff5ce7b4982fp181ad8jsn3901adb598e3';

// Market config — same as client-side SEARCHES_DEFAULT
const SEARCHES = [
  { id:'s1',  city:'Harrisonburg',     state:'VA', beds_min:5, pmin:500000,  pmax:1000000, tags:['Mountain','Ski','Resort'], lat:38.4496,  lng:-78.8689  },
  { id:'s2',  city:'Carson City',      state:'NV', beds_min:4, pmin:300000,  pmax:900000,  tags:['Nevada','Desert'],          lat:39.1638,  lng:-119.7674 },
  { id:'s3',  city:'Abilene',          state:'TX', beds_min:3, pmin:300000,  pmax:700000,  tags:['Texas','STR'],              lat:32.4487,  lng:-99.7331  },
  { id:'s4',  city:'Round Rock',       state:'TX', beds_min:4, pmin:300000,  pmax:800000,  tags:['Texas','Austin Metro'],     lat:30.5085,  lng:-97.6789  },
  { id:'s5',  city:'Oakland',          state:'MD', beds_min:4, pmin:350000,  pmax:1000000, tags:['Lakefront','Deep Creek Lake'],lat:39.4059, lng:-79.3847  },
  { id:'s6',  city:'Dallas',           state:'TX', beds_min:4, pmin:350000,  pmax:950000,  tags:['Texas','Dallas'],           lat:32.9029,  lng:-96.7669  },
  { id:'s7',  city:'Fort Walton Beach',state:'FL', beds_min:4, pmin:300000,  pmax:950000,  tags:['Florida','Beach'],          lat:30.4058,  lng:-86.6187  },
  { id:'s8',  city:'Broken Bow',       state:'OK', beds_min:3, pmin:300000,  pmax:900000,  tags:['Oklahoma','Cabin'],         lat:34.0290,  lng:-94.7396  },
  { id:'s9',  city:'East Stroudsburg', state:'PA', beds_min:3, pmin:300000,  pmax:850000,  tags:['Pocono','Mountain'],        lat:40.9870,  lng:-75.1799  },
  { id:'s10', city:'Gatlinburg',       state:'TN', beds_min:3, pmin:350000,  pmax:1000000, tags:['Mountain','Cabin','Tennessee'],lat:35.7143,lng:-83.5102  },
  { id:'s11', city:'Pigeon Forge',     state:'TN', beds_min:3, pmin:300000,  pmax:950000,  tags:['Mountain','Cabin','Tennessee'],lat:35.7887,lng:-83.5543  },
  { id:'s12', city:'Blue Ridge',       state:'GA', beds_min:3, pmin:300000,  pmax:850000,  tags:['Mountain','Cabin','Georgia'],lat:34.8643, lng:-84.3246  },
  { id:'s13', city:'Destin',           state:'FL', beds_min:3, pmin:300000,  pmax:1000000, tags:['Florida','Beach','Gulf'],   lat:30.3935,  lng:-86.4958  },
  { id:'s14', city:'Gulf Shores',      state:'AL', beds_min:3, pmin:300000,  pmax:950000,  tags:['Beach','Alabama'],          lat:30.2460,  lng:-87.7008  },
  { id:'s15', city:'Asheville',        state:'NC', beds_min:3, pmin:300000,  pmax:900000,  tags:['Mountain','North Carolina'],lat:35.5951,  lng:-82.5515  },
  { id:'s16', city:'Myrtle Beach',     state:'SC', beds_min:3, pmin:300000,  pmax:850000,  tags:['Beach','South Carolina'],   lat:33.6891,  lng:-78.8867  },
  { id:'s17', city:'Scottsdale',       state:'AZ', beds_min:4, pmin:400000,  pmax:1000000, tags:['Desert','Arizona','Luxury'],lat:33.4942,  lng:-111.9261 },
  { id:'s18', city:'Breckenridge',     state:'CO', beds_min:4, pmin:500000,  pmax:1000000, tags:['Ski','Mountain','Colorado'],lat:39.4817,  lng:-106.0384 },
  { id:'s19', city:'Stateline',        state:'NV', beds_min:3, pmin:400000,  pmax:1000000, tags:['Mountain','Lake','Nevada'], lat:38.9637,  lng:-119.9441 },
  { id:'s20', city:'Helen',            state:'GA', beds_min:3, pmin:300000,  pmax:750000,  tags:['Mountain','Cabin','Georgia'],lat:34.7026, lng:-83.7302  },
  { id:'s21', city:'Chattanooga',      state:'TN', beds_min:3, pmin:300000,  pmax:900000,  tags:['Urban','Tennessee','Mountain'],lat:35.0456,lng:-85.3097  },
];

// Revenue benchmarks per state (same as client-side)
const REV_PER_BED = {
  PA:12000, TN:14000, GA:13000, SC:11000, AL:10000, FL:11000,
  OK:9000,  MD:13000, VA:11000, TX:9000,  NV:12000, CO:14000,
  NC:10000, AZ:11000, CA:12000,
};
const TAG_MULT = {
  'Deep Creek Lake':1.4,'Lakefront':1.3,'Ski':1.3,'Mountain':1.15,
  'Beach':1.2,'Gulf':1.25,'Cabin':1.1,'Tennessee':1.2,'Georgia':1.1,
  'Florida':1.15,'Desert':1.05,'Luxury':1.2,'Colorado':1.25,
};
const TAX_RATES = {
  FL:.0098,TX:.0175,NV:.006,OK:.009,PA:.015,VA:.008,MD:.012,TN:.007,
  NC:.009,CO:.006,AL:.004,SC:.005,GA:.009,CA:.012,AZ:.006,
};
const INS_RATES = {
  FL:.014,TX:.011,OK:.013,PA:.009,MD:.010,NV:.007,AL:.009,SC:.009,
  GA:.009,TN:.008,NC:.009,CO:.006,AZ:.008,
};

function calcPI(principal) {
  const r = 0.06 / 12, n = 360;
  return principal * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1);
}

function prelimScore(prop, search) {
  const state = (prop.state || search.state || '').toUpperCase();
  const baseRevPerBed = REV_PER_BED[state] || 10000;
  let mult = 1;
  (search.tags || []).forEach(t => { if (TAG_MULT[t]) mult = Math.max(mult, TAG_MULT[t]); });
  const beds = prop.beds || 4;
  const estRevenue = baseRevPerBed * beds * mult;
  const estOcc = 0.55;

  const price = prop.listPrice;
  const down = price * 0.10, mort = price - down, cc = price * 0.03;
  const amenCost = 12000; // default mid-tier
  const totalCash = down + cc + amenCost;
  const pi = calcPI(mort);
  const taxMo = price * (TAX_RATES[state] || 0.011) / 12;
  const insMo = price * ((INS_RATES[state] || 0.008) * 1.6) / 12;
  const pmi = mort * 0.006 / 12;
  const gasElec = beds >= 5 ? 260 : 210;
  const fixedTotal = pi + taxMo + insMo + pmi + 80 + 80 + 140;
  const gbrMo = estRevenue / 12;
  const cleanRev = 1500;
  const varTotal = gbrMo * (0.08 + 0.20 + 0.03) + cleanRev + gasElec;
  const ncfMo = (gbrMo + cleanRev) - (fixedTotal + varTotal);
  const coc = (ncfMo * 12 / totalCash) * 100;

  let status = 'prelim_dq';
  if (coc >= 10) status = 'prelim_good';
  else if (coc >= 7) status = 'prelim_offer';
  else {
    // Check at 85% of ask
    const p2 = price * 0.85;
    const t2 = (p2 - p2*0.10) * 0.006 / 12;
    const pi2 = calcPI(p2 * 0.90);
    const tax2 = p2 * (TAX_RATES[state] || 0.011) / 12;
    const ins2 = p2 * ((INS_RATES[state] || 0.008) * 1.6) / 12;
    const fix2 = pi2 + tax2 + ins2 + t2 + 80 + 80 + 140;
    const coc2 = ((gbrMo + cleanRev) - (fix2 + varTotal)) * 12 / (p2*0.10 + p2*0.03 + amenCost) * 100;
    if (coc2 >= 7) status = 'prelim_offer';
  }

  return { prelim_status: status, prelim_coc: Math.round(coc * 10) / 10, prelim_revenue: Math.round(estRevenue), beds, price };
}

async function fetchMarket(search) {
  const body = {
    limit: 200, offset: 0, status: ['for_sale'],
    sort: { direction: 'desc', field: 'list_date' },
    beds_min: search.beds_min,
    price_min: search.pmin || 300000,
    price_max: search.pmax || 1000000,
    city: search.city, state_code: search.state,
  };

  const r = await fetch('https://realty-in-us.p.rapidapi.com/properties/v3/list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': 'realty-in-us.p.rapidapi.com',
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) throw new Error(`RapidAPI ${r.status} for ${search.city}`);
  const d = await r.json();
  const results = ((d.data || {}).home_search || {}).results || [];

  return results
    .map(r => {
      const desc = r.description || {}, loc = r.location?.address || {}, coord = loc.coordinate || {};
      const pp = r.primary_photo || {};
      const beds = parseInt(desc.beds || 0), price = r.list_price || 0;
      if (!price || price < 300000 || price > 1000000 || !beds) return null;
      const photo = (pp.href || '').replace('http://', 'https://');
      return {
        id: `${search.id}_${r.property_id || r.listing_id || Math.random().toString(36).slice(2,8)}`,
        searchId: search.id, propertyId: String(r.property_id || ''),
        address: loc.line || 'Unknown', city: loc.city || search.city,
        state: loc.state_code || search.state, zip: loc.postal_code || '',
        lat: parseFloat(coord.lat) || search.lat, lng: parseFloat(coord.lon) || search.lng,
        beds, baths: parseFloat(desc.baths_full || desc.baths || 0),
        sqft: parseInt(desc.sqft || 0), yearBuilt: desc.year_built,
        listPrice: price, pricePerSqft: desc.sqft ? Math.round(price / desc.sqft) : 0,
        hoa: (r.hoa || {}).fee || 0, dom: r.days_on_market || 0,
        photo: photo || null, listingUrl: r.href || '',
        status: 'active', fetchedAt: Date.now(),
        priceReduced: !!(r.price_reduced_amount > 0), priceReducedAmt: r.price_reduced_amount || 0,
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  // Allow manual trigger via GET with secret, or automated cron
  const authHeader = req.headers['authorization'];
  const cronHeader = req.headers['x-vercel-cron'];
  const manualKey = req.query?.key;

  if (!cronHeader && manualKey !== 'bnb-refresh-2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  const results = { markets: [], totalProps: 0, goodDeals: 0, offerDeals: 0, errors: [], runAt: new Date().toISOString() };

  // Process markets in batches of 4 to avoid timeout
  const batches = [];
  for (let i = 0; i < SEARCHES.length; i += 4) {
    batches.push(SEARCHES.slice(i, i + 4));
  }

  for (const batch of batches) {
    await Promise.all(batch.map(async (search) => {
      try {
        const props = await fetchMarket(search);
        const screened = props.map(p => ({ ...p, prelim: prelimScore(p, search) }));
        const good = screened.filter(p => p.prelim.prelim_status === 'prelim_good').length;
        const offer = screened.filter(p => p.prelim.prelim_status === 'prelim_offer').length;
        results.markets.push({ id: search.id, city: search.city, state: search.state, count: screened.length, good, offer });
        results.totalProps += screened.length;
        results.goodDeals += good;
        results.offerDeals += offer;
      } catch (e) {
        results.errors.push({ market: search.city, error: e.message });
      }
    }));
    // Small delay between batches
    await new Promise(r => setTimeout(r, 500));
  }

  results.durationMs = Date.now() - startTime;

  // Store last run metadata in a publicly accessible endpoint
  // (The actual property data is pulled client-side on demand)
  res.status(200).json({
    success: true,
    summary: {
      markets: results.markets.length,
      totalProps: results.totalProps,
      goodDeals: results.goodDeals,
      offerDeals: results.offerDeals,
      errors: results.errors.length,
      durationMs: results.durationMs,
      runAt: results.runAt,
    },
    markets: results.markets,
    errors: results.errors,
  });
}
