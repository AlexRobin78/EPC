// JavaScript port of the GNU Backgammon cube-decision logic for pure bear-off races
// (every checker of both sides on the 6 point or lower, money game, centred cube).
//
// Ported from gnubg engine-core: eval.c (EvaluatePositionCubeful4, GeneralCubeDecisionE, Cl2CfMoney,
// MoneyLive, GetECF3, MakeCubePos, FindBestCubeDecision, EvalEfficiency) and bearoff.c
// (BearoffEvalOneSided / setGammonProb).
//
// Board convention (same as gnubg): an array of 6 counts, index 0 = the 1 point (ace point), index 5 = the 6 point.

import { GAMMON_TRIPLES, GAMMON_INDEX } from './gnubgGammonData';
import BEAROFF_DB from './gnubgBearoffData';

// ---------------------------------------------------------------- one-sided distributions

const NB = 32;                    // number of bins: P(bear off in exactly i rolls)

const keyOf = (b) => b[0] | (b[1] << 4) | (b[2] << 8) | (b[3] << 12) | (b[4] << 16) | (b[5] << 20);
const total = (b) => {
    let n = b[0] + b[1] + b[2] + b[3] + b[4] + b[5];
    for (let i = 6; i < b.length; i++) n += b[i];
    return n;
};

function finishDist(p) {
    const L = p.length;
    const suf = new Float64Array(L + 1);
    for (let i = L - 1; i >= 0; i--) suf[i] = suf[i + 1] + p[i];
    let mean = 0;
    for (let i = 1; i < L; i++) mean += i * p[i];
    return { p, suf, mean };
}

// Distribution source. By default the packed table in gnubgBearoffData.js (every position of up to 15
// checkers on the 6 point or lower, optimal play, built by gnubgBearoffGen.mjs). Tests can swap it.
let provider = null;
const distMemo = new Map();
export function setDistProvider(fn) { provider = fn; distMemo.clear(); }

let dbIndex = null, dbOffset = null, dbBytes = null;
function loadDb() {
    dbBytes = decodeBase64(BEAROFF_DB);
    dbIndex = new Map();
    dbOffset = [];
    let pos = 0, n = 0;
    const rec = (i, left, k) => {
        if (i === 6) { dbIndex.set(k, n++); return; }
        for (let c = 0; c <= left; c++) rec(i + 1, left - c, k | (c << (4 * i)));
    };
    rec(0, 15, 0);
    for (let i = 0; i < n; i++) { dbOffset.push(pos); pos += 2 + 2 * dbBytes[pos + 1]; }
}

function decodeBase64(b64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Int16Array(128).fill(-1);
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
    const clean = b64.replace(/=+$/, '');
    const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
    let acc = 0, bits = 0, out = 0;
    for (let i = 0; i < clean.length; i++) {
        acc = (acc << 6) | lookup[clean.charCodeAt(i)];
        bits += 6;
        if (bits >= 8) { bits -= 8; bytes[out++] = (acc >> bits) & 0xFF; }
    }
    return bytes;
}

function dbDist(b) {
    if (!dbIndex) loadDb();
    const idx = dbIndex.get(keyOf(b));
    let o = dbOffset[idx];
    const start = dbBytes[o], len = dbBytes[o + 1];
    const p = new Float64Array(NB);
    o += 2;
    for (let i = 0; i < len; i++, o += 2) p[start + i] = (dbBytes[o] | (dbBytes[o + 1] << 8)) / 65535;
    return p;
}

function dist(b) {
    const key = b.length === 6 ? keyOf(b) : b.join(',');
    let e = distMemo.get(key);
    if (!e) {
        if (b.length === 6) e = provider ? provider(b) : finishDist(dbDist(b));
        else e = raceDist(b);
        distMemo.set(key, e);
    }
    return e;
}

export { finishDist, keyOf, total, NB, dist };

