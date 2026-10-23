import itertools
import time

rolls = []
for i in range(1, 7):
    for j in range(i, 7):
        if i == j:
            rolls.append([i, i, i, i])
        else:
            rolls.append([j, i])

EPC_MAP = {"0000000" : 0}
ROLL_PIPS = 294 / 36

def strToList(s):
    return [int(x, 16) for x in list(s)]

def listToStr(L):
    return ''.join(map(lambda num: f"{num:X}", L))

def partitions(n, k):
    for c in itertools.combinations(range(n+k-1), k-1):
        yield [b-a-1 for a, b in zip((-1,)+c, c+(n+k-1,))]

def first_nonzero_index(p):
    for i in range(7):
        if p[i] != 0:
            return i
    return -1

# position root_p is not discovered yet
def explore(root_p, p, roll, turn):
    if turn >= len(roll) or p == [0, 0, 0, 0, 0, 0, 0]:
        if listToStr(p) not in EPC_MAP:
            return dp_func(p) + ROLL_PIPS
        else:
            return EPC_MAP.get(listToStr(p), 1000) + ROLL_PIPS
        return

    min_epc = 1000
    die = roll[turn]
    for i in range(7 - die + 1):
        new_p = p[:]
        if new_p[i] > 0:
            new_p[i] -= 1
            if i < 7 - die:
                new_p[i + die] += 1
            min_epc = min(min_epc, explore(root_p, new_p, roll, turn + 1))

    if min_epc == 1000:
        new_p = p[:]
        new_p[first_nonzero_index(p)] -= 1
        min_epc = explore(root_p, new_p, roll, turn + 1)

    return min_epc

def dp_func(p):
    if listToStr(p) in EPC_MAP:
        return EPC_MAP[listToStr(p)]

    average_epc = 0
    for r in rolls:
        epc = 2 * explore(p, p, r, 0) if len(r) == 2 else explore(p, p, r, 0)
        average_epc += epc
    true_epc = average_epc / 36
    EPC_MAP[listToStr(p)] = average_epc / 36

for i in range(16):
    start_time = time.perf_counter()
    for p in partitions(i, 7):
        dp_func(p)
    end_time = time.perf_counter()
    execution_time = end_time - start_time
    print(i, f"Execution time: {execution_time:.6f} seconds")

with open("epc_vals_extended.txt", mode='w') as f:
    for key in EPC_MAP:
        f.write(f'{str(key)}: {str(round(EPC_MAP[key], 2))}\n')