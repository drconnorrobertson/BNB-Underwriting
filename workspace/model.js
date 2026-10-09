// Pure underwriting calculations. All amounts are annual unless noted.
export function calculateDeal(input) {
  const n = (key) => Math.max(0, Number(input[key]) || 0);
  const price = n('price');
  const downPct = Math.min(100, n('downPct')) / 100;
  const rate = n('ratePct') / 100 / 12;
  const term = Math.max(1, n('termYears')) * 12;
  const nights = Math.min(365, n('availableNights') || 365);
  const occupancy = Math.min(100, n('occupancyPct')) / 100;
  const adr = n('adr');
  const gross = nights * occupancy * adr;
  const variable = gross * Math.min(100, n('variablePct')) / 100;
  const fixed = n('fixedExpenses');
  const cashNeeded = price * downPct + n('closingCosts') + n('startupCosts');
  const loan = price * (1 - downPct);
  const monthlyDebt = rate === 0 ? loan / term : loan * rate / (1 - Math.pow(1 + rate, -term));
  const annualDebt = monthlyDebt * 12;
  const noi = gross - variable - fixed;
  const cashFlow = noi - annualDebt;
  const netMargin = gross ? cashFlow / gross : 0;
  const coc = cashNeeded ? cashFlow / cashNeeded : 0;
  const capRate = price ? noi / price : 0;
  const breakEven = adr && nights && (1 - Math.min(100, n('variablePct')) / 100) > 0
    ? (fixed + annualDebt) / (adr * nights * (1 - Math.min(100, n('variablePct')) / 100))
    : null;
  return {gross, variable, fixed, noi, annualDebt, cashFlow, cashNeeded, loan, monthlyDebt, netMargin, coc, capRate, breakEven};
}
