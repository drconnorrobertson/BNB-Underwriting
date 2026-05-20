'use strict';

// ══════════════════════════════════════════════════════════════════════
// WORKFLOW FEATURES - BNB Underwriting Team Enhancements
// ══════════════════════════════════════════════════════════════════════

// ── FEATURE 1: Sort by CoC as default ──────────────────────────────────────────
// Make "Best ROI" the default sort. Override APP defaults set in core.js.
APP.sortKey = 'coc';
APP.sortDir = 'desc';

// ── FIX 1: HAMBURGER MENU ──────────────────────────────────────────────────────
// The toggleMobileNav is defined in boot.js. We patch showView to also close
// the mobile menu, and ensure tapping a nav-tab closes the dropdown.
(function() {
  document.addEventListener('click', function(e) {
    // If user taps a nav-tab inside mobile-open nav, close the menu
    if (e.target.classList.contains('nav-tab') || e.target.closest('.nav-tab')) {
      var nav = document.querySelector('.top-nav.mobile-open');
      if (nav) {
        nav.classList.remove('mobile-open');
        var btn = document.querySelector('.hamburger-btn');
        if (btn) btn.textContent = '☰';
      }
    }
  });
})();

// ── FEATURE 2: BULK DQ ─────────────────────────────────────────────────────────
var BULK = { active: false, selected: [] };

function toggleSelectMode() {
  BULK.active = !BULK.active;
  BULK.selected = [];
  var btn = document.getElementById('selectModeBtn');
  if (btn) {
    btn.textContent = BULK.active ? '✕ Cancel Select' : '☑ Select Mode';
    if (BULK.active) { btn.classList.add('btn-primary'); btn.classList.remove('btn-secondary'); }
    else { btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary'); }
  }
  renderPropGrid();
  updateBulkBar();
}

function toggleBulkSelect(propId, e) {
  if (e) e.stopPropagation();
  var idx = BULK.selected.indexOf(propId);
  if (idx >= 0) BULK.selected.splice(idx, 1);
  else BULK.selected.push(propId);
  updateBulkBar();
  var cb = document.getElementById('bcb_' + propId);
  if (cb) cb.checked = BULK.selected.indexOf(propId) >= 0;
}

function updateBulkBar() {
  var existing = document.getElementById('bulkBar');
  if (!BULK.active || BULK.selected.length === 0) {
    if (existing) existing.remove();
    return;
  }
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'bulkBar';
    existing.className = 'bulk-bar';
    document.body.appendChild(existing);
  }
  existing.innerHTML = '<span><strong>' + BULK.selected.length + '</strong> selected</span>' +
    '<button class="btn btn-danger" onclick="bulkDQ()">DQ All</button>' +
    '<button class="btn btn-secondary" onclick="toggleSelectMode()">Cancel</button>';
}

function bulkDQ() {
  var reason = prompt('DQ reason for all ' + BULK.selected.length + ' properties:', 'Price Too High');
  if (!reason) return;
  BULK.selected.forEach(function(propId) {
    var prop = getAllProps().find(function(p) { return p.id === propId; });
    if (!prop) return;
    var exists = APP.dqLog.findIndex(function(d) { return d.propId === propId; });
    var entry = {
      propId: propId, address: prop.address, city: prop.city, state: prop.state,
      askPrice: prop.listPrice, coc: prop.coc || 0, viablePrice: null,
      reason: reason, agentName: '', agentEmail: '', agentPhone: '',
      memoSent: false, date: Date.now()
    };
    if (exists >= 0) APP.dqLog[exists] = entry;
    else APP.dqLog.push(entry);
    var si = prop.searchId;
    var pi = (APP.props[si] || []).findIndex(function(p) { return p.id === propId; });
    if (pi >= 0) APP.props[si][pi].dqd = true;
  });
  save();
  toggleSelectMode();
  renderPropGrid();
  updateNavCounts();
}

