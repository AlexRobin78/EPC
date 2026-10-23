// Step-by-step breakdowns of the EPC estimation formulas (see the Learn screen for the formulas themselves).
//
//   explainEPC(checkers, entry)  ->  null  or  { methods: [ method, ... ] }
//
// `checkers`  the 24-entry board array of the side being explained (index 0 = the ace point), all checkers on
//             the 1-6 points (anything else has no formula).
// `entry`     that position's row from epc_positions.json (METHOD, BESTIMATE, FASTIMATE, EPC).
//
// A method is { key, title, subtitle?, restrictions, steps: [{ name, expr, value }], total, stored, notes: [] }.
//   steps[].expr  is plain text in the same style as the Learn texts (A = 3, 2 × A, ...); the screen colours it
//                 with richtext.js so the variables keep the colours they have on the Learn tab.
//   total         the formula's result;  stored  the value in the JSON file (they agree; shown rounded alike).
//
// Every formula here was checked against all of the estimates stored in epc_positions.json.

const num = (x) => {
  const r = Math.round(x * 100) / 100;
  return String(r);                      // 12, 12.5, 12.25 (no trailing zeros)
};
const sgn = (x) => (x < 0 ? '−' : '+') + num(Math.abs(x));

export function homeCounts(checkers) {
  if (!checkers || checkers.length < 6) return null;
  for (let i = 6; i < checkers.length; i++) if (checkers[i] !== 0) return null;
  const c = checkers.slice(0, 6).map((v) => (v > 0 ? v : 0));
  return c;
}

// ---------------------------------------------------------------- Fastimate
function fastimate(c, ctx) {
  const [A, B, C] = c;
  const g = c.filter((x) => x === 0).length;
  const steps = [
    { name: 'Pip count', expr: `PC = ${ctx.PC}`, value: ctx.PC },
    { name: 'Constant', expr: '4', value: 4 },
    { name: 'Ace point', expr: `2A = 2 × ${A}`, value: 2 * A },
    { name: 'Deuce point', expr: `B = ${B}`, value: B },
    { name: '3 point', expr: `C / 2 = ${C} / 2`, value: C / 2 },
    { name: 'Gaphs', expr: `1.2 × g = 1.2 × ${g}`, value: 1.2 * g },
  ];
  const total = steps.reduce((s, x) => s + x.value, 0);
  return {
    key: 'Fastimate',
    title: 'Fastimate',
    restrictions: 'At least 9 checkers, and neither pippish nor rollish.',
    formula: 'EPC = pip count + 4 + 2A + B + C / 2 + 1.2 × g',
    steps,
    total,
    notes: [`g = ${g} (points from the ace to the 6 point with no checkers)`],
  };
}

