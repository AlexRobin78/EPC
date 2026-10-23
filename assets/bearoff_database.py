# Script that generates the bearoff database from positions.csv
# and common_positions.csv

import itertools
import csv
import sqlite3
import math
import copy
import heapq

# Gets all 54,000+ positions
def partitions(n, k):
    for c in itertools.combinations(range(n+k-1), k-1):
        yield [b-a-1 for a, b in zip((-1,)+c, c+(n+k-1,))]

# converts to HexID format
def combinationToID(comb):
    res = []
    for c in comb:
        res.append(hex(c)[2:])
    res.append(hex(15 - sum(comb))[2:])
    return "".join(res).upper()

def getPipCount(board):
    count = 0
    for i in range(len(board)):
        count += ((i+1) * board[len(board) - i - 1])
    return count

# gets # of checkers on board
def getCheckerCount(board):
    return sum(board)

def getGaphs(board):
    count = 0
    for p in board:
        if p == 0: count += 1
    return count

def maxChecker(board):
    for i in range(6):
        if board[i] > 0:
            return 6 - i
    return 0

def maxHeight(board):
    return max(board)

def isGap(board):
    reachedCheckers = False
    for b in board:
        if b > 0: reachedCheckers = True
        if b == 0 and reachedCheckers: return True
    return False

def fastimate(board):
    return getPipCount(board) + 4 + 2*board[-1] + \
            board[-2] + 0.5 * board[-3] + 1.2 * (getGaphs(board))

def lowCheckers(board):
    numCheckers = getCheckerCount(board)
    if numCheckers >= 9:
        return getPipCount(board) + 7.5
    if numCheckers >= 7:
        return getPipCount(board) + 6.5
    else:
        return getPipCount(board) + 6

# Nearly No Miss
def NNM(board):
    center_of_gravity = getPipCount(board) / getCheckerCount(board)
    if getCheckerCount(board) % 2 == 1: center_of_gravity -= 0.5
    rolls = math.ceil(getCheckerCount(board) / 2)
    trice = 7 * rolls + 1

    penalty = 0
    if board[0] == 0 and board[1] == 0:
        penalty += board[-1]*0.05
    elif board[-3] >= 5 or board[-4] >= 5:
        penalty += 0.5

    if center_of_gravity > 2: return trice + 4 * center_of_gravity + penalty - 7
    elif center_of_gravity > 1.5: return trice + 2 * center_of_gravity + penalty - 3
    return trice

# For 5-8 checkers
def MM8(board):
    return getPipCount(board) + 4 + 2*board[-1] + 1.3 * board[-2] + \
            0.8 * board[-3] + 0.4 * board[-4] + 0.2 * board[-5] + 0.7 * (getGaphs(board) - 2) + \
            0.3 * (maxHeight(board) - 2)

def getDescription(board):
    checkers, low_checkers = getCheckerCount(board), board[-1] + board[-2]
    if checkers < 4 or (checkers == 4 and board[0] + board[1] == 0): return "few checkers"
    if checkers % 2 == 0 and not isGap(board) and checkers * 0.5 < low_checkers: return "rollish"
    if checkers % 2 == 1 and checkers * 0.4 < low_checkers: return "rollish"
    if low_checkers > 4 or (low_checkers == 4 and checkers % 2 == 1): return "low"
    if low_checkers > 2: return "medium"
    return "high"

def Tower_2(board, rolls, isEven):
    adjustment = board[-4] * 0.5
    if isEven:
        if board[-1] == 0:
            if board == [0, 0, 4, 2, 8, 0]:
                print(rolls * 8 + 2.5 + adjustment, rolls)
            return rolls * 8 + 2.5 + adjustment
        elif board[-1] == 1:
            return rolls * 8 + adjustment
        else:
            return rolls * 7 + 1 + ((board[-2] - 2) / 4) + adjustment
    else:
        if board[-1] == 0:
            return rolls * 7.5 + adjustment
        elif board[-2] == 1 and rolls >= 4:
            return rolls * 7.5 - 0.5 + adjustment
        else:
            return rolls * 7 + 1 + ((board[-2] - 2) / 10) + adjustment

