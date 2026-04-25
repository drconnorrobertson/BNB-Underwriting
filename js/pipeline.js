'use strict';

// ── DEAL PIPELINE (KANBAN) + NOTES + SCORING ──────────────────────────────────

if (!APP.pipeline) APP.pipeline = JSON.parse(localStorage.getItem('bnb_pipe') || '{}');

const PIPELINE_STAGES = [
  { id: 'new', label: 'New', icon: '🆕', color: 'var(--bl)' },
  { id: 'screening', label: 'Screening', icon: '🔍', color: 'var(--am)' },
  { id: 'analyzed', label: 'Analyzed', icon: '📊', color: 'var(--gold)' },
  { id: 'under_contract', label: 'Under Contract', icon: '📝', color: 'var(--pu)' },
  { id: 'closed', label: 'Closed', icon: '✅', color: 'var(--gr)' },
  { id: 'dqd', label: "DQ'd", icon: '❌', color: 'var(--rd)' },
];

function savePipeline() {
  localStorage.setItem('bnb_pipe', JSON.stringify(APP.pipeline));
}

function getPipelineStage(propId) {
  return APP.pipeline[propId]?.stage || null;
}

function setPipelineStage(propId, stage) {
  if (!APP.pipeline[propId]) {
    APP.pipeline[propId] = { stage: stage, movedAt: Date.now(), notes: [], score: null };
  } else {
    APP.pipeline[propId].stage = stage;
    APP.pipeline[propId].movedAt = Date.now();
  }
  savePipeline();
}

function ensureInPipeline(propId) {
  if (!APP.pipeline[propId]) {
    APP.pipeline[propId] = { stage: 'new', movedAt: Date.now(), notes: [], score: null };
    savePipeline();
  }
}

// ── DEAL SCORING (1-100) ──────────────────────────────────────────────────────
function scoreDeal(prop) {
  let score = 0;
  const coc = prop.coc || prop.prelim?.prelim_coc || 0;
  const rev = prop.rev || prop.prelim?.prelim_revenue || 0;

  // CoC return: 40% weight (10%+ = 40pts, linear scale)
  score += Math.min(40, Math.max(0, (coc / 15) * 40));

  // Price per bed: 15% weight (lower is better)
  const ppb = prop.beds > 0 ? prop.listPrice / prop.beds : 999999;
  if (ppb <= 60000) score += 15;
  else if (ppb <= 100000) score += 12;
  else if (ppb <= 150000) score += 8;
  else if (ppb <= 200000) score += 4;

  // Market strength: 15% weight
  const stateRev = MARKET_REV_PER_BED[prop.state?.toUpperCase()] || [10000, .55, 250];
  const marketScore = Math.min(15, (stateRev[0] / 14000) * 15);
  score += marketScore;

  // Property age: 10% weight (newer = better, but also value old for negotiation)
  if (prop.yearBuilt) {
    const age = new Date().getFullYear() - prop.yearBuilt;
    if (age <= 5) score += 10;
    else if (age <= 15) score += 8;
    else if (age <= 30) score += 5;
    else score += 3;
  } else {
    score += 5; // unknown age, neutral
  }

  // Days on market: 10% weight (longer = better for negotiation)
  const dom = prop.dom || 0;
  if (dom >= 90) score += 10;
  else if (dom >= 60) score += 8;
  else if (dom >= 30) score += 6;
  else if (dom >= 14) score += 4;
  else score += 2;

  // Beds count: 10% weight (more = more revenue)
  if (prop.beds >= 6) score += 10;
  else if (prop.beds >= 5) score += 8;
  else if (prop.beds >= 4) score += 6;
  else if (prop.beds >= 3) score += 4;
  else score += 2;

  return Math.round(Math.min(100, Math.max(1, score)));
}

