import itertools
import time
import numpy as np

rolls = []
for i in range(1, 7):
    for j in range(i, 7):
        if i == j:
            rolls.append([i, i, i, i])
        else:
            rolls.append([j, i])

MAX_CHECKERS = 15
DEPTH = 6
EPC_MAP = {DEPTH * '0' : np.array([1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])} # 18 entries
ROLL_PIPS = 294 / 36
NUM_POINTS = 24
MAX_VEC = np.array([0.0] * 17 + [1.0])  # Vector representation for the initial position

def trice(n):
    if n % 2 == 0:
        return 7 * n + 1 - 1 / (6 ** n)
    else:
        return 7 * n + 1 + 1 / (6 ** n)

def epc_from_vector(v):
    weights = [trice(i) for i in range(len(v))]
    return np.dot(v, weights)

def add_roll(vec):
    shifted_vec = np.roll(vec, shift=1)
    shifted_vec[0] = 0.0
    return shifted_vec

def strToList(s):
    return [int(x, 16) for x in list(s)]

def listToStr(L):
    return ''.join(map(lambda x: f"{x:X}", L[:DEPTH])) + ''.join(map(lambda x: chr(x + 96), L[DEPTH:]))

def numToStr(num):
    return chr(num + 96)

def partitions(n, k):
    for c in itertools.combinations(range(n+k-1), k-1):
        yield [b-a-1 for a, b in zip((-1,)+c, c+(n+k-1,))]

def add_stragglers(p, num_checkers):
    yield p
    
    if num_checkers <= MAX_CHECKERS - 1:
        for i in range(DEPTH+1, NUM_POINTS+1):
            new_p = p[:]
            new_p.append(i)
            yield new_p

    if num_checkers <= MAX_CHECKERS - 2:
        for i in range(DEPTH+1, NUM_POINTS+1):
            for j in range(i, NUM_POINTS+1):
                new_p = p[:]
                new_p.append(i)
                new_p.append(j)
                yield new_p

def first_nonzero_index(p):
    for i in range(DEPTH):
        if p[i] != 0:
            return i
    return -1

def isBearoff(p):
    return first_nonzero_index(p) >= 18

# position root_p is not discovered yet
def explore(root_p, p, roll, turn):
    #print("explore", root_p, p, roll, turn)
    if turn >= len(roll) or p == DEPTH * [0]:
        if listToStr(p) not in EPC_MAP:
            return add_roll(dp_func(p))
        else:
            return EPC_MAP.get(listToStr(p), MAX_VEC)
        return

    min_epc = 1000
    min_vector = MAX_VEC
    die = roll[turn]

    #print(p, "p")

    for i in range(DEPTH, len(p)):
        new_p = p[:]
        new_p[i] -= die
        if new_p[i] <= DEPTH:
            val_index = new_p.pop(i)
            new_p[-val_index] += 1
        vec = explore(root_p, new_p, roll, turn + 1)
        vec_epc = epc_from_vector(vec)
        if vec_epc < min_epc:
            min_epc = vec_epc
            min_vector = vec

    for i in range(DEPTH - die + 1):
        new_p = p[:]
        if new_p[i] > 0:
            new_p[i] -= 1
            if i < DEPTH - die:
                new_p[i + die] += 1
            vec = explore(root_p, new_p, roll, turn + 1)
            vec_epc = epc_from_vector(vec)
            if vec_epc < min_epc:
                min_epc = vec_epc
                min_vector = vec

    if min_epc == 1000:
        new_p = p[:]
        new_p[first_nonzero_index(p)] -= 1
        vec = explore(root_p, new_p, roll, turn + 1)
        vec_epc = epc_from_vector(vec)
        if vec_epc < min_epc:
            min_epc = vec_epc
            min_vector = vec
    return min_vector

def dp_func(p):
    if listToStr(p) in EPC_MAP:
        return EPC_MAP[listToStr(p)]

    average_epc_vec = np.array([0.0] * 18)
    for r in rolls:
        epc_vec = 2 * explore(p, p, r, 0) if len(r) == 2 else explore(p, p, r, 0)
        average_epc_vec += epc_vec
    true_epc = average_epc_vec / 36
    EPC_MAP[listToStr(p)] = average_epc_vec / 36
    return EPC_MAP[listToStr(p)]

for i in range(7):
    start_time = time.perf_counter()
    for p in partitions(i, DEPTH):
        for q in add_stragglers(p, i):
            dp_func(q)
    end_time = time.perf_counter()
    execution_time = end_time - start_time
    print(i, f"Execution time: {execution_time:.6f} seconds")

with open("epc_vals_extended.txt", mode='w') as f:
    for key in EPC_MAP:
        f.write(f'{str(key)}: {str(round(epc_from_vector(EPC_MAP[key]), 2))}\n')

with open("epc_vals_extended_verbose.txt", mode='w') as f:
    for key in EPC_MAP:
        f.write(f'{str(key)}: {str(epc_from_vector(EPC_MAP[key]))}\n')