def Tower_3(board):
    if board[-2] == 0 and board[-1] == 1:
        return 21 + 4.5 * (getCheckerCount(board) - 4) - 2
    elif board[-1] == 0 and board[-2] > 0:
        if board == [0, 0, 0, 11, 4, 0]:
            print(21 + 4.5 * (getCheckerCount(board) - 4) - board[-2] - 0.5)
        return 21 + 4.5 * (getCheckerCount(board) - 4) - board[-2] - 0.5
    else:
        return 21 + 4.5 * (getCheckerCount(board) - 4)

def Tower_4(board):
    if board[-3] == 0 and board[-2] == 0 and board[-1] == 1:
        return 23.5 + 5 *  (getCheckerCount(board) - 4) - 2.5
    if board[-3] == 0 and board[-2] == 1 and board[-1] == 0:
        return 23.5 + 5 *  (getCheckerCount(board) - 4) - 1.5
    if board[-3] > 0 and board[-2] == 0 and board[-1] == 0:
        return 23.5 + 5 *  (getCheckerCount(board) - 4) - board[-3] - 0.5
    return 23.5 + 5 * (getCheckerCount(board) - 4)

def ca(board, rolls, isEven):
    if isEven:
        if board[-2] == 0:
            return 7 * rolls + 1 + board[-3]
        elif board[-2] == 1:
            return 7 * rolls + 1 + (board[-3] / 2)
    else:
        if board[-2] == 0:
            return 7 * rolls + 1 + (board[-3] / 2)
        elif board[-2] == 1:
            return 7 * rolls + 1 + (board[-3] / 4)

def dba(board, rolls, isEven):
    adjustment = 0
    if board[-2] > board[-1]:
        adjustment += 0.5
    if isEven:
        adjustment += (board[-4] + 1.5)
    else:
        adjustment += (board[-4] - 1.5)
    return 7 * rolls + 1 + adjustment

def SSS(board):
    
    #print(board)
    numCheckers = getCheckerCount(board)
    if  board[-5] == 0 and board[-6] == 0 and board[-4] + board[-3] < board[-2] and board[-1] < 3:
        if board == [0, 0, 2, 2, 1, 0]: 
            print("a")
            res = Tower_2(board, math.ceil(numCheckers / 2), numCheckers % 2 == 0)
            print(res)
        return Tower_2(board, math.ceil(numCheckers / 2), numCheckers % 2 == 0)

    if board[-5] == 0 and board[-6] == 0 and board[-4] < board[-3] and \
            ((board[-2] < board[-3] and board[-1] == 0) or (board[-2] == 0 and board[-1] == 1)):
        if board == [0, 0, 2, 2, 1, 0]: print("b")
        return Tower_3(board)

    if board[-6] == 0 and board[-5] < board[-4] and \
            ((board[-3] < board[-4] and board[-1] == 0 and board[-2] == 0) or \
            (board[-3] == 0 and board[-1] == 0 and board[-2] == 1) or \
            (board[-3] == 0 and board[-1] == 1 and board[-2] == 0)):
        if board == [0, 0, 2, 2, 1, 0]: print("c")
        return Tower_4(board)

    if board[-5] == 0 and board[-6] == 0 and board[-4] < board[-3] and board[-3] >= 3 and board[-2] <= 1:
        if board == [0, 0, 2, 2, 1, 0]: print("d")
        return ca(board, math.ceil(numCheckers / 2), numCheckers % 2 == 0)

    if board[-5] == 0 and board[-6] == 0 and board[-4] >= 2 and board[-3] == 0:
        if board == [0, 0, 2, 2, 1, 0]: print("e")
        return dba(board, math.ceil(numCheckers / 2), numCheckers % 2 == 0)

    #print("done")
    return -1

