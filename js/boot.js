    function bootApp() {
      const appRoot = document.getElementById('appRoot');

      appRoot.innerHTML = `
        <!-- TOPBAR -->
        <div class="top">
          <div class="top-left">
            <img src="https://bnbaccelerator.com/wp-content/uploads/2025/03/BNB_Accelerator_logo-150x77.png" alt="BNB Accelerator" class="brand-logo">
            <div class="brand-text">
              BNB Accelerator <span>|</span> Deal Underwriting - All Markets
            </div>
          </div>

          <button class="hamburger-btn" onclick="toggleMobileNav()" aria-label="Menu">&#9776;</button>
          <div class="top-nav">
            <button class="nav-tab active" id="nav_all" onclick="showView('all')">
              All <span class="pill" id="pill_all">0</span>
            </button>
            <button class="nav-tab" id="nav_good" onclick="showView('good')">
              Good <span class="pill" id="pill_good">0</span>
            </button>
            <button class="nav-tab" id="nav_offer" onclick="showView('offer')">
              Offer <span class="pill" id="pill_offer">0</span>
            </button>
            <button class="nav-tab" id="nav_dq" onclick="showView('dq')">
              DQ'd <span class="pill" id="pill_dq">0</span>
            </button>
            <button class="nav-tab" id="nav_pipeline" onclick="showView('pipeline')">
              Pipeline
            </button>
            <button class="nav-tab" id="nav_map" onclick="showView('map')">
              Map
            </button>
            <button class="nav-tab" id="nav_compare" onclick="showView('compare')">
              Compare
            </button>
            <button class="nav-tab" id="nav_portfolio" onclick="showView('portfolio')">
              Portfolio
            </button>
            <button class="nav-tab" id="nav_searches" onclick="showView('searches')">
              Searches
            </button>
          </div>

          <div class="top-right">
            <div class="api-pill">
              <span id="apiCalls">0</span> calls / \$<span id="apiSpent">0</span> / \$<span id="apiBalance">100</span>
            </div>
            <div class="cron-status">
              <div class="cron-dot"></div>
              <span id="cronStatus">Ready</span>
            </div>
            <button class="btn btn-refresh" onclick="refreshData()">Refresh</button>
            <button class="btn btn-primary" onclick="openBuyBoxModal()">+ New Buy Box</button>
          </div>
        </div>

        <!-- MAIN CONTENT -->
        <div class="main">
          <div class="eb" id="errorBar"></div>

          <div class="views-container">
            <!-- ALL PROPERTIES VIEW -->
            <div class="view active" id="all">
              <div class="sb">
                <div class="sb-item">
                  <span class="sb-label">Properties</span>
                  <span class="sb-value" id="statProps">0</span>
                </div>
                <div class="sb-item">
                  <span class="sb-label">Good Deals</span>
                  <span class="sb-value" id="statGood">0</span>
                </div>
                <div class="sb-item">
                  <span class="sb-label">Needs Offer</span>
                  <span class="sb-value" id="statOffer">0</span>
                </div>
                <div class="sb-item">
                  <span class="sb-label">DQ'd</span>
                  <span class="sb-value" id="statDQ">0</span>
                </div>
                <div class="sb-item">
                  <span class="sb-label">Pending</span>
                  <span class="sb-value" id="statPending">0</span>
                </div>
                <div class="sb-item">
                  <span class="sb-label">AirROI Calls</span>
                  <span class="sb-value" id="statAirROI">0</span>
                </div>
              </div>

              <div style="padding: 20px;">
                <div class="toolbar">
                  <input type="text" class="search-input" id="searchInput" placeholder="Search address...">
                  <select class="filter-dropdown" id="searchFilter">
                    <option value="">All Markets</option>
                  </select>
                  <select class="filter-dropdown" id="statusFilter">
                    <option value="">All Status</option>
                    <option value="good">Good Deal</option>
                    <option value="needs-offer">Needs Offer</option>
                    <option value="dqd">DQ'd</option>
                  </select>
                  <select class="filter-dropdown" id="bedsFilter">
                    <option value="">All Beds</option>
                    <option value="1">1 Bed</option>
                    <option value="2">2 Beds</option>
                    <option value="3">3 Beds</option>
                    <option value="4">4+ Beds</option>
                  </select>
                  <select class="filter-dropdown" id="sortBy">
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="roi-desc">Best ROI</option>
                  </select>
                </div>
                <div id="propGrid"></div>
              </div>
            </div>

            <!-- GOOD DEALS VIEW -->
            <div class="view" id="good">
              <div style="padding: 20px;">
                <h2 class="heading-h2">Good Deals</h2>
                <div id="propGrid"></div>
              </div>
            </div>

            <!-- NEEDS OFFER VIEW -->
            <div class="view" id="offer">
              <div style="padding: 20px;">
                <h2 class="heading-h2">Needs Offer</h2>
                <div id="propGrid"></div>
              </div>
            </div>

            <!-- DQ TRACKER VIEW -->
            <div class="view" id="dq">
              <div style="padding: 20px;">
                <h2 class="heading-h2">DQ Tracker</h2>
                <div id="dqContent" class="dq-tracker"></div>
              </div>
            </div>

            <!-- PIPELINE/KANBAN VIEW -->
            <div class="view" id="pipeline">
              <div style="padding: 20px;">
                <h2 class="heading-h2">Pipeline</h2>
                <div id="kanbanBoard" class="kanban-row"></div>
              </div>
            </div>

            <!-- MAP VIEW -->
            <div class="view" id="map">
              <div style="padding: 20px;">
                <h2 class="heading-h2">Map View</h2>
                <div id="mapContainer" style="height:600px;border-radius:10px;"></div>
              </div>
            </div>

            <!-- COMPARE VIEW -->
            <div class="view" id="compare">
              <div style="padding: 20px;">
                <h2 class="heading-h2">Compare Properties</h2>
                <div id="compareContent"></div>
              </div>
            </div>

            <!-- PORTFOLIO VIEW -->
            <div class="view" id="portfolio">
              <div style="padding: 20px;">
                <h2 class="heading-h2">Portfolio Rollup</h2>
                <div id="portfolioContent"></div>
              </div>
            </div>

            <!-- SEARCHES/BUY BOXES VIEW -->
            <div class="view" id="searches">
              <div style="padding: 20px;">
                <h2 class="heading-h2">Saved Searches / Buy Boxes</h2>
                <button class="btn btn-primary" onclick="openBuyBoxModal()" style="margin-bottom: 20px;">+ New Buy Box</button>
                <div id="savedSearchesGrid"></div>
                <div id="dqRulesPanel"></div>
              </div>
            </div>

            <!-- CLIENTS VIEW -->
          </div>
        </div>
      `;

      // DETAIL PANEL OVERLAY
      const panelOverlay = document.createElement('div');
      panelOverlay.id = 'panelOverlay';
      panelOverlay.innerHTML = `
        <div class="detail-panel">
          <div class="panel-head">
            <div>
              <div class="panelAddr" id="panelAddr"></div>
              <div class="panelSub" id="panelSub"></div>
            </div>
            <button class="panel-close" onclick="closePanel()">✕</button>
          </div>
          <div class="panelBody" id="panelBody"></div>
        </div>
      `;
      document.body.appendChild(panelOverlay);

      // DQ MODAL
      const dqModal = document.createElement('div');
      dqModal.id = 'dqModal';
      dqModal.className = 'modal';
      dqModal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">Disqualify Property</div>
          <div class="modal-form">
            <div class="form-group">
              <label class="form-label">Reason for DQ</label>
              <textarea id="dqReason" class="form-input" style="height: 100px; resize: vertical;"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="dqCategory" class="form-input">
                <option value="">Select Category</option>
                <option value="inspection">Inspection Issues</option>
                <option value="valuation">Valuation Too Low</option>
                <option value="market">Market Concerns</option>
                <option value="owner">Owner Issues</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div class="modal-buttons">
            <button class="btn btn-secondary" onclick="closeDQModal()">Cancel</button>
            <button class="btn btn-primary" onclick="submitDQ()">Disqualify</button>
          </div>
        </div>
      `;
      document.body.appendChild(dqModal);

      // BUY BOX MODAL
      const buyBoxModal = document.createElement('div');
      buyBoxModal.id = 'buyBoxModal';
      buyBoxModal.className = 'modal';
      buyBoxModal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">New Buy Box Search</div>
          <div class="modal-form">
            <div class="form-group">
              <label class="form-label">Buy Box Name</label>
              <input type="text" id="bbName" class="form-input" placeholder="e.g., Denver Single Family">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">City</label>
                <input type="text" id="bbCity" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">State</label>
                <input type="text" id="bbState" class="form-input" placeholder="CO">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Zip Code</label>
              <input type="text" id="bbZip" class="form-input">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Price Min</label>
                <input type="number" id="bbPriceMin" class="form-input" placeholder="0">
              </div>
              <div class="form-group">
                <label class="form-label">Price Max</label>
                <input type="number" id="bbPriceMax" class="form-input" placeholder="999999">
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Min Beds</label>
                <input type="number" id="bbBedsMin" class="form-input" placeholder="1">
              </div>
              <div class="form-group">
                <label class="form-label">Max Beds</label>
                <input type="number" id="bbBedsMax" class="form-input" placeholder="5">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Max HOA</label>
              <input type="number" id="bbMaxHoa" class="form-input" placeholder="500">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Latitude</label>
                <input type="number" id="bbLat" class="form-input" step="0.0001">
              </div>
              <div class="form-group">
                <label class="form-label">Longitude</label>
                <input type="number" id="bbLng" class="form-input" step="0.0001">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Tags (comma-separated)</label>
              <input type="text" id="bbTags" class="form-input" placeholder="investment, turnkey">
            </div>
          </div>
          <div class="modal-buttons">
            <button class="btn btn-secondary" onclick="closeBuyBoxModal()">Cancel</button>
            <button class="btn btn-primary" onclick="handleSaveBuyBox()">Save Buy Box</button>
          </div>
        </div>
      `;
      document.body.appendChild(buyBoxModal);

      // Initialize the app
      appRoot.classList.add('active');

      // Initialize each module
      if (window.initBuyBox) initBuyBox();
      if (window.initSeedData) initSeedData();
      if (window.populateSearchFilter) populateSearchFilter();
      if (window.updateApiStats) updateApiStats();
      if (window.runPrelimAll) runPrelimAll();
      if (window.showOnboarding) showOnboarding();
      if (window.renderSavedSearches) renderSavedSearches();
      if (window.renderDQRulesPanel) renderDQRulesPanel();
    }

    // Navigation and view functions
    // Mobile nav toggle
    function toggleMobileNav() {
      const nav = document.querySelector(".top-nav");
      if (nav) nav.classList.toggle("mobile-open");
      const btn = document.querySelector(".hamburger-btn");
      if (btn) btn.textContent = nav.classList.contains("mobile-open") ? "\u2715" : "\u2630";
    }

    function showView(viewId) {
      // Hide all views
      // Close mobile nav when switching views
      const mobileNav = document.querySelector(".top-nav.mobile-open");
      if (mobileNav) { mobileNav.classList.remove("mobile-open"); const hb = document.querySelector(".hamburger-btn"); if (hb) hb.textContent = "\u2630"; }
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

      // Show selected view
      const view = document.getElementById(viewId);
      if (view) {
        view.classList.add('active');
      }

      const navTab = document.getElementById('nav_' + viewId);
      if (navTab) {
        navTab.classList.add('active');
      }

      // Trigger view-specific init
      if (window.onViewChanged) window.onViewChanged(viewId);
    }

    function closePanel() {
      document.getElementById('panelOverlay').classList.remove('active');
    }

    function openDQModal(propId) {
      document.getElementById('dqModal').classList.add('active');
      if (window.currentPropForDQ) window.currentPropForDQ = propId;
    }

    function closeDQModal() {
      document.getElementById('dqModal').classList.remove('active');
    }

    function submitDQ() {
      if (window.handleDQSubmit) window.handleDQSubmit();
      closeDQModal();
    }

    function openBuyBoxModal() {
      document.getElementById('buyBoxModal').classList.remove('active');
      document.getElementById('bbName').value = '';
      document.getElementById('bbCity').value = '';
      document.getElementById('bbState').value = '';
      document.getElementById('bbZip').value = '';
      document.getElementById('bbPriceMin').value = '';
      document.getElementById('bbPriceMax').value = '';
      document.getElementById('bbBedsMin').value = '';
      document.getElementById('bbBedsMax').value = '';
      document.getElementById('bbMaxHoa').value = '';
      document.getElementById('bbLat').value = '';
      document.getElementById('bbLng').value = '';
      document.getElementById('bbTags').value = '';
      document.getElementById('buyBoxModal').classList.add('active');
    }

    function closeBuyBoxModal() {
      document.getElementById('buyBoxModal').classList.remove('active');
    }

    function handleSaveBuyBox() {
      if (window.saveBuyBoxFromModal) window.saveBuyBoxFromModal();
      closeBuyBoxModal();
    }

    function refreshData() {
      if (window.refreshAllData) window.refreshAllData();
    }

    function logout() {
      if (window.performLogout) window.performLogout();
    }

    // Boot on page load
    function shareDeal(propId) {
      const url = `${window.location.origin}${window.location.pathname}#deal=${encodeURIComponent(propId)}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('Deal link copied! Share this with your client.');
      }).catch(() => {
        prompt('Copy this link:', url);
      });
    }

    function bootDealView(dealId) {
      const appRoot = document.getElementById('appRoot');
      appRoot.classList.add('active');

      // Find property across all search groups (APP.props is { searchId: [props] })
      let prop = null;
      const allPropsFlat = Object.values(APP.props).flat();
      prop = allPropsFlat.find(p => p.id === dealId);

      if (!prop) {
        appRoot.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f5f5;font-family:'DM Sans',sans-serif">
            <div style="text-align:center;padding:40px">
              <img src="https://bnbaccelerator.com/wp-content/uploads/2025/03/BNB_Accelerator_logo-150x77.png" alt="BNB" style="height:50px;margin-bottom:20px"
                   onerror="this.outerHTML='<div style=\\'font-size:28px;font-weight:700;color:#c9a227\\'>BNB Accelerator</div>'">
              <h2 style="color:#0D1117;margin-bottom:10px">Deal Not Found</h2>
              <p style="color:#666;font-size:14px">This deal link may have expired or the property data is no longer available.</p>
              <a href="${window.location.pathname}" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#238636;color:white;border-radius:6px;text-decoration:none;font-weight:500">Go to Dashboard</a>
            </div>
          </div>`;
        return;
      }

      const a = APP.analyses[dealId];
      const tier = a ? a.better : (prop.prelim ? prop.prelim.prelim_tier : null);
      const comply = typeof getCompliance === 'function' ? getCompliance(prop.state) : null;
      const search = APP.searches.find(s => s.id === prop.searchId);

      const photoUrl = prop.photo || 'https://via.placeholder.com/800x400?text=Property+Photo';
      const cocVal = tier ? tier.coc : (prop.prelim ? prop.prelim.prelim_coc : null);
      const revVal = tier ? tier.revenue : (prop.prelim ? prop.prelim.prelim_revenue : null);
      const isEstimate = !a && !!prop.prelim;
      const est = isEstimate ? ' (est.)' : '';

      let metricsHtml = '';
      if (tier) {
        const metricItems = [
          ['List Price', fm(prop.listPrice), '#0D1117'],
          ['Annual Revenue' + est, fm(tier.revenue || revVal), '#238636'],
          ['Cash on Cash' + est, fpc(tier.coc || cocVal), (tier.coc || cocVal) >= 10 ? '#238636' : (tier.coc || cocVal) >= 7 ? '#ffa500' : '#c41e3a'],
          ['Monthly Cash Flow' + est, fm(tier.ncfMo), tier.ncfMo >= 0 ? '#238636' : '#c41e3a'],
          ['Total Cash Needed', fm(tier.totalCash), '#0D1117'],
          ['Year 1 ROI' + est, fpc(tier.roi), '#c9a227'],
        ];
        metricsHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px">' +
          metricItems.map(([label, val, color]) =>
            '<div style="background:#f9f9f9;padding:16px;border-radius:8px;text-align:center">' +
              '<div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + label + '</div>' +
              '<div style="font-size:22px;font-weight:700;color:' + color + '">' + val + '</div>' +
            '</div>'
          ).join('') +
          '</div>';
      }

      let investHtml = '';
      if (tier) {
        const rows = [
          ['Down Payment (10%)', fm(tier.down)],
          ['Closing Costs (3%)', fm(tier.cc)],
          ['Enhancement Budget', fm(tier.amenCost || 0)],
          ['<strong>Total Cash to Close</strong>', '<strong>' + fm(tier.totalCash) + '</strong>'],
          ['---', '---'],
          ['Gross Monthly Income', fm(tier.gmiMo)],
          ['Fixed Expenses / mo', '-' + fm(tier.fixedTotal)],
          ['Variable Expenses / mo', '-' + fm(tier.variableTotal)],
          ['<strong>Net Monthly Cash Flow</strong>', '<strong style="color:' + (tier.ncfMo >= 0 ? '#238636' : '#c41e3a') + '">' + fm(tier.ncfMo) + '</strong>'],
          ['---', '---'],
          ['Net Annual Cash Flow', fm(tier.ncfYr)],
          ['Year 1 Tax Savings (bonus dep.)', fm(tier.taxSav)],
          ['<strong>Year 1 Total Return</strong>', '<strong style="color:#238636">' + fm(tier.yr1) + '</strong>'],
        ];
        investHtml = '<div style="background:#f9f9f9;padding:20px;border-radius:8px;margin-bottom:30px">' +
          '<h3 style="font-size:18px;margin:0 0 15px;color:#0D1117">Investment Summary</h3>' +
          rows.map(([k, v]) => {
            if (k === '---') return '<div style="border-top:1px solid #e0e0e0;margin:8px 0"></div>';
            return '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px">' +
              '<span style="color:#666">' + k + '</span>' +
              '<span style="color:#0D1117">' + v + '</span></div>';
          }).join('') +
          '</div>';
      }

      let revenueHtml = '';
      if (tier) {
        revenueHtml = '<div style="background:#f9f9f9;padding:20px;border-radius:8px;margin-bottom:30px">' +
          '<h3 style="font-size:18px;margin:0 0 15px;color:#0D1117">Revenue Projections</h3>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">' +
            '<div><div style="font-size:11px;color:#999;text-transform:uppercase">Avg Nightly Rate</div><div style="font-size:18px;font-weight:600;color:#0D1117">' + fm(tier.adr) + '</div></div>' +
            '<div><div style="font-size:11px;color:#999;text-transform:uppercase">Occupancy</div><div style="font-size:18px;font-weight:600;color:#0D1117">' + fp(tier.occ) + '</div></div>' +
            '<div><div style="font-size:11px;color:#999;text-transform:uppercase">Gross Annual Revenue</div><div style="font-size:18px;font-weight:600;color:#238636">' + fm(tier.garYr) + '</div></div>' +
          '</div></div>';
      }

      let complianceHtml = '';
      if (comply) {
        complianceHtml = '<div style="background:#f9f9f9;padding:20px;border-radius:8px;margin-bottom:30px">' +
          '<h3 style="font-size:18px;margin:0 0 15px;color:#0D1117">STR Compliance - ' + prop.state + '</h3>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
            '<span style="font-size:20px">' + comply.icon + '</span>' +
            '<span style="font-weight:600;font-size:14px">' + comply.label + '</span>' +
          '</div>' +
          '<p style="margin:0;color:#666;font-size:13px;line-height:1.6">' + comply.note + '</p>' +
          (comply.reqs ? '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">' + comply.reqs.map(r => '<span style="display:inline-block;padding:3px 8px;background:#e8e8e8;border-radius:4px;font-size:11px;color:#555">' + r + '</span>').join('') + '</div>' : '') +
          '</div>';
      }

      appRoot.innerHTML = `
        <div style="background:#f5f5f5;min-height:100vh;font-family:'DM Sans',sans-serif">
          <div style="background:#0D1117;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:12px">
              <img src="https://bnbaccelerator.com/wp-content/uploads/2025/03/BNB_Accelerator_logo-150x77.png" alt="BNB" style="height:30px;filter:brightness(10)"
                   onerror="this.outerHTML='<span style=\\'font-weight:700;font-size:15px;color:#c9a227\\'>BNB Accelerator</span>'">
              <span style="color:rgba(255,255,255,.4);font-size:12px">|</span>
              <span style="color:rgba(255,255,255,.6);font-size:13px">Deal Summary</span>
            </div>
          </div>
          <div style="max-width:900px;margin:0 auto;padding:30px 20px">
            <div style="margin-bottom:30px">
              <img src="${photoUrl}" alt="Property" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px"
                   onerror="this.style.display='none'">
            </div>
            <div style="background:white;padding:24px;border-radius:8px;margin-bottom:30px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
              <h1 style="font-size:24px;margin:0 0 6px;color:#0D1117">${prop.address}</h1>
              <p style="color:#666;margin:0 0 12px;font-size:14px">${prop.city}, ${prop.state} ${prop.zip}</p>
              <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;color:#555">
                <span>${prop.beds} bd</span>
                <span>${prop.baths} ba</span>
                <span>${prop.sqft ? prop.sqft.toLocaleString() : '?'} sqft</span>
                ${prop.yearBuilt ? '<span>Built ' + prop.yearBuilt + '</span>' : ''}
                ${prop.dom ? '<span>' + prop.dom + ' days on market</span>' : ''}
              </div>
            </div>
            ${metricsHtml}
            ${investHtml}
            ${revenueHtml}
            ${complianceHtml}
            ${isEstimate ? '<div style="background:#fff3cd;padding:12px 16px;border-radius:6px;margin-bottom:30px;font-size:12px;color:#856404;border:1px solid #ffc107">These are preliminary estimates based on market benchmarks. Contact your BNB Accelerator advisor for confirmed AirROI analysis.</div>' : ''}
            <div style="text-align:center;padding-top:30px;border-top:1px solid #e0e0e0;color:#999;font-size:12px">
              <p>Prepared by BNB Accelerator &middot; Deal Underwriting Platform</p>
              <p style="margin-top:4px">For questions, contact your investment advisor.</p>
            </div>
          </div>
        </div>`;
    }


    document.addEventListener("DOMContentLoaded", () => {
      // Check for shareable deal link
      const hash = window.location.hash;
      if (hash.startsWith('#deal=')) {
        const dealId = decodeURIComponent(hash.slice(6));
        bootDealView(dealId);
      } else {
        bootApp();
      }
    });
  