// All distinct positions reachable by playing the roll (d1, d2) from board b.
export function playDie(b, d, out) {
    for (let p = 0; p < 6; p++) {
        if (!b[p]) continue;
        const pt = p + 1;
        let ok = false;
        let dest = -1;
        if (d === pt) { ok = true; }
        else if (d > pt) { ok = true; for (let q = p + 1; q < 6; q++) if (b[q]) { ok = false; break; } }
        else { ok = true; dest = p - d; }
        if (!ok) continue;
        const nb = b.slice();
        nb[p]--;
        if (dest >= 0) nb[dest]++;
        out.push(nb);
    }
}

export function successors(b, d1, d2) {
    const seen = new Map();
    const seqs = d1 === d2 ? [[d1, d1, d1, d1]] : [[d1, d2], [d2, d1]];
    for (const seq of seqs) {
        let cur = [b];
        for (const d of seq) {
            const next = [];
            for (const c of cur) {
                if (total(c) === 0) { next.push(c); continue; }
                playDie(c, d, next);
            }
            // de-duplicate between dice to keep the frontier small
            const m = new Map();
            for (const c of next) m.set(keyOf(c), c);
            cur = Array.from(m.values());
        }
        for (const c of cur) seen.set(keyOf(c), c);
    }
    return Array.from(seen.values());
}

// ---------------------------------------------------------------- contactless races beyond the 6 point
// (Option B: approximation, not gnubg's race neural net.)
//
// A board is a 24-count array (index 0 = 1 point). Boards with every checker on the 6 point or lower are
// always stored as 6-count arrays and use the exact tables above. For a board with "stragglers" (checkers
// beyond the 6 point) the number of rolls to bear off is modelled as
//     N = N_in + N_home
// where N_home is the exact distribution of the home board with every straggler placed on the 6 point, and
// N_in ~ Normal is the time to bring the stragglers in. Constants were fitted to simulations of the same
// rear-first policy the EPC engine uses (mean error ~0.7 pip, see gnubgBearoffGen notes).

const ROLL_PIPS = 294 / 36;
const LB = 80;                       // bins for race distributions

function stragglerInfo(b) {
    let s = 0, D = 0;
    for (let p = 7; p <= 24; p++) { const c = b[p - 1]; if (c) { s += c; D += c * (p - 6); } }
    return { s, D };
}

function homeWithStragglers(b, s) {
    return [b[0], b[1], b[2], b[3], b[4], b[5] + s];
}

const meanIn = (s, D) => 0.9869 * D / ROLL_PIPS + 0.0986 + 0.0046 * s;
const varIn = (D) => Math.max(0.02, 0.0335 * D - 0.09);

// expected rolls to bear off (fast: no distribution built)
function fastMean(b) {
    if (b.length === 6) return dist(b).mean;
    const { s, D } = stragglerInfo(b);
    return dist(homeWithStragglers(b, s)).mean + meanIn(s, D);
}

const ERF_A = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
function normCdf(x) {
    const z = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * z);
    const y = 1 - (((((ERF_A[4] * t + ERF_A[3]) * t) + ERF_A[2]) * t + ERF_A[1]) * t + ERF_A[0]) * t * Math.exp(-z * z);
    return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

function raceDist(b) {
    const { s, D } = stragglerInfo(b);
    const dh = dist(homeWithStragglers(b, s));
    const mu = meanIn(s, D), sd = Math.sqrt(varIn(D));
    // F[t] = P(N_in < t - 0.5) for integer offsets t = i - j in [-LB, LB]
    const F = new Float64Array(2 * LB + 2);
    for (let t = -LB; t <= LB + 1; t++) F[t + LB] = normCdf((t - 0.5 - mu) / sd);
    const p = new Float64Array(LB);
    let sum = 0;
    const minRolls = Math.ceil(total(b) / 4);
    for (let i = minRolls; i < LB; i++) {
        let acc = 0;
        for (let j = 0; j < dh.p.length; j++) {
            const w = dh.p[j];
            if (!w) continue;
            const t = i - j;
            if (t < -LB || t > LB) continue;
            acc += w * (F[t + 1 + LB] - F[t + LB]);
        }
        p[i] = acc; sum += acc;
    }
    if (sum > 0) for (let i = 0; i < LB; i++) p[i] /= sum;
    return finishDist(p);
}