function renderScoreBadge(score) {
  if (!score) return '';
  const color = score >= 80 ? 'var(--gr)' : score >= 60 ? 'var(--gold)' : score >= 40 ? 'var(--am)' : 'var(--rd)';
  const bg = score >= 80 ? 'var(--grbg)' : score >= 60 ? 'var(--gbg)' : score >= 40 ? 'var(--ambg)' : 'var(--rdbg)';
  return `<span class="score-badge" style="background:${bg};color:${color};border:1px solid ${color}">${score}</span>`;
}

// ── KANBAN BOARD ──────────────────────────────────────────────────────────────
function renderKanban() {
  const el = G('kanbanBoard');
  if (!el) return;

  const allProps = getAllProps();

  // Auto-add analyzed properties to pipeline
  allProps.forEach(p => {
    if (p.analysis && !APP.pipeline[p.id]) {
      APP.pipeline[p.id] = { stage: 'analyzed', movedAt: Date.now(), notes: [], score: scoreDeal(p) };
    }
  });

  // Stats bar
  let statsHtml = '<div class="pipe-stats">';
  const pipeProps = Object.entries(APP.pipeline);
  const interests = typeof getAllInterests === 'function' ? getAllInterests() : [];
  statsHtml += `<div class="pipe-stat"><div class="ps-val">${pipeProps.length}</div><div class="ps-key">In Pipeline</div></div>`;
  PIPELINE_STAGES.forEach(s => {
    const count = pipeProps.filter(([_, d]) => d.stage === s.id).length;
    statsHtml += `<div class="pipe-stat"><div class="ps-val" style="color:${s.color}">${count}</div><div class="ps-key">${s.label}</div></div>`;
  });
  if (interests.length > 0) {
    statsHtml += `<div class="pipe-stat"><div class="ps-val" style="color:var(--rd)">❤️ ${interests.length}</div><div class="ps-key">Client Interest</div></div>`;
  }
  statsHtml += '</div>';

  // Kanban columns
  let html = statsHtml + '<div class="kanban">';
  PIPELINE_STAGES.forEach(stage => {
    const stageProps = pipeProps
      .filter(([_, d]) => d.stage === stage.id)
      .map(([pid, data]) => {
        const prop = allProps.find(p => p.id === pid);
        return prop ? { ...prop, pipeData: data } : null;
      })
      .filter(Boolean);

    html += `<div class="kanban-col" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleDrop(event,'${stage.id}');this.classList.remove('drag-over')">
      <div class="kc-header" style="border-top:3px solid ${stage.color}">
        <span>${stage.icon} ${stage.label}</span>
        <span class="kc-count">${stageProps.length}</span>
      </div>
      <div class="kc-cards">`;

    stageProps.forEach(p => {
      const score = p.pipeData.score || scoreDeal(p);
      const propInterests = typeof getInterestsForProp === 'function' ? getInterestsForProp(p.id) : [];
      const interestBadge = typeof renderInterestBadge === 'function' ? renderInterestBadge(p.id) : '';
      const stageIdx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
      const canMoveBack = stageIdx > 0;
      const canMoveFwd = stageIdx < PIPELINE_STAGES.length - 1;

      html += `<div class="kc-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${p.id}')" onclick="openPropPanel('${p.id}')">
        <div class="kc-card-top">
          ${p.photo ? `<img class="kc-thumb" src="${p.photo}" loading="lazy" onerror="this.style.display='none'"/>` : ''}
          <div class="kc-card-info">
            <div class="kc-addr">${p.address}</div>
            <div class="kc-loc">${p.city}, ${p.state}</div>
          </div>
          ${renderScoreBadge(score)}
        </div>
        <div class="kc-card-metrics">
          <span>${fm(p.listPrice)}</span>
          <span style="color:${p.coc >= 10 ? 'var(--gr)' : p.coc >= 7 ? 'var(--am)' : 'var(--rd)'}">${p.coc ? fpc(p.coc) + ' CoC' : '--'}</span>
        </div>
        ${interestBadge}
        ${propInterests.length > 0 ? `<div class="kc-interest-names">${propInterests.map(i => i.clientName).join(', ')} interested</div>` : ''}
        <div class="kc-card-actions" onclick="event.stopPropagation()">
          ${canMoveBack ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();movePipelineStage('${p.id}',-1)">← Back</button>` : ''}
          ${canMoveFwd ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();movePipelineStage('${p.id}',1)">Fwd →</button>` : ''}
        </div>
        <div class="kc-card-date">${timeAgo(p.pipeData.movedAt)}</div>
      </div>`;
    });

    html += `</div></div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

function handleDrop(event, stageId) {
  event.preventDefault();
  const propId = event.dataTransfer.getData('text/plain');
  if (!propId) return;
  setPipelineStage(propId, stageId);
  renderKanban();
}

function movePipelineStage(propId, direction) {
  const current = getPipelineStage(propId) || 'new';
  const idx = PIPELINE_STAGES.findIndex(s => s.id === current);
  const newIdx = Math.max(0, Math.min(PIPELINE_STAGES.length - 1, idx + direction));
  setPipelineStage(propId, PIPELINE_STAGES[newIdx].id);
  renderKanban();
}

// ── NOTES ─────────────────────────────────────────────────────────────────────
function addNote(propId, text) {
  if (!text?.trim()) return;
  ensureInPipeline(propId);
  if (!APP.pipeline[propId].notes) APP.pipeline[propId].notes = [];
  APP.pipeline[propId].notes.push({
    id: 'n_' + Date.now(),
    text: text.trim(),
    timestamp: Date.now(),
  });
  savePipeline();
}

function deleteNote(propId, noteId) {
  if (!APP.pipeline[propId]?.notes) return;
  APP.pipeline[propId].notes = APP.pipeline[propId].notes.filter(n => n.id !== noteId);
  savePipeline();
}

function renderNotesSection(propId) {
  ensureInPipeline(propId);
  const notes = APP.pipeline[propId]?.notes || [];
  let html = `<div class="pf-section">
    <div class="pf-section-title">📝 NOTES</div>
    <div style="padding:12px 20px">
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <input id="noteInput_${propId}" class="fi" style="flex:1" placeholder="Add a note..." onkeydown="if(event.key==='Enter'){addNote('${propId}',this.value);this.value='';renderNotesInPanel('${propId}');}"/>
        <button class="btn btn-out btn-sm" onclick="addNote('${propId}',G('noteInput_${propId}').value);G('noteInput_${propId}').value='';renderNotesInPanel('${propId}');">Add</button>
      </div>
      <div id="notesList_${propId}">`;
  if (notes.length === 0) {
    html += '<div style="font-size:11px;color:var(--tx4)">No notes yet.</div>';
  } else {
    notes.slice().reverse().forEach(n => {
      html += `<div class="note-item">
        <div class="note-text">${escH(n.text)}</div>
        <div class="note-meta">
          <span>${timeAgo(n.timestamp)}</span>
          <button class="btn btn-ghost btn-sm" onclick="deleteNote('${propId}','${n.id}');renderNotesInPanel('${propId}')">✕</button>
        </div>
      </div>`;
    });
  }
  html += '</div></div></div>';
  return html;
}

function renderNotesInPanel(propId) {
  const el = G('notesList_' + propId);
  if (!el) return;
  const notes = APP.pipeline[propId]?.notes || [];
  if (!notes.length) { el.innerHTML = '<div style="font-size:11px;color:var(--tx4)">No notes yet.</div>'; return; }
  el.innerHTML = notes.slice().reverse().map(n => `<div class="note-item">
    <div class="note-text">${escH(n.text)}</div>
    <div class="note-meta"><span>${timeAgo(n.timestamp)}</span><button class="btn btn-ghost btn-sm" onclick="deleteNote('${propId}','${n.id}');renderNotesInPanel('${propId}')">✕</button></div>
  </div>`).join('');
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(ts).toLocaleDateString();
}

function escH(s) { if (typeof s !== 'string') return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
