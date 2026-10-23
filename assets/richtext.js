// Shared by Learn.js: turns the plain strings in learn_texts.js into readable, colour-coded lines.
// Nothing here edits learn_texts.js; symbols and colours are applied when the text is displayed.

// Colours are chosen to stay readable on the white content card in every theme.
// Each variable / concept keeps the same colour on every tab.
export const COLORS = {
  epc: '#1D4ED8',        // EPC / Expected Pip Count
  pip: '#15803D',        // pip count, PC
  wastage: '#B45309',    // wastage and all the "... Adj." terms
  rolls: '#0E7490',      // rolls
  variance: '#BE185D',   // variance, variance score, V
  pippish: '#DC2626',
  rollish: '#7C3AED',
  cubePoint: '#86198F',  // take point, double point, redouble point
  A: '#E11D48', B: '#EA580C', C: '#A16207', D: '#4D7C0F', E: '#0F766E', F: '#4F46E5',
  N: '#475569',          // number of checkers
  S: '#7C2D12',
  G: '#0369A1',          // center of gravity
  g: '#6B21A8',          // number of gaphs
  h: '#0C4A6E',          // height
  M: '#BE123C',
  label: '#111827',      // "Restrictions:" etc.
};

// ---------- plain characters -> readable math symbols ----------
export function prettify(line) {
  return line
    .replace(/\(N \/ 2 \(rounded down\)\)|N \/ 2 \(rounded down\)/g, '⌊N ÷ 2⌋')
    .replace(/>=/g, '≥')
    .replace(/<=/g, '≤')
    .replace(/(\S) \* (\S)/g, '$1 × $2')                 // 7 * (N ...
    .replace(/(\d|[A-Za-z)])\*(?=[\dA-Za-z(])/g, '$1 × ')  // 1.2*g, 0.2*M
    .replace(/ - /g, ' − ')                                // minus (spaces on both sides)
    .replace(/(^|[\s(])-(?=\d)/g, '$1−')                   // negative numbers
    .replace(/([A-Za-z])\/(\d)/g, '$1 ÷ $2')               // C/2, EPC/10

}

// ---------- tokenizer ----------
const PARTS = [
  ['label', 'Restrictions:|Modifications:|\\(Advanced\\)|Applicable|(?<![A-Za-z])[Ww]here(?= )'],
  ['epc', 'Expected Pip Count|EPC'],
  ['pip', '[Pp]ip counts?|(?<![A-Za-z])PC(?![A-Za-z])'],
  ['variance', 'Variance Score|[Vv]ariance score|Variance|variance|(?<![A-Za-z])V(?=\\s*=|\\.)'],
  ['pippish', '[Aa]lmost pippish|[Pp]ippish'],
  ['rollish', '[Aa]lmost rollish|[Rr]ollish'],
  ['wastage', '(?:Ace Point|Deuce Point|3 Point|Gaph|Semi-gap|Height|Skew) (?:Adj\\.|penalty)|Adjustment|wastage'],
  ['cubePoint', 'Take ?[Pp]oint|Double Point|Redouble Point|Takepoint'],
  ['rolls', '(?<![A-Za-z])rolls?(?![A-Za-z])'],
  // a single-letter variable: after a number (2A), or standing alone before an operator / bracket / end
  // of line / "if|or|and|is" (so the article "A" in "A pippish position" is left alone)
  ['variable', '(?<=\\d)[A-FgGhNSM](?![A-Za-z])|(?<![A-Za-z#⌊])[A-FgGhNSM](?![A-Za-z])(?=\\s*(?:[=<>≤≥+−×÷)⌋/,]|\\.(?:\\s|$)|$)|\\s+(?:if|or|and|is|to)\\b)'],
];
const MASTER = new RegExp(PARTS.map(([, src]) => `(${src})`).join('|'), 'g');

// -> [{ text, color?, bold? }]
export function tokenize(line) {
  const out = [];
  let last = 0;
  MASTER.lastIndex = 0;
  let m;
  while ((m = MASTER.exec(line)) !== null) {
    if (m[0] === '') { MASTER.lastIndex++; continue; }
    if (m.index > last) out.push({ text: line.slice(last, m.index) });
    const kind = PARTS[m.slice(1).findIndex((g) => g !== undefined)][0];
    const key = kind === 'variable' ? m[0] : kind;
    out.push({ text: m[0], color: COLORS[key] ?? COLORS.label, bold: true, italic: m[0] === '(Advanced)' });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out;
}

// A line like "EPC = ..." or "Ace Point Adj. = ..." is drawn as a formula box.
export const isFormula = (line) =>
  /^[^=]{1,40}=/.test(line) && !/^(where|Where|If|if)\b/.test(line) && !/=\s+For\b/.test(line);