// Distribution of the pips rolled in k turns (doubles count four times), built lazily.
const ROLL_DIST = (() => {
    const r = new Float64Array(25);
    for (let a = 1; a <= 6; a++) for (let c = 1; c <= 6; c++) r[a === c ? 4 * a : a + c] += 1 / 36;
    return r;
})();
const sumDist = [new Float64Array([1])];
function pipsSuffix(k, x) {         // P(pips in k turns >= x)
    if (x <= 0) return 1;
    while (sumDist.length <= k) {
        const prev = sumDist[sumDist.length - 1];
        const nx = new Float64Array(prev.length + 24);
        for (let i = 0; i < prev.length; i++) {
            if (!prev[i]) continue;
            for (let v = 2; v <= 24; v++) if (ROLL_DIST[v]) nx[i + v] += prev[i] * ROLL_DIST[v];
        }
        sumDist.push(nx);
    }
    const d = sumDist[k];
    x = Math.ceil(x);
    if (x >= d.length) return 0;
    let acc = 0;
    for (let i = x; i < d.length; i++) acc += d[i];
    return acc;
}

// P(a side that still has all 15 checkers on the board bears off at least one within k turns)
function makeProb(b, k) {
    if (k <= 0) return 0;
    if (b.length === 6) {
        const g = gammonProbs(b);
        const m0 = g[0] / 36, m1 = m0 + g[1] / 1296, m2 = m1 + g[2] / 46656;
        if (k <= 3) return [m0, m1, m2][k - 1];
        const h = m2 < 1 ? Math.min(1, Math.max(0, (m2 - m1) / (1 - m1))) : 1;
        return 1 - (1 - m2) * Math.pow(1 - h, k - 3);
    }
    return pipsSuffix(k, stragglerInfo(b).D + 3);
}

// P(all checkers have left the opponent's home board (points 19-24) within k turns)
function escapeProb(b, k) {
    if (k <= 0) return 0;
    let D = 0;
    for (let p = 19; p <= 24; p++) D += b[p - 1] * (p - 18);
    return D === 0 ? 1 : pipsSuffix(k, D);
}

// ---------------------------------------------------------------- gammon table (from bearoffgammon.c)

let gammonIndexMap = null;
function gammonProbs(b) {
    if (!gammonIndexMap) {
        gammonIndexMap = new Map();
        let n = 0;
        const rec = (i, left, k) => {
            if (i === 5) { gammonIndexMap.set(k | (left << 20), n++); return; }
            for (let c = 0; c <= left; c++) rec(i + 1, left - c, k | (c << (4 * i)));
        };
        rec(0, 15, 0);
    }
    const idx = gammonIndexMap.get(keyOf(b));
    const t = GAMMON_INDEX.charCodeAt(idx) - 48;
    return GAMMON_TRIPLES[t];                 // [p0, p1, p2]
}

// ---------------------------------------------------------------- cubeless evaluation