// ---------------------------------------------------------------- MCG
function mcg(c, ctx) {
  const [A, B, C, D, E, F] = c;
  const N = ctx.N;
  const steps = [{ name: 'Pip count', expr: `PC = ${ctx.PC}`, value: ctx.PC }];

  let ace, aceExpr;
  if (A <= 2) { ace = [7.5, 8.5, 10][A]; aceExpr = `A = ${A}`; }
  else { ace = 10 + 2 * (A - 2); aceExpr = `A = ${A}:  10 + 2 × ${A - 2}`; }
  steps.push({ name: 'Ace point Adj.', expr: aceExpr, value: ace });

  let deuce, deuceExpr;
  if (B <= 2) { deuce = [-1, -0.75, 0][B]; deuceExpr = `B = ${B}`; }
  else { deuce = 1.25 * (B - 2); deuceExpr = `B = ${B}:  1.25 × ${B - 2}`; }
  steps.push({ name: 'Deuce point Adj.', expr: deuceExpr, value: deuce });

  let three, threeExpr;
  if (C <= 1) { three = -0.25; threeExpr = `C = ${C}`; }
  else if (C === 2) { three = 0; threeExpr = 'C = 2'; }
  else { three = 0.75 * (C - 2); threeExpr = `C = ${C}:  0.75 × ${C - 2}`; }
  steps.push({ name: '3 point Adj.', expr: threeExpr, value: three });

  const big = N >= 14;
  const gaphParts = [];
  let gaph = 0;
  if (F === 0) { gaph += 1; gaphParts.push('empty 6 point: 1'); }
  for (const [x, nm] of [[D, '4'], [E, '5']]) {
    if (x === 0) { const v = big ? 2 : 1.5; gaph += v; gaphParts.push(`empty ${nm} point: ${v}`); }
  }
  steps.push({ name: 'Gaph Adj.', expr: gaphParts.length ? gaphParts.join(', ') : 'no empty 4, 5 or 6 point', value: gaph });

  // a high semi-gap: the 4 or 5 point holds exactly one checker while the point above it holds two or more
  const semiParts = [];
  let semi = 0;
  if (D === 1 && E >= 2) { semi += 0.5; semiParts.push('4 point has 1 checker under the 5 point'); }
  if (E === 1 && F >= 2) { semi += 0.5; semiParts.push('5 point has 1 checker under the 6 point'); }
  steps.push({ name: 'Semi-gap Adj.', expr: semiParts.length ? semiParts.join(', ') : 'none', value: semi });

  const h = Math.max(...c);
  const hBase = big ? 4 : 3;
  steps.push({ name: 'Height Adj.', expr: `0.3 × (h − ${hBase}) = 0.3 × (${h} − ${hBase})`, value: 0.3 * (h - hBase) });
  steps.push({ name: 'Skew Adj.', expr: `0.2 × (D − F) = 0.2 × (${D} − ${F})`, value: 0.2 * (D - F) });

  const total = steps.reduce((s, x) => s + x.value, 0);
  return {
    key: 'MCG',
    title: 'MCG',
    subtitle: 'Matt Cohn-Geier',
    restrictions: 'At least 9 checkers, not pippish and not scrunched.',
    formula: 'EPC = pip count + Ace + Deuce + 3 Point + Gaph + Semi-gap + Height + Skew adjustments',
    steps,
    total,
    notes: [`N = ${N} checkers, so the gaph and height adjustments use the ${big ? '14 or 15' : 'fewer than 14'} checker values`, `h = ${h} (the most checkers on any one point)`],
  };
}

// ---------------------------------------------------------------- MM8
function mm8(c, ctx) {
  const [A, B, C, D, E] = c;
  const g = c.filter((x) => x === 0).length;
  const h = Math.max(...c);
  const steps = [
    { name: 'Pip count', expr: `PC = ${ctx.PC}`, value: ctx.PC },
    { name: 'Constant', expr: '4', value: 4 },
    { name: 'Ace point', expr: `2A = 2 × ${A}`, value: 2 * A },
    { name: 'Deuce point', expr: `1.3B = 1.3 × ${B}`, value: 1.3 * B },
    { name: '3 point', expr: `0.8C = 0.8 × ${C}`, value: 0.8 * C },
    { name: '4 point', expr: `0.4D = 0.4 × ${D}`, value: 0.4 * D },
    { name: '5 point', expr: `0.2E = 0.2 × ${E}`, value: 0.2 * E },
    { name: 'Gaphs', expr: `0.7 × (g − 2) = 0.7 × (${g} − 2)`, value: 0.7 * (g - 2) },
    { name: 'Height', expr: `0.3 × (h − 2) = 0.3 × (${h} − 2)`, value: 0.3 * (h - 2) },
  ];
  const total = steps.reduce((s, x) => s + x.value, 0);
  return {
    key: 'MM8',
    title: 'MM8',
    subtitle: 'Modified Matussek',
    restrictions: '5 to 9 checkers and not scrunched (also usable with 4 checkers if the pip count is at least 13).',
    formula: 'EPC = pip count + 4 + 2A + 1.3B + 0.8C + 0.4D + 0.2E + 0.7 × (g − 2) + 0.3 × (h − 2)',
    steps,
    total,
    notes: [`g = ${g} (empty points from the ace to the 6 point), h = ${h} (the most checkers on any one point)`],
  };
}