def checkersOff(board, n):
    if n == 6: return 4

    ordering = {
            1 : { 1 : 1, 2 : 2, 3 : 3, 4 : 4, 5 : 5, 6 : 6},
            2 : { 2 : 1, 4 : 2, 6 : 3, 5 : 4, 3 : 5, 1 : 6},
            3 : { 3 : 1, 6 : 2, 5 : 3, 4 : 4, 2 : 5, 1 : 6},
            4 : { 4 : 1, 6 : 2, 5 : 3, 3 : 4, 2 : 5, 1 : 6},
            5 : { 5 : 1, 6 : 2, 4 : 3, 3 : 4, 2 : 5, 1 : 6}
            }

    heap = []
    for i in range(1, 7):
        for j in range(board[-i]):
            heap.append((ordering[n][i], i))

    checkersOff = 0
    heapq.heapify(heap)
    for i in range(4):
        (prio, elem) = heapq.heappop(heap)
        if elem <= n:
            checkersOff += 1
        else:
            heapq.heappush(heap, (ordering[n][elem - n], elem - n))
    return checkersOff

def CYM(board):
    misses = 0
    passes = getCheckerCount(board) % 2

    def checkersOff(board, n):
        if n == 6: return 4

        ordering = {
                1 : { 1 : 1, 2 : 2, 3 : 3, 4 : 4, 5 : 5, 6 : 6},
                2 : { 2 : 1, 4 : 2, 6 : 3, 5 : 4, 3 : 5, 1 : 6},
                3 : { 3 : 1, 6 : 2, 5 : 3, 4 : 4, 2 : 5, 1 : 6},
                4 : { 4 : 1, 6 : 2, 5 : 3, 3 : 4, 2 : 5, 1 : 6},
                5 : { 5 : 1, 6 : 2, 4 : 3, 3 : 4, 2 : 5, 1 : 6}
                }

        heap = []
        for i in range(1, 7):
            for j in range(board[-i]):
                heap.append((ordering[n][i], i))
        
        checkersOff = 0
        heapq.heapify(heap)
        for i in range(4):
            (prio, elem) = heapq.heappop(heap)
            if elem <= n:
                checkersOff += 1
            else:
                heapq.heappush(heap, (ordering[n][elem - n], elem - n))

        return checkersOff

    def getGap(board):
        isEmpty = True
        start = 6
        for i in range(6, 0, -1):
            if board[-i] > 0:
                isEmpty = False
            if board[-i] == 0 and not isEmpty:
                start = i
                break
        
        index = start
        while board[-index] == 0:
            index -= 1
        return (start, index + 1)

    def getLeftCheckers(board, start):
        count = 0
        for i in range(start, 7):
            count += board[-i]
        return count

    # check for doubles
    for i in range(1, 7):
        if board == [1, 0, 0, 0, 0, 8]: print(i, checkersOff(board, i))
        if checkersOff(board, i) + passes < 4:
            misses += 1

    if board == [0, 0, 1, 0, 0, 5]: print(misses, "misses")

    # check for non-doubles
    left, right = getGap(board)
    missesFromGapsize = { 1 : 10, 2 : 18, 3 : 24, 4 : 28 }
    if passes == 1:
        if getLeftCheckers(board, left) == 1:
            if left - right == 3: misses += 2 # 20000x edge case
        else:
            misses += (left - right) * (left - right + 1)
    else:
        if getLeftCheckers(board, left) == 1:
            if board == [0, 0, 1, 0, 0, 5]: print("here")
            misses += (left * (left - 1) - (right - 1) * (right - 2))
        else:
            misses += missesFromGapsize[left - right + 1]

    if board == [0, 0, 1, 0, 0, 5]: print(misses, left, right, passes, getLeftCheckers(board, left), "misses")
    
    rolls = math.ceil(getCheckerCount(board) / 2)
    trice = rolls * 7 + 1
    return trice + 0.2 * misses


