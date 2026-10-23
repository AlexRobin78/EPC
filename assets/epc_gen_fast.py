"""
Exact bear-off EPC for every position with all checkers on the 7 point or lower.

A position is a tuple p of 7 counts: p[0] = 7 point ... p[6] = 1 point, with at most
15 checkers on the board (the rest are already borne off).

EPC(p) = 8.1666.. * (expected number of rolls to bear off everything, playing to minimise it)

Why this is much faster than the original script
-------------------------------------------------
The original re-enumerated every sequence of checker moves for every roll of every position
(up to 7^4 sequences for doubles, repeated for ~170,000 positions).  Here:

  1. One-die transitions T(p, d) are memoised: "which positions can I reach by playing die d?"
  2. M(p, d)  = best EPC reachable by playing die d             (memoised)
     D(p, d, k) = best EPC after playing k copies of die d      (memoised, doubles)
     A non-double roll (a, b) is then just   min over p1 in T(p, a) of M(p1, b)
     A double roll  (d,d,d,d) is             D(p, d, 4)
  3. Positions are processed in an order where every successor is already solved.

With ENFORCE_BEAROFF_RULE and EITHER_DIE_ORDER both False the values are identical to the
original script's (checked on every position with up to 8 checkers).

Usage:  python epc_gen_fast.py          # all positions, up to 15 checkers (~45 s)
Output: epc_vals_extended.txt           # "KEY: EPC" lines, same format as before
        epc_table.bin                   # compact table (uint16, EPC x 100)
        epcTable.js                     # the same table as a base64 JS module for the app
"""

import base64
import itertools
import sys
import time
from math import comb

ROLL_PIPS = 294 / 36          # average pips per roll
MAX_CHECKERS = 15
POINTS = 7                    # 7 point .. 1 point

# Two rules the ORIGINAL script bends.  Both default to the real backgammon rules; set both
# to False to reproduce the original script's numbers exactly (verified identical).
#
# ENFORCE_BEAROFF_RULE: you may not bear off while a checker is still on the 7 point (outside
#   the home board).  The original lets you bear off anyway.
# EITHER_DIE_ORDER: for a non-double roll you may play the dice in either order.  The original
#   only tries the larger die first, which misses some plays (typically ~0.05 pips, up to ~1.5).
ENFORCE_BEAROFF_RULE = True
EITHER_DIE_ORDER = True

# Roll list in the same order as the original script (affects float summation order only)
ROLLS = []
for i in range(1, 7):
    for j in range(i, 7):
        ROLLS.append([i, i, i, i] if i == j else [j, i])


def partitions(n, k):
    """All ways to put n checkers in k bins, in the original script's order."""
    for c in itertools.combinations(range(n + k - 1), k - 1):
        yield tuple(b - a - 1 for a, b in zip((-1,) + c, c + (n + k - 1,)))


def first_nonzero(p):
    for i in range(POINTS):
        if p[i]:
            return i
    return -1


