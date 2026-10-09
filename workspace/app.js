import { calculateDeal } from './model.js';

const KEY = 'bnb-str-workspace-v1';
const defaults = [
  {name: 'Conservative', occupancyPct: 45, adr: 240},
  {name: 'Base', occupancyPct: 60, adr: 275},
  {name: 'Upside', occupancyPct: 72, adr: 310}
];
const form = document.querySelector('#dealForm');
const scenariosEl = document.querySelector('#scenarios');
const statusEl = document.querySelector('#status');
const currency = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
const percent = value => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
const money = value => currency.format(value);

function readInputs() {
  const values = Object.fromEntries(new FormData(form).entries());
  for (const input of form.querySelectorAll('input[type=number]')) values[input.name] = Number(input.value);
  return values;
}
function readScenarios() {
  return [...scenariosEl.querySelectorAll('.scenario')].map((card, index) => ({
    name: defaults[index].name,
    occupancyPct: Number(card.querySelector('[data-field=occupancyPct]').value),
    adr: Number(card.querySelector('[data-field=adr]').value)
  }));
}
function report() {
  const deal = readInputs();
  const scenarios = readScenarios().map(s => ({...s, metrics: calculateDeal({...deal, ...s})}));
  return {version: 1, createdAt: new Date().toISOString(), deal, scenarios};
}
function line(label, value, className = '') {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = value;
  if (className) dd.className = className;
  row.append(dt, dd);
  return row;
}
function render() {
  const deal = readInputs();
  [...scenariosEl.querySelectorAll('.scenario')].forEach(card => {
    const s = {
      occupancyPct: Number(card.querySelector('[data-field=occupancyPct]').value),
      adr: Number(card.querySelector('[data-field=adr]').value)
    };
    const m = calculateDeal({...deal, ...s});
    const dl = card.querySelector('dl');
    dl.replaceChildren(
      line('Annual gross revenue', money(m.gross)),
      line('Operating expenses', money(m.variable + m.fixed)),
      line('Net operating income', money(m.noi)),
      line('Annual loan payments', money(m.annualDebt)),
      line('Annual cash flow', money(m.cashFlow), m.cashFlow < 0 ? 'negative highlight' : 'highlight'),
      line('Cash required', money(m.cashNeeded)),
      line('Cash on cash return', percent(m.coc), m.coc < 0 ? 'negative' : ''),
      line('Cap rate', percent(m.capRate)),
      line('Break even occupancy', m.breakEven === null ? '—' : percent(m.breakEven))
    );
  });
}
function buildScenarios(items = defaults) {
  scenariosEl.replaceChildren();
  items.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'scenario';
    const heading = document.createElement('h3');
    heading.textContent = defaults[index].name;
    const fields = document.createElement('div');
    fields.className = 'scenario-inputs';
    for (const [field, label, max] of [['occupancyPct', 'Occupancy %', 100], ['adr', 'Nightly rate $', 100000]]) {
      const wrap = document.createElement('label');
      wrap.textContent = label;
      const input = document.createElement('input');
      Object.assign(input, {type: 'number', min: '0', max: String(max), step: '1', required: true, value: String(item[field] ?? defaults[index][field])});
      input.dataset.field = field;
      input.addEventListener('input', render);
      wrap.append(input);
      fields.append(wrap);
    }
    const dl = document.createElement('dl');
    card.append(heading, fields, dl);
    scenariosEl.append(card);
  });
  render();
}
function setStatus(message) { statusEl.textContent = message; }
function valid() {
  return form.reportValidity() && [...scenariosEl.querySelectorAll('input')].every(input => input.reportValidity());
}
function restore(data) {
  if (!data || data.version !== 1 || !data.deal || !Array.isArray(data.scenarios) || data.scenarios.length !== 3) return false;
  for (const input of form.querySelectorAll('input')) {
    if (Object.hasOwn(data.deal, input.name)) input.value = data.deal[input.name];
  }
  buildScenarios(data.scenarios);
  return true;
}

form.addEventListener('input', render);
form.addEventListener('submit', event => event.preventDefault());
document.querySelector('#saveBtn').addEventListener('click', () => {
  if (!valid()) return;
  localStorage.setItem(KEY, JSON.stringify(report()));
  setStatus('Saved in this browser.');
});
document.querySelector('#exportBtn').addEventListener('click', () => {
  if (!valid()) return;
  const data = JSON.stringify(report(), null, 2);
  const url = URL.createObjectURL(new Blob([data], {type: 'application/json'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'str-deal-report.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus('Report exported.');
});
document.querySelector('#printBtn').addEventListener('click', () => {
  if (!valid()) return;
  window.print();
});
document.querySelector('#resetBtn').addEventListener('click', () => {
  form.reset();
  buildScenarios();
  localStorage.removeItem(KEY);
  setStatus('Workspace reset.');
});

try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (!restore(saved)) buildScenarios();
} catch {
  buildScenarios();
}