// Returns [win, winGammon, loseGammon, winBG, loseBG] for the side on roll (`us`).
function evalBearoff(us, them) {
    const nu = total(us), nt = total(them);
    if (nt === 0) {            // opponent has no checkers: the side on roll has lost
        return [0, 0, nu === 15 ? 1 : 0, 0, 0];
    }
    if (nu === 0) {
        return [1, nt === 15 ? 1 : 0, 0, 0, 0];
    }
    const du = dist(us), dt = dist(them);
    let win = 0;
    for (let i = 0; i < du.p.length; i++) win += du.p[i] * (i < dt.p.length ? dt.suf[i] : 0);
    let wg = 0, lg = 0, wbg = 0, lbg = 0;

    if (us.length === 6 && them.length === 6) {
        // pure bear-off: exactly gnubg's BearoffEvalOneSided / setGammonProb
        if (nt === 15) {
            const g = gammonProbs(them);
            const m0 = g[0] / 36, m1 = m0 + g[1] / 1296, m2 = m1 + g[2] / 46656;
            wg = du.p[1] + (1 - m0) * du.p[2] + (1 - m1) * du.p[3] + (1 - m2) * du.p[4];
        }
        if (nu === 15) {
            const g = gammonProbs(us);
            const m0 = g[0] / 36, m1 = m0 + g[1] / 1296, m2 = m1 + g[2] / 46656;
            lg = dt.p[1] * (1 - m0) + dt.p[2] * (1 - m1) + dt.p[3] * (1 - m2);
        }
        return [win, wg, lg, 0, 0];
    }

    // race with stragglers: gammons and backgammons from the same turn-by-turn logic
    if (nt === 15) {
        const hasBG = them.length === 24 && stragglerBack(them);
        for (let i = 1; i < du.p.length; i++) {
            const w = du.p[i];
            if (!w) continue;
            wg += w * (i === 1 ? 1 : 1 - makeProb(them, i - 1));
            if (hasBG) wbg += w * (i === 1 ? 1 : 1 - escapeProb(them, i - 1));
        }
    }
    if (nu === 15) {
        const hasBG = us.length === 24 && stragglerBack(us);
        for (let i = 1; i < dt.p.length; i++) {
            const w = dt.p[i];
            if (!w) continue;
            lg += w * (1 - makeProb(us, i));
            if (hasBG) lbg += w * (1 - escapeProb(us, i));
        }
    }
    return [win, wg, lg, wbg, lbg];
}

const stragglerBack = (b) => b[18] || b[19] || b[20] || b[21] || b[22] || b[23];

// ---------------------------------------------------------------- cube maths (money game)

const OS_CUBE_X = 0.6;     // rOSCubeX in gnubg

function utility(ar, ci) {
    const gp = ci.jacoby && ci.owner === -1 ? 0 : 1;
    return ar[0] * 2 - 1 + (ar[1] - ar[2]) * gp + (ar[3] - ar[4]) * gp;
}

function utilityME(ar) {   // gnubg's UtilityME in money play: gammon price 1
    return ar[0] * 2 - 1 + (ar[1] - ar[2]) + (ar[3] - ar[4]);
}

function moneyLive(rW, rL, p, ci) {
    if (ci.owner === -1) {
        const rTP = (rL - 0.5) / (rW + rL + 0.5);
        const rCP = (rL + 1) / (rW + rL + 0.5);
        if (p < rTP) return ci.jacoby ? -1 : (-rL + (-1 + rL) * p / rTP);
        if (p < rCP) return -1 + 2 * (p - rTP) / (rCP - rTP);
        return ci.jacoby ? 1 : (1 + (rW - 1) * (p - rCP) / (1 - rCP));
    }
    if (ci.owner === ci.move) {
        const rCP = (rL + 1) / (rW + rL + 0.5);
        if (p < rCP) return -rL + (1 + rL) * p / rCP;
        return 1 + (rW - 1) * (p - rCP) / (1 - rCP);
    }
    const rTP = (rL - 0.5) / (rW + rL + 0.5);
    if (p < rTP) return -rL + (-1 + rL) * p / rTP;
    return -1 + (rW + 1) * (p - rTP) / (1 - rTP);
}

function cl2cfMoney(ar, ci, X) {
    const eps = 1e-7;
    let rW, rL;
    if (ar[0] > eps) rW = 1 + (ar[1] + ar[3]) / ar[0]; else return utility(ar, ci);
    if (ar[0] < 1 - eps) rL = 1 + (ar[2] + ar[4]) / (1 - ar[0]); else return utility(ar, ci);
    const dead = utility(ar, ci);
    const live = moneyLive(rW, rL, ar[0], ci);
    return dead * (1 - X) + live * X;
}

const canDouble = (ci) => ci.owner === -1 || ci.owner === ci.move;

function makeCubePos(list, fTop, invert) {
    const out = [];
    for (const c of list) {
        if (c.n > 0) out.push({ n: c.n, owner: c.owner, move: invert ? 1 - c.move : c.move, jacoby: c.jacoby });
        else out.push({ n: -1 });
        if (!fTop && c.n > 0 && canDouble(c)) {
            out.push({ n: 2 * c.n, owner: 1 - c.move, move: invert ? 1 - c.move : c.move, jacoby: c.jacoby });
        } else out.push({ n: -1 });
    }
    return out;
}

