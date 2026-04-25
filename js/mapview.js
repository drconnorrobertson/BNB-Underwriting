'use strict';

// ── MAP VIEW (Leaflet.js + OpenStreetMap) ─────────────────────────────────────
let MAP_INSTANCE = null;
let MAP_MARKERS = [];

function initMap() {
  const container = G('mapContainer');
  if (!container || MAP_INSTANCE) return;

  MAP_INSTANCE = L.map('mapContainer').setView([37.0, -95.7], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(MAP_INSTANCE);

  renderMapMarkers();
}

function renderMapMarkers() {
  if (!MAP_INSTANCE) return;

  // Clear existing
  MAP_MARKERS.forEach(m => MAP_INSTANCE.removeLayer(m));
  MAP_MARKERS = [];

  const allProps = getAllProps();
  const bounds = [];

  allProps.forEach(prop => {
    if (!prop.lat || !prop.lng) return;

    // Color by status
    let color = '#9CA3AF'; // gray default
    if (prop.status === 'good') color = '#0A7B52';
    else if (prop.status === 'needs-offer' || prop.status === 'prelim') color = '#B45309';
    else if (prop.status === 'dq' || prop.autoDQ) color = '#C42B2B';

    const icon = L.divIcon({
      className: 'map-marker-icon',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker([prop.lat, prop.lng], { icon: icon });
    const cocStr = prop.coc ? fpc(prop.coc) : 'N/A';
    const popup = `<div style="font-family:'DM Sans',sans-serif;min-width:200px">
      <div style="font-weight:600;font-size:13px;margin-bottom:4px">${prop.address}</div>
      <div style="font-size:11px;color:#6B7280;margin-bottom:6px">${prop.city}, ${prop.state} ${prop.zip}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;margin-bottom:8px">
        <div><strong>${fm(prop.listPrice)}</strong> price</div>
        <div><strong>${prop.beds}</strong>bd / <strong>${prop.baths}</strong>ba</div>
        <div>CoC: <strong style="color:${prop.coc >= 10 ? '#0A7B52' : prop.coc >= 7 ? '#B45309' : '#C42B2B'}">${cocStr}</strong></div>
        <div>${prop.rev ? fm(prop.rev) + '/yr' : '--'}</div>
      </div>
      <a href="#" onclick="closeMapPopups();openPropPanel('${prop.id}');return false" style="color:#B8821E;font-size:11px;font-weight:600">View Details →</a>
    </div>`;

    marker.bindPopup(popup);
    marker.addTo(MAP_INSTANCE);
    MAP_MARKERS.push(marker);
    bounds.push([prop.lat, prop.lng]);
  });

  if (bounds.length > 0) {
    MAP_INSTANCE.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
  }
}

function closeMapPopups() {
  if (MAP_INSTANCE) MAP_INSTANCE.closePopup();
}

function refreshMap() {
  if (MAP_INSTANCE) {
    renderMapMarkers();
    MAP_INSTANCE.invalidateSize();
  }
}