// ── FEATURE 3: MARKET SUMMARY DASHBOARD ────────────────────────────────────────
function renderMarketSummary() {
  var container = document.getElementById('marketSummary');
  if (!container) return;
  var all = getAllProps();
  var markets = {};
  all.forEach(function(p) {
    var s = APP.searches.find(function(x) { return x.id === p.searchId; });
    var name = s ? s.name : p.searchId;
    if (!markets[p.searchId]) markets[p.searchId] = { name: name, id: p.searchId, count: 0, totalCoc: 0, cocCount: 0, good: 0, offer: 0 };
    var m = markets[p.searchId];
    m.count++;
    if (p.coc != null && p.coc > 0) { m.totalCoc += p.coc; m.cocCount++; }
    if (p.status === 'good') m.good++;
    if (p.status === 'needs-offer') m.offer++;
  });
  var list = Object.values(markets).sort(function(a, b) { return b.good - a.good || b.offer - a.offer; });
  if (list.length === 0) { container.innerHTML = ''; return; }
  var html = '<div class="market-summary-row">';
  html += '<div class="mkt-card' + (!APP.filterSearchId ? ' active' : '') + '" onclick="APP.filterSearchId=null;renderPropGrid();">';
  html += '<div class="mkt-card-name">All Markets</div>';
  html += '<div class="mkt-card-stats"><span><strong>' + all.length + '</strong> props</span></div>';
  html += '</div>';
  list.forEach(function(m) {
    var avgCoc = m.cocCount > 0 ? (m.totalCoc / m.cocCount).toFixed(1) : '--';
    var isActive = APP.filterSearchId === m.id;
    html += '<div class="mkt-card' + (isActive ? ' active' : '') + '" onclick="APP.filterSearchId=\'' + m.id + '\';renderPropGrid();">';
    html += '<div class="mkt-card-name">' + m.name + '</div>';
    html += '<div class="mkt-card-stats">';
    html += '<span><strong>' + m.count + '</strong> props</span>';
    html += '<span>CoC: <strong>' + avgCoc + '%</strong></span>';
    if (m.good > 0) html += '<span style="color:var(--gr)"><strong>' + m.good + '</strong> good</span>';
    if (m.offer > 0) html += '<span style="color:var(--am)"><strong>' + m.offer + '</strong> offer</span>';
    html += '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

// ── FEATURE 4: NOTES ICON ──────────────────────────────────────────────────────
function hasNotes(propId) {
  try { return !!localStorage.getItem('bnb_note_' + propId); } catch(e) { return false; }
}

// ── FEATURE 5: LAST VIEWED TIMESTAMP ───────────────────────────────────────────
function recordView(propId) {
  try { localStorage.setItem('bnb_viewed_' + propId, Date.now().toString()); } catch(e) {}
}

function getViewedAgo(propId) {
  try {
    var ts = localStorage.getItem('bnb_viewed_' + propId);
    if (!ts) return null;
    var diff = Date.now() - parseInt(ts);
    var mins = Math.floor(diff / 60000);
    if (mins < 60) return 'Viewed ' + mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return 'Viewed ' + hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    if (days === 1) return 'Viewed yesterday';
    return 'Viewed ' + days + 'd ago';
  } catch(e) { return null; }
}

// ── FEATURE 6: NEW BADGE ───────────────────────────────────────────────────────
function isNewListing(prop) {
  var fetchedAt = prop.fetchedAt || 0;
  var diff = Date.now() - fetchedAt;
  return diff < 48 * 60 * 60 * 1000;
}

// ══════════════════════════════════════════════════════════════════════
// MONKEY-PATCH: Override propCardHTML to inject new features into cards
// ══════════════════════════════════════════════════════════════════════
var _origPropCardHTML = propCardHTML;
propCardHTML = function(p) {
  var html = _origPropCardHTML(p);

  // Inject bulk checkbox if select mode active
  if (BULK.active) {
    var checked = BULK.selected.indexOf(p.id) >= 0 ? ' checked' : '';
    var checkbox = '<input type="checkbox" class="pcard-checkbox" id="bcb_' + p.id + '"' + checked + ' onclick="toggleBulkSelect(\'' + p.id + '\', event)"/>';
    html = html.replace(/<div class="pcard-body">/, checkbox + '<div class="pcard-body">');
  }

  // Inject notes icon if property has notes
  if (hasNotes(p.id)) {
    html = html.replace(/<div class="pcard-body">/, '<div class="pcard-notes-icon" title="Has notes">📝</div><div class="pcard-body">');
  }

  // Inject NEW badge after the address line
  if (isNewListing(p)) {
    html = html.replace(/<\/div>\s*<span class="status-chip/, '<span class="pcard-new-badge">NEW</span></div><span class="status-chip');
  }

  // Inject "Viewed X ago" into footer
  var viewed = getViewedAgo(p.id);
  if (viewed) {
    html = html.replace(/onclick="event\.stopPropagation\(\)">\s*<button/, 'onclick="event.stopPropagation()"><span class="pcard-viewed">' + viewed + '</span><button');
  }

  return html;
};

// ══════════════════════════════════════════════════════════════════════
// MONKEY-PATCH: Override renderPropGrid to add market summary + select btn
// ══════════════════════════════════════════════════════════════════════
var _origRenderPropGrid = renderPropGrid;
renderPropGrid = function() {
  _origRenderPropGrid();
  renderMarketSummary();
};

// ══════════════════════════════════════════════════════════════════════
// MONKEY-PATCH: Override openPropPanel to record last-viewed timestamp
// ══════════════════════════════════════════════════════════════════════
var _origOpenPropPanel = openPropPanel;
openPropPanel = function(propId) {
  recordView(propId);
  _origOpenPropPanel(propId);
};

// ══════════════════════════════════════════════════════════════════════
// INJECT: Add "Select Mode" button and Market Summary container into DOM
// after boot.js builds the layout
// ══════════════════════════════════════════════════════════════════════
(function injectWorkflowUI() {
  // Wait for boot.js to render
  function tryInject() {
    // Inject Select Mode button into toolbar
    var toolbar = document.querySelector('.toolbar');
    if (toolbar && !document.getElementById('selectModeBtn')) {
      var btn = document.createElement('button');
      btn.id = 'selectModeBtn';
      btn.className = 'btn btn-secondary';
      btn.textContent = '☑ Select Mode';
      btn.onclick = toggleSelectMode;
      btn.style.marginLeft = '8px';
      toolbar.appendChild(btn);
    }

    // Inject market summary container before propGrid
    var propGrid = document.getElementById('propGrid');
    if (propGrid && !document.getElementById('marketSummary')) {
      var mktDiv = document.createElement('div');
      mktDiv.id = 'marketSummary';
      propGrid.parentNode.insertBefore(mktDiv, propGrid);
    }

    // Update sort dropdown to have Best ROI first
    var sortBy = document.getElementById('sortBy');
    if (sortBy && sortBy.options.length > 0) {
      // Check if we already patched
      if (sortBy.options[0].value !== 'roi-desc') {
        // Move roi-desc to first position
        for (var i = 0; i < sortBy.options.length; i++) {
          if (sortBy.options[i].value === 'roi-desc') {
            var opt = sortBy.options[i];
            sortBy.removeChild(opt);
            opt.textContent = '★ Best ROI';
            opt.selected = true;
            sortBy.insertBefore(opt, sortBy.options[0]);
            break;
          }
        }
      }
    }
  }

  // Try immediately and also after a short delay (boot.js is DOMContentLoaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInject, 50); });
  } else {
    setTimeout(tryInject, 50);
  }
})();