function getECF3(cci, arCf, aci) {
    const out = new Array(cci);
    for (let k = 0; k < cci; k++) {
        const i = 2 * k;
        if (aci[i + 1].n > 0) {
            const rND = arCf[i];
            const rDT = 2 * arCf[i + 1];
            const rDP = 1;
            if (rDT >= rND && rDP >= rND) out[k] = rDT >= rDP ? rDP : rDT;
            else out[k] = rND;
        } else out[k] = arCf[i];
    }
    return out;
}

// ---------------------------------------------------------------- n-ply cubeful evaluation

// us = side on roll. cubeList: cube positions to evaluate. ciMove: cube state used to choose checker plays.
function evalCubeful(us, them, cubeList, ciMove, plies, fTop, topPlies) {
    const cci = cubeList.length;
    const over = total(us) === 0 || total(them) === 0;

    if (!over && plies > 0) {
        const aci = makeCubePos(cubeList, fTop, true);
        const ar = [0, 0, 0, 0, 0];
        const arCf = new Array(2 * cci).fill(0);
        const ciOpp = { n: ciMove.n, owner: ciMove.owner, move: 1 - ciMove.move, jacoby: ciMove.jacoby };
        for (let d0 = 1; d0 <= 6; d0++) for (let d1 = 1; d1 <= d0; d1++) {
            const w = d0 === d1 ? 1 : 2;
            const moved = bestPlay(us, them, d0, d1, ciMove, topPlies);
            const r = evalCubeful(them, moved, aci, ciOpp, plies - 1, false, topPlies);
            for (let i = 0; i < 5; i++) ar[i] += w * r.ar[i];
            for (let i = 0; i < 2 * cci; i++) arCf[i] += w * (r.cf[i] || 0);
        }
        const res = [1 - ar[0] / 36, ar[2] / 36, ar[1] / 36, ar[4] / 36, ar[3] / 36];
        for (let i = 0; i < 2 * cci; i++) arCf[i] = -arCf[i] / 36;
        const cf = getECF3(cci, arCf, aci);
        return { ar: res, cf };
    }

    const ar = evalBearoff(us, them);
    const X = efficiency(us, them, over, topPlies);
    const aci = makeCubePos(cubeList, fTop, false);
    const arCf = aci.map((c) => (c.n > 0 ? cl2cfMoney(ar, c, X) : 0));
    return { ar, cf: getECF3(cci, arCf, aci) };
}

// Cube efficiency X used by the Janowski formulas (gnubg EvalEfficiency).
const RACE_FACTOR = [0.00125, 0.0025], RACE_COEF = [0.55, 0.60], RACE_MAX = [0.7, 0.8], RACE_MIN = [0.6, 0.6];
function efficiency(us, them, over, topPlies) {
    if (over) return 0;
    if (us.length === 6 && them.length === 6) return OS_CUBE_X;       // bear-off class
    const i = topPlies >= 2 ? 0 : 1;                                   // race class
    let pips = 0;
    for (let k = 0; k < us.length; k++) pips += us[k] * (k + 1);
    const e = pips * RACE_FACTOR[i] + RACE_COEF[i];
    return e > RACE_MAX[i] ? RACE_MAX[i] : e < RACE_MIN[i] ? RACE_MIN[i] : e;
}

// ---- legal plays on a full 24-point board (no contact: nothing can block, bearing off needs all home)
const keyStr = (b) => b.join(',');

function playDie24(b, d, out) {
    let allHome = true;
    for (let p = 6; p < 24; p++) if (b[p]) { allHome = false; break; }
    let highest = -1;
    for (let p = 23; p >= 0; p--) if (b[p]) { highest = p; break; }
    for (let p = 0; p < 24; p++) {
        if (!b[p]) continue;
        const dest = p - d;
        if (dest < 0) {
            if (!allHome) continue;
            if (dest !== -1 && p !== highest) continue;      // bearing off with a larger die needs the highest checker
        }
        const nb = b.slice();
        nb[p]--;
        if (dest >= 0) nb[dest]++;
        out.push(nb);
    }
}