// ---------------------------------------------------------------- NNM
function nnm(c, ctx) {
  const { N, PC } = ctx;
  const [A, , C, D, E, F] = c;
  const odd = N % 2 === 1;
  const baseRolls = Math.ceil(N / 2);
  const G = PC / N;
  const x = G - (odd ? 0.5 : 0);
  let S, sExpr;
  if (x <= 1.5) { S = 0; sExpr = `G ≤ 1.5:  S = 0`; }
  else if (x <= 2) { S = 2 * x - 3; sExpr = `1.5 < G ≤ 2:  S = 2G − 3 = 2 × ${num(x)} − 3`; }
  else { S = 4 * x - 7; sExpr = `G > 2:  S = 4G − 7 = 4 × ${num(x)} − 7`; }
  const steps = [
    { name: 'Rolls', expr: `7 × ⌈N / 2⌉ = 7 × ⌈${N} / 2⌉ = 7 × ${baseRolls}`, value: 7 * baseRolls },
    { name: 'Constant', expr: '1', value: 1 },
    { name: 'Center of gravity', expr: `G = PC / N = ${PC} / ${N}${odd ? ` = ${num(G)},  minus 0.5 (N is odd) = ${num(x)}` : ` = ${num(G)}`}`, value: null },
    { name: 'S', expr: sExpr, value: S },
  ];
  const total = 7 * baseRolls + 1 + S;
  const notes = [];
  const scrunched = E === 0 && F === 0;
  const mods = [];
  let extra = 0;
  if (!scrunched && A >= 4) { extra += 0.05 * A; mods.push(`not scrunched and A ≥ 4: +0.05 × ${A} = +${num(0.05 * A)}`); }
  if (scrunched && (C >= 5 || D >= 5)) { extra += 0.5; mods.push('scrunched and (C ≥ 5 or D ≥ 5): +0.5'); }
  let modified = null;
  if (mods.length) {
    modified = total + extra;
    notes.push('Modifications that apply (not part of the stored Bestimate): ' + mods.join('; '));
    notes.push(`With the modification the estimate becomes ${num(modified)}`);
  } else {
    notes.push('No modification applies to this position.');
  }
  return {
    key: 'NNM',
    title: 'NNM',
    subtitle: 'Nearly No Miss',
    restrictions: 'Rollish position with no low gaps.',
    formula: 'EPC = 7 × ⌈N / 2⌉ + 1 + S',
    steps,
    total,
    notes,
    modified,
  };
}

// ---------------------------------------------------------------- CYM
function cym(c, ctx, entry) {
  const { N } = ctx;
  const baseRolls = Math.ceil(N / 2);
  const base = 7 * baseRolls + 1;
  const M = Math.round((parseFloat(entry.BESTIMATE) - base) / 0.2);
  const steps = [
    { name: 'Rolls', expr: `7 × ⌈N / 2⌉ = 7 × ⌈${N} / 2⌉ = 7 × ${baseRolls}`, value: 7 * baseRolls },
    { name: 'Constant', expr: '1', value: 1 },
    { name: 'Misses', expr: `0.2 × M = 0.2 × ${M}`, value: 0.2 * M },
  ];
  return {
    key: 'CYM',
    title: 'CYM',
    subtitle: 'Count Your Misses',
    restrictions: 'Crunched position with one or two straggler checkers on a high point.',
    formula: 'EPC = 7 × ⌈N / 2⌉ + 1 + 0.2 × M',
    steps,
    total: base + 0.2 * M,
    notes: [`M = ${M} is the number of shots (out of 36 rolls) where the number of rolls to bear off does not go down.`],
  };
}

const BUILDERS = { MCG: mcg, MM8: mm8, NNM: nnm, CYM: cym };

export function explainEPC(checkers, entry) {
  if (!entry) return null;
  const c = homeCounts(checkers);
  if (!c) return null;
  const N = c.reduce((s, x) => s + x, 0);
  if (N === 0) return null;
  const PC = c.reduce((s, x, i) => s + x * (i + 1), 0);
  const ctx = { N, PC };
  const methods = [];

  const best = parseFloat(entry.BESTIMATE);
  const build = BUILDERS[entry.METHOD];
  if (build && best >= 0) {
    const m = build(c, ctx, entry);
    m.stored = best;
    methods.push(m);
  }
  const fast = parseFloat(entry.FASTIMATE);
  if (fast >= 0) {
    const m = fastimate(c, ctx);
    m.stored = fast;
    methods.push(m);
  }
  if (!methods.length) return null;
  return { methods, N, PC, actual: parseFloat(entry.EPC) };
}

// ---------------------------------------------------------------- Benjamin Count (cube decision)
// The rule from the Learn tab. The bottom player is on roll, the top player would take or pass.
//   Take Point    = bottom EPC + Adjustment + Variance Score        (Adjustment: see adjustedEPC)
//   Variance Score = (bottom variance + top variance - 3) x 0.5      (rollish 0, low 1, medium 2, high 3)
//   Double Point  = Take Point - 3,   Redouble Point = Take Point - 2.25
//   top EPC > Take Point -> Double/Pass;  >= Redouble Point -> Redouble/Take;  >= Double Point -> Double/Take;
//   otherwise No Double.
const VAR_SCORE = { rollish: 0, low: 1, medium: 2, high: 3 };

