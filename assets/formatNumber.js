// Display helper: numbers coming from epc_positions.json can carry long float tails (34.599999999999994).
// Shows at most 2 decimals (no trailing zeros); anything that isn't a plain number ("N/A", "~12.3", "...") is left alone.
export function round2(value) {
  if (value === null || value === undefined) return value;
  const s = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return value;
  const n = parseFloat(s);
  return String(Math.round(n * 100) / 100);
}