class Solver:
    def __init__(self, enforce_rule=ENFORCE_BEAROFF_RULE, either_order=EITHER_DIE_ORDER):
        self.enforce = enforce_rule
        self.either_order = either_order
        self.epc = {(0,) * POINTS: 0.0}
        self._trans = [dict() for _ in range(7)]       # _trans[d][p]  -> tuple of successors
        self._best1 = [dict() for _ in range(7)]       # _best1[d][p]  -> M(p, d)
        self._multi = {}                               # (d, k, p)     -> D(p, d, k)

    # ---- one-die transitions -------------------------------------------------------
    def transitions(self, p, d):
        cache = self._trans[d]
        hit = cache.get(p)
        if hit is not None:
            return hit

        # With the real rule, a checker on the 7 point forbids bearing off: only
        # moves that stay on the board are legal (i + d < 7).
        last = 6 - d if (self.enforce and p[0]) else 7 - d
        out = []
        for i in range(last + 1):
            if p[i]:
                q = list(p)
                q[i] -= 1
                if i + d < POINTS:
                    q[i + d] += 1
                out.append(tuple(q))
        if not out:  # every checker is closer than d: bear off the rearmost one
            q = list(p)
            q[first_nonzero(p)] -= 1
            out.append(tuple(q))
        res = tuple(set(out))
        cache[p] = res
        return res

    # ---- best value after playing one die / k copies of a die ----------------------
    def best_after_one(self, p, d):
        cache = self._best1[d]
        v = cache.get(p)
        if v is None:
            epc = self.epc
            v = min(epc[q] for q in self.transitions(p, d)) if any(p) else 0.0
            cache[p] = v
        return v

    def best_after_k(self, p, d, k):
        if k == 1:
            return self.best_after_one(p, d)
        key = (d, k, p)
        v = self._multi.get(key)
        if v is None:
            v = 0.0 if not any(p) else min(self.best_after_k(q, d, k - 1) for q in self.transitions(p, d))
            self._multi[key] = v
        return v

    # ---- EPC of a position (all successors must already be solved) -----------------
    def solve(self, p):
        total = 0.0
        for roll in ROLLS:
            if len(roll) == 2:
                a, b = roll
                if any(p):
                    best = min(self.best_after_one(q, b) for q in self.transitions(p, a))
                    if self.either_order:
                        best = min(best, min(self.best_after_one(q, a) for q in self.transitions(p, b)))
                else:
                    best = 0.0
                total += 2 * (best + ROLL_PIPS)
            else:
                total += self.best_after_k(p, roll[0], 4) + ROLL_PIPS
        self.epc[p] = total / 36
        return self.epc[p]

    def solve_all(self, max_checkers=MAX_CHECKERS, verbose=True):
        for n in range(max_checkers + 1):
            t0 = time.perf_counter()
            for p in partitions(n, POINTS):
                if p not in self.epc:
                    self.solve(p)
            if verbose:
                print(f"{n:2d} checkers  {time.perf_counter() - t0:8.3f}s", flush=True)
        return self.epc


# ---- compact binary table for the app ---------------------------------------------
# Every position (<= 15 checkers on 7 points) gets a unique index 0..C(22,7)-1 using the
# combinatorial number system on its "stars and bars" layout.  The app uses the same formula
# (see epcEngine.js), so no keys need to be stored.  Values are EPC * 100, as uint16.

def rank(p):
    """Index of position p (tuple of 7 counts, sum <= 15)."""
    # Bars sit after each point's checkers; the 8th bin is the slack up to 15 checkers.
    pos, r = -1, 0
    for k, count in enumerate(p):
        pos += count + 1                 # slot of the (k+1)-th bar
        r += comb(pos, k + 1)
    return r


def write_binary(epc, path):
    total = comb(MAX_CHECKERS + POINTS, POINTS)
    table = [0] * total
    seen = set()
    for p, v in epc.items():
        r = rank(p)
        assert 0 <= r < total and r not in seen, (p, r)
        seen.add(r)
        table[r] = round(v * 100)
    assert len(seen) == total
    assert max(table) < 65536
    with open(path, "wb") as f:
        for v in table:
            f.write(v.to_bytes(2, "little"))
    return total


def write_js_module(binary_path, js_path):
    with open(binary_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode()
    with open(js_path, "w") as f:
        f.write("// AUTO-GENERATED by epc_gen_fast.py - do not edit.\n"
                "// EPC x 100 (uint16, little-endian) for every position with <= 15 checkers on the 7 point\n"
                "// or lower, indexed by the combinatorial rank used in epcEngine.js (170,544 entries).\n"
                f'const EPC_TABLE_BASE64 =\n  "{encoded}";\n\nexport default EPC_TABLE_BASE64;\n')


if __name__ == "__main__":
    max_n = int(sys.argv[1]) if len(sys.argv) > 1 else MAX_CHECKERS
    t0 = time.perf_counter()
    solver = Solver()
    solver.solve_all(max_n)
    print(f"total {time.perf_counter() - t0:.1f}s for {len(solver.epc)} positions")

    with open("epc_vals_extended.txt", "w") as f:
        for key, value in solver.epc.items():
            f.write(f"{''.join(f'{c:X}' for c in key)}: {round(value, 2)}\n")

    if max_n == MAX_CHECKERS:
        n = write_binary(solver.epc, "epc_table.bin")
        print(f"wrote epc_table.bin ({n} positions, {2 * n} bytes)")
        write_js_module("epc_table.bin", "epcTable.js")
        print("wrote epcTable.js")