def Flat_6(board):
    adjustment = 0
    adjustment += (6 * (board[-6] - 2))
    adjustment += (5 * (board[-5] - 2))
    adjustment += (4 * (board[-4] - 2))
    adjustment += (3.5 * (board[-3] - 2))
    adjustment += (3 * (board[-2] - 2))
    adjustment += (3 * (board[-1] - 2))
    return adjustment + 52

def Flat_5(board):
    adjustment = 0
    adjustment += (5 * (board[-5] - 2))
    adjustment += (4 * (board[-4] - 2))
    adjustment += (3.5 * (board[-3] - 2))
    adjustment += (3 * (board[-2] - 2))
    adjustment += (3 * (board[-1] - 2))
    
    if board[-6] == 1:
        adjustment += 5
    
    return adjustment + 40 + (maxHeight(board) / 2)


def MCG(board):
    # compute ace point wastage
    if board[-1] == 0: ace_point = 7.5
    elif board[-1] == 1: ace_point = 8.5
    else: ace_point = 6 + board[-1] * 2

    # compute deuce point wastage
    if board[-2] == 0: deuce_point = -1
    elif board[-2] == 1: deuce_point = -0.75
    else: deuce_point = 1.25 * (board[-2] - 2)

    # compute 3 point wastage
    if board[-3] <= 1: three_point = -0.25
    else: three_point = 0.75 * (board[-3] - 2)

    # compute skew
    skew = 0.2 * (board[2] - board[0])

    # compute gaps
    gap = 0
    if board[0] == 0: gap += 1
    if board[1] == 0: gap += 1.5 + 0.5 * (getCheckerCount(board) > 13)
    if board[2] == 0: gap += 1.5 + 0.5 * (getCheckerCount(board) > 13)
    # compute semigaps
    if board[1] == 1 and board[0] > 1: gap += 0.5
    if board[2] == 1 and board[1] > 1: gap += 0.5

    # compute height
    if getCheckerCount(board) > 13:
        height = 0.3 * (maxHeight(board) - 4)
    else: height = 0.3 * (maxHeight(board) - 3)
    if board == [7, 4, 0, 0, 0, 4]:
        print(getPipCount(board), ace_point, deuce_point, three_point, skew, gap, height)
    return getPipCount(board) + ace_point + deuce_point + three_point + skew + gap + height

def findMethod(board):
    description = getDescription(board)
    checkers = getCheckerCount(board)

    if isMCGFastimate(board, description):
            return "MCG"

    if description == "pippish" and getCheckerCount(board) >= 9:
            return "low checkers"

    if isMM8(board, description):
            return "MM8"

    if checkers <= 4:
        return "few checkers"

    if isNNM(board, description):
        return "NNM"

    if isCYM(board, description):
        return "CYM"

    return "None"

def isFastimate(board):
    return getCheckerCount(board) >= 9

def isFlat_6(board):
    for x in board:
        if x < 2:
            return False
    return True

def isFlat_5(board):
    for i in range(1, len(board)):
        if board[i] < 2:
            return False
    return True

def isMM8(board, description):
    numCheckers = getCheckerCount(board)
    if numCheckers > 9 or board[0] + board[1] == 0:
        return False
    if numCheckers == 4:
        return getPipCount(board) >= 13
    if numCheckers < 4:
        return False
    return True

def isMCGFastimate(board, description):
    if description == "rollish":
        return False
    if board[0] == 0 and board[1] == 0: # scrunched
        return False
    return getCheckerCount(board) >= 9

def isSemigaps(board):
    for i in range(len(board)-1, 0, -1):
        if board[i] == 1 and board[i-1] > board[i]:
            return True

    return False