const homeOnly = (b) => {
    for (let p = 6; p < 24; p++) if (b[p]) return false;
    return true;
};
export const normBoard = (b) => (b.length === 24 && homeOnly(b) ? b.slice(0, 6) : b);

function raceSuccessors(b, d0, d1) {
    const seqs = d0 === d1 ? [[d0, d0, d0, d0]] : [[d0, d1], [d1, d0]];
    const result = new Map();
    let maxUsed = 0;
    for (const seq of seqs) {
        let cur = new Map([[keyStr(b), { b, used: 0 }]]);
        for (const d of seq) {
            const next = new Map();
            for (const st of cur.values()) {
                const out = [];
                if (total(st.b) > 0) playDie24(st.b, d, out);
                if (out.length === 0) {
                    const k = keyStr(st.b), old = next.get(k);
                    if (!old || old.used < st.used) next.set(k, st);
                } else {
                    for (const nb of out) {
                        const k = keyStr(nb), old = next.get(k);
                        if (!old || old.used < st.used + 1) next.set(k, { b: nb, used: st.used + 1 });
                    }
                }
            }
            cur = next;
        }
        for (const [k, st] of cur) {
            const old = result.get(k);
            if (!old || old.used < st.used) result.set(k, st);
            if (st.used > maxUsed) maxUsed = st.used;
        }
    }
    const list = [];
    for (const st of result.values()) if (st.used === maxUsed || total(st.b) === 0) list.push(normBoard(st.b));
    return list;
}

function legalPlays(b, d0, d1) {
    return b.length === 6 ? successors(b, d0, d1) : raceSuccessors(b, d0, d1);
}

// FindBestMovePlied at 0 plies with cubeful scoring (what the engine does inside its recursion).
// When the side to move still has checkers beyond its 6 point (Option B races) there can be hundreds of
// candidate plays, so we simply play to the position with the fewest expected rolls left.
function bestPlay(us, them, d0, d1, ci, topPlies) {
    const succ = legalPlays(us, d0, d1);
    if (succ.length === 1) return succ[0];
    if (us.length !== 6) {
        let best = succ[0], bm = fastMean(best);
        for (let i = 1; i < succ.length; i++) {
            const m = fastMean(succ[i]);
            if (m < bm - 1e-12) { bm = m; best = succ[i]; }
        }
        return best;
    }
    const ciO = { n: ci.n, owner: ci.owner, move: 1 - ci.move, jacoby: ci.jacoby };
    let best = null, bScore = -99999.9, bScore2 = -99999.9;
    for (const s of succ) {
        const r = evalCubeful(them, s, [ciO], ciO, 0, false, topPlies);
        const score = -r.cf[0];
        const score2 = -utilityME(r.ar);
        if (score > bScore || (score === bScore && score2 > bScore2)) { best = s; bScore = score; bScore2 = score2; }
    }
    return best;
}

// ---------------------------------------------------------------- cube decision

export const DECISIONS = {
    ND: 'No Double',
    DT: 'Double / Take',
    DP: 'Double / Pass',
};

const near = (a, b) => Math.abs(a - b) <= 1e-5;

function findBestCubeDecision(nd, dt, dp, ar, ci) {
    const winG = ar[1] > 0, winAny = ar[0] > 0;
    let kind, optional = false;
    if (dt >= nd && dp >= nd) {
        if (dp > dt) {                       // DP > DT >= ND: double, take
            optional = near(dt, nd);
            kind = winAny ? 'DT' : 'ND';
        } else {                             // DT >= DP >= ND: double, pass
            optional = near(nd, dp) && winG && !ci.jacoby;
            kind = 'DP';
        }
    } else if (nd > dt) {
        if (dt > dp) kind = winG ? 'TGP' : 'DP';          // ND > DT > DP
        else if (nd > dp) kind = winG ? 'TGT' : 'ND';     // ND > DP > DT
        else kind = 'ND';                                 // DP > ND > DT
    } else {
        kind = winG ? 'TGP' : 'DP';                       // DT >= ND > DP
    }
    return { kind, optional };
}

// Core: board args in gnubg orientation (index 0 = ace point). `us` is the side on roll (and holds the centred cube).
export function cubeDecisionRaw(us, them, plies = 2, jacoby = false) {
    const c0 = { n: 1, owner: -1, move: 1, jacoby };
    const c1 = { n: 2, owner: 0, move: 1, jacoby };
    const r = evalCubeful(us, them, [c0, c1], c0, plies, true, plies);
    const nd = r.cf[0];
    const dt = r.cf[1] * 2;
    const dp = 1;
    const dec = findBestCubeDecision(nd, dt, dp, r.ar, c0);
    return { win: r.ar[0], winGammon: r.ar[1], loseGammon: r.ar[2], nd, dt, dp, ...dec };
}

// ---------------------------------------------------------------- public helpers for the app

// Defaults. 2 plies is gnubg's default for cube analysis. Jacoby off = gammons always count.
export const DEFAULT_PLIES = 2;
export const DEFAULT_JACOBY = false;

// Result decoration shared by both entry points
function decorate(raw, approx) {
    const tooGood = raw.kind === 'TGT' || raw.kind === 'TGP';
    const short = raw.kind === 'DT' ? 'D/T' : raw.kind === 'DP' ? 'D/P' : 'ND';
    const label = { ND: 'No Double', DT: 'Double / Take', DP: 'Double / Pass', TGT: 'Too Good', TGP: 'Too Good' }[raw.kind];
    const bestEq = short === 'D/T' ? raw.dt : short === 'D/P' ? raw.dp : raw.nd;
    return { ...raw, tooGood, short, label, bestEq, approx };
}

// App boards for pure bear-offs: `rolling` and `other` are arrays of six counts for the 6,5,4,3,2,1 points
// (left to right). Returns null if either side has no checkers (the game is over).
export function cubeDecision(rolling, other, opts = {}) {
    const plies = opts.plies == null ? DEFAULT_PLIES : opts.plies;
    const jacoby = opts.jacoby == null ? DEFAULT_JACOBY : !!opts.jacoby;
    const us = [rolling[5], rolling[4], rolling[3], rolling[2], rolling[1], rolling[0]];
    const them = [other[5], other[4], other[3], other[2], other[1], other[0]];
    if (total(us) === 0 || total(them) === 0) return null;
    return decorate(cubeDecisionRaw(us, them, plies, jacoby), false);
}

// 24-count boards in each player's own orientation (index 0 = their 1 point).
const checkerTotal = (c) => { let n = 0; for (let i = 0; i < 24; i++) n += c[i] || 0; return n; };
const rearmost = (c) => { for (let i = 23; i >= 0; i--) if (c[i]) return i + 1; return 0; };

// True if the engine can evaluate the pair: each side has 1-15 checkers on the board and there is no
// contact left (the rearmost checkers have passed each other).
export function engineSupports(checkersA, checkersB) {
    const na = checkerTotal(checkersA), nb = checkerTotal(checkersB);
    if (na < 1 || na > 15 || nb < 1 || nb > 15) return false;
    return rearmost(checkersA) + rearmost(checkersB) <= 24;
}

// True if the pair is evaluated with the approximate race model rather than exact bear-off tables.
export function isApproximate(checkersA, checkersB) {
    return !(homeOnly(checkersA) && homeOnly(checkersB));
}

// `rolling` is the player on roll (who may double); `other` receives the double. Returns null if unsupported.
export function cubeDecisionForCheckers(rolling, other, opts = {}) {
    if (!engineSupports(rolling, other)) return null;
    const plies = opts.plies == null ? DEFAULT_PLIES : opts.plies;
    const jacoby = opts.jacoby == null ? DEFAULT_JACOBY : !!opts.jacoby;
    const us = normBoard(Array.from({ length: 24 }, (_, i) => rolling[i] || 0));
    const them = normBoard(Array.from({ length: 24 }, (_, i) => other[i] || 0));
    const approx = us.length !== 6 || them.length !== 6;
    return decorate(cubeDecisionRaw(us, them, approx ? (opts.racePlies == null ? plies : opts.racePlies) : plies, jacoby), approx);
}