function adjustedEPC(epc) {
  if (epc >= 40) return { value: epc * 1.1 - 1, expr: `EPC ≥ 40:  1.1 × EPC − 1 = 1.1 × ${num(epc)} − 1` };
  if (epc >= 30) return { value: epc * 1.2 - 5, expr: `EPC from 30 to 40:  1.2 × EPC − 5 = 1.2 × ${num(epc)} − 5` };
  if (epc > 25) return { value: epc + 1, expr: `EPC from 25 to 30:  EPC + 1 = ${num(epc)} + 1` };
  return { value: epc, expr: `EPC ≤ 25:  no adjustment` };
}

// Returns the decision key ('D/P' | 'ReD/T' | 'D/T' | 'ND') and the breakdown, or null if it can't be computed.
export function benjaminCount(bottom, top, engineShort) {
  if (!bottom || !top) return null;
  const bE = parseFloat(bottom.BESTIMATE);
  const tE = parseFloat(top.BESTIMATE);
  if (!(bE >= 0) || !(tE >= 0)) return null;
  const bV = VAR_SCORE[bottom.VARIANCE];
  const tV = VAR_SCORE[top.VARIANCE];
  if (bV === undefined || tV === undefined) return null;

  const vScore = (bV + tV - 3) * 0.5;
  const adj = adjustedEPC(bE);
  const adjRounded = Math.round(adj.value * 10) / 10;
  const take = adjRounded + vScore;
  const dbl = take - 3;
  const redbl = take - 2.25;

  let decision, text;
  if (tE > take) { decision = 'D/P'; text = 'Double / Pass'; }
  else if (tE >= redbl) { decision = 'ReD/T'; text = 'Redouble / Take'; }
  else if (tE >= dbl) { decision = 'D/T'; text = 'Double / Take'; }
  else { decision = 'ND'; text = 'No Double'; }

  const yn = (b) => (b ? 'Yes' : 'No');
  const steps = [
    { name: 'Bottom EPC', expr: `Bottom position, estimate (Bestimate)`, value: bE },
    { name: 'Top EPC', expr: `Top position, estimate (Bestimate)`, value: tE },
    { name: 'Variance Score', expr: `(${bottom.VARIANCE} + ${top.VARIANCE} − 3) × 0.5 = (${bV} + ${tV} − 3) × 0.5`, value: vScore },
    { name: 'Adjustment', expr: adj.expr, value: adjRounded - bE },
    { name: 'Take Point', expr: `bottom EPC + Adjustment + Variance Score = ${num(bE)} + ${num(adjRounded - bE)} ${vScore < 0 ? '−' : '+'} ${num(Math.abs(vScore))}`, value: take },
    { name: 'Double Point', expr: `Take Point − 3`, value: dbl },
    { name: 'Redouble Point', expr: `Take Point − 2.25`, value: redbl },
    { name: 'Top EPC > Take Point?', expr: `${num(tE)} > ${num(take)}`, text: yn(tE > take) },
    { name: 'Top EPC ≥ Redouble Point?', expr: `${num(tE)} ≥ ${num(redbl)}`, text: yn(tE >= redbl) },
    { name: 'Top EPC ≥ Double Point?', expr: `${num(tE)} ≥ ${num(dbl)}`, text: yn(tE >= dbl) },
  ];
  const notes = [
    'The first "Yes" in the last three rows decides: pass, redouble, double. If all are "No" there is no double.',
    'The Take Point and EPC values are estimates, so close calls can differ from the exact (engine) answer.',
  ];
  if (bV === 3 && tV === 3) notes.push('Both positions are pippish: the Benjamin Count is not meant for this case (use the 9-10-12 rule).');
  if (bV === 0 && tV === 0) notes.push('Both positions are rollish: the Benjamin Count is not meant for this case (use reference positions).');
  if (engineShort) notes.push(`GNU Backgammon (exact) answer for this position: ${engineShort}.`);

  return {
    decision,
    method: {
      key: 'Benjamin',
      title: 'Benjamin Count',
      subtitle: 'cube decision',
      restrictions: 'All positions except pippish v pippish and rollish v rollish.',
      formula: 'Take Point = bottom EPC + Adjustment + Variance Score',
      steps,
      totalLabel: 'Decision',
      totalText: text,
      notes,
      cube: true,
    },
  };
}

export { num, sgn };