def getGaps(board, start):
    count = 0
    isEmpty = True
    if start == -1: return 0
    for i in range(start, -1, -1):
        if board[i] > 0 and isEmpty:
            isEmpty = False
            count += 1
        if board[i] == 0 and not isEmpty:
            isEmpty = True
    return count

def isCYM(board, description):
    isEven = getCheckerCount(board) % 2 == 0
    if getCheckerCount(board) <= 4 or board[-1] == 0: return False # edge cases
    gap = 5
    while gap > 0 and board[gap] > 0:
        gap -= 1
    if getGaps(board, gap) != 1: return False
    # 'gap' is the index where the rightmost gap is
    endGap = gap - 1
    

    while board[endGap] == 0:
        endGap -= 1
    
    gaplessBoard = copy.copy(board)
    for i in range(endGap+1):
        gaplessBoard[i] = 0
    center_of_gravity = getPipCount(gaplessBoard) / getCheckerCount(gaplessBoard)
    if not (center_of_gravity <= 1.5 and isNNM(gaplessBoard, getDescription(gaplessBoard))): return False

    checkerCount = 0
    for i in range(endGap, -1, -1):
        checkerCount += board[i]
        if checkerCount > 2 or (checkerCount == 2 and isEven): return False
    return True

def isNNM(board, description):
    if isGap(board):
        return False
    if board[0] == 0 and board[1] == 0: # scrunched
        if board[-4] == 0:
            return True
        if not isSemigaps(board):
            return True
        if description == "rollish":
            return True
        if getCheckerCount(board) <= 7:
            return True
    return False

positionsDict = dict()
common_positions = set()
with open("positions.csv", "r") as data, open("common_positions.csv", "r") as common_data:
    for line in csv.reader(common_data):
        common_positions.add(line[0])
    for line in csv.reader(data):
        positionsDict[line[0]] = (line[1], line[0] in common_positions)

def getEPC(board):
    res = positionsDict[combinationToID(board)]
    return float(res[0])

# Example usage
#for p in partitions(5, 6):
    #print(p)
    #print(getEPC(p))

#print(combinationToID([0, 0, 0, 11, 1, 1]))

for i in range(1, 7):
    print(i, checkersOff([0, 0, 1, 0, 0, 5], i))

conn = sqlite3.connect('epc_positions.db')
cursor = conn.cursor()
cursor.execute("""DROP TABLE POSITIONS""")
cursor.execute("""CREATE TABLE POSITIONS(ID VARCHAR(255), IS_COMMON_POSITION VARCHAR(255), EPC INT, VARIANCE VARCHAR(255), \
        METHOD VARCHAR(255), BESTIMATE INT, FASTIMATE INT, DIFFERENCE INT)""")
for i in range(16):
    for p in partitions(i, 6):
        ID = combinationToID(p)
        EPC = getEPC(p)
        variance = getDescription(p)
        method = findMethod(p)
        is_common_position = "yes" if (ID in common_positions) else "no"
        if isMCGFastimate(p, variance):
            fast = fastimate(p)
        else: fast = -1
        if method == "low checkers":
            bestimate = lowCheckers(p)
        elif method == "6 flat":
            bestimate = Flat_6(p)
        elif method == "5 flat":
            bestimate = Flat_5(p)
        elif method == "SSS":
            bestimate = SSS(p)
        elif method == "MCG":
            bestimate = MCG(p)
        elif method == "MM8":
            bestimate = MM8(p)
        elif method == "NNM":
            bestimate = NNM(p)
        elif method == "CYM":
            bestimate = CYM(p)
        else: bestimate = -1
        cursor.execute("INSERT INTO POSITIONS (ID, IS_COMMON_POSITION, EPC, VARIANCE, METHOD, BESTIMATE, FASTIMATE, DIFFERENCE) \
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (ID, is_common_position, EPC, variance, method, bestimate, fast, EPC - bestimate))

conn.commit()
conn.close()
