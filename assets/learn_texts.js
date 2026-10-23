


export const EPC = `EPC (Expected Pip Count) is a concept introduced by Walter Trice in Backgammon Bootcamp. It is defined by the average number of pips to bear off a position. It is an advanced metric that provides better information on which player is ahead in a contact-less racing position. \

EPC = (pip count) + (expected wastage)
EPC = 8.167 * (expected number of rolls needed to bear off all checkers)
`;

export const Variance = `The expected wastage of a position is highly dependent on the structure of the position. We can use general guidelines to define four categories.
A pippish position has 0 or 1 checker on the ace or deuce point.
An almost pippish position has between 2 and 4 checkers on the ace or deuce point.
An almost rollish position has between 4 and 8 checkers on the ace or deuce point.
A rollish position has more than 50% of the checkers on the ace or deuce point if there are an even number of checkers left. For an odd number of checkers, the definition changes to over 40%.


We can give each bearoff position a variance score, V. A pippish position has V = 3 (high variance). A rollish position has V = 0. All other positions have a variance score of somewhere in between.
`;

export const BenjaminCount = `Applicable for all positions, except Pippish v Pippish and Rollish v Rollish.
Pippish v Pippish can use 9-10-12 rule. Rollish v Rollish can use reference positions (3-roll v 3-roll position or less is a double pass. 4-roll v 4-roll position is a double & redouble take. Anything higher is strictly a redouble take)

Take Point = bottom pip count + Adjustment + Variance Score
Adjustment = EPC/10 - 1 if EPC is more than 40, 2 if EPC is close to 35, 1 if EPC is from 25 to 30, and 0 otherwise.
Variance Score = (Bottom Position Variance + Top Position Variance - 3) * 0.5
Double Point = Takepoint - 3
Redouble Point = Takepoint - 2.25
`;

export const Legend = `PC = pip count
A = # of checkers on the ace point
B = # of checkers on the deuce point
C = # of checkers on the 3 point
D = # of checkers on the 4 point
E = # of checkers on the 5 point
g = # of gaphs
h = max height of checker distribution
G = center of gravity

Scrunched position means no checkers are on the 5 or 6 points.
A gaph is a point with 0 checkers. A semigaph is a point that contains 1 checker.
`;

export const LowCheckers = `Restrictions: Position must have at least 9 checkers and be pippish

EPC = pip count + 7.5
`;

export const Fastimate = `Restrictions: Position must have at least 9 checkers and be neither pippish nor rollish.

EPC = pip count + 4 + 2A + B + C/2 + 1.2*g
`;


export const MCG = `(Matt Cohn-Geier)

(Advanced) Restrictions: Position must have at least 9 checkers and not be pippish nor scrunched.

EPC = pip count + (Ace Point Adj.) + (Deuce Point Adj.) + (3 Point Adj.) + (Semi-gap penalty) + (Gaph Adj.) + (Height Adj.) + (Skew Adj.)

Ace Point Adj. = 7.5 if A = 0, 8.5 if A = 1, 10 if A = 2, and add 2 for each additional checker on the ace point

Deuce Point Adj. = -1 if B = 0, -0.75 if B = 1, 0 if B = 2, and add 1.25 for each additional checker on the deuce point

3 Point Adj. = -0.25 if C = 0 or 1, 0 if C = 2, and add 0.75 for each additional checker on the 3 point

Gaph Adj. =   For an empty 6-point, add 1.
For each empty 4 or 5 point, add 1.5
(With 14 or 15 checkers, add 2 instead of 1.5)

Semi-gap Adj. = Add 0.5 for each high semi-gap (D = 1, E = 1, F = 1)

Height Adj. = 0.3(h - 4) if 14 or 15 checkers. Otherwise 0.3(h - 3).

Skew Adj. = 0.2(D - F)
`;


export const MM8 = `(Modified Matussek)

Restrictions: Position must have 5-9 checkers and not scrunched. Can be used for 4 checkers if pip count is at least 13.

EPC = pip count + 4 + 2A + 1.3B + 0.8C + 0.4D + 0.2E + 0.7(g - 2) + 0.3(h - 2)
`;


export const TricesRule = `Restrictions: All or most checkers must be stacked on the ace point and no gaps

EPC = 7 * (N / 2 (rounded down)) + 1
where N = # of checkers.
`;


export const NNM = `(Nearly No Miss)

Restrictions: Position must be rollish and no low gaps.

EPC = 7 * (N / 2 (rounded down)) + 1 + S
S = 2G - 2 if G <= 2
S = 4G - 3 if G > 2
We can subtract 0.5 from G if N is odd.

Modifications:
If position is not scrunched and A >= 4, we add 0.05 * A to our EPC estimate.
If position is scrunched and (C >= 5 or D >= 5), we add 0.5 to our EPC estimate.
`;


export const CYM = `(Count Your Misses)

Restrictions: Position must be crunched with one or two straggler checkers on a high point

EPC = 7 * (N / 2 (rounded down)) + 1 + 0.2*M

Where M = # of shots where the number of rolls to bear off doesn’t go down`;