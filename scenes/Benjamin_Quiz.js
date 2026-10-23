// Component for the Benjamin Count quiz screen of the app. Takes route and navigation as props.
//
// How it works
//   - When the screen is focused, a fresh quiz of N cube positions is generated up front.
//     Each position is a top race and a bottom race (bottom player on roll, cube centred, money
//     game); the correct answer comes from the GNU Backgammon cube engine: Double/Take,
//     Double/Pass or No Double (roll).
//   - The user answers with two taps ("Double" then "Take"/"Pass", or just "Roll"). After
//     the last answer we go to the results screen.
//   - Tapping a finished position in the results strip "goes back" to it: the board shows that
//     position and a review panel shows the methods, variance, the user's answer and the correct
//     one. The timer is paused while reviewing. Press Resume to continue.
//
// Layout (landscape):
//   [ button rail ] [ board ] [ info strip / results strip / decision buttons (or review panel) ]

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameContext } from '../app/GameContext';
import positions from '../assets/epc_positions.json';
import { cubeDecision } from '../assets/gnubgRace';
import { getAllowedKeys } from '../assets/quizFilters';
import { carnivalTheme, themeMap } from '../assets/themes';
import BackgammonBoard from "../views/BackgammonBoard";
import FormulaModal, { benjaminSection, explainChecker, FormulaButton } from '../views/FormulaModal';

const DEFAULT_NUM_POSITIONS = 10;
const MAX_ATTEMPTS_PER_QUESTION = 1000; // safety net so we can never loop forever
const noop = () => {};

// ---------- quiz logic (pure helpers) ----------

const VARIANCE_SCORES = { rollish: 0, low: 1, medium: 2, high: 3 };

// ----- which positions make good questions -----
// The answer always comes from the GNU Backgammon engine (see assets/gnubgRace.js). Pairs are only
// asked if they are a real cube decision: the roller is not hopelessly behind or far ahead, and the
// right action beats the alternatives by a clear margin (equity), so the quiz never hinges on a coin flip.
const MIN_WIN = 0.45;            // roller's cubeless winning chance
const MAX_WIN = 0.92;
const MIN_EQ_MARGIN = 0.02;      // equity gap between the best action and the next best
const MAX_SHARE = 0.5;           // no one answer may make up more than this share of a quiz
const PIP_RATIO_MIN = 0.85;      // cheap pre-filter on top pips / bottom pips before running the engine
const PIP_RATIO_MAX = 1.5;

const sixPointCounts = (key) => [0, 1, 2, 3, 4, 5].map((i) => parseInt(key[i], 16));  // 6pt .. 1pt
const pipsOf = (c) => c.reduce((sum, n, i) => sum + n * (6 - i), 0);

// Engine verdict for a pair of races, or null if it isn't a good quiz position.
function analyse(bottomKey, topKey) {
  const bottom = sixPointCounts(bottomKey);
  const top = sixPointCounts(topKey);
  const ratio = pipsOf(top) / Math.max(1, pipsOf(bottom));
  if (ratio < PIP_RATIO_MIN || ratio > PIP_RATIO_MAX) return null;

  const r = cubeDecision(bottom, top);
  if (!r || r.win < MIN_WIN || r.win > MAX_WIN) return null;

  const dbl = Math.min(r.dt, r.dp);                       // what a double is worth against best defence
  let margin;
  if (r.short === 'ND') margin = r.nd - dbl;
  else if (r.short === 'D/T') margin = Math.min(r.dt - r.nd, r.dp - r.dt);
  else margin = Math.min(r.dp - r.nd, r.dt - r.dp);
  if (margin < MIN_EQ_MARGIN) return null;
  return r;
}

// Builds up to `count` questions from random top/bottom pairs that make a real cube decision
function buildQuiz(keys, count) {
  if (keys.length === 0) return [];
  const questions = [];
  const tally = { "ND": 0, "D/T": 0, "D/P": 0 };
  const maxPerAnswer = Math.max(1, Math.ceil(count * MAX_SHARE));
  for (let attempts = 0; questions.length < count && attempts < count * MAX_ATTEMPTS_PER_QUESTION; attempts++) {
    const topKey = keys[Math.floor(Math.random() * keys.length)];
    const bottomKey = keys[Math.floor(Math.random() * keys.length)];
    const top = positions[topKey];
    const bottom = positions[bottomKey];
    if (!top || !bottom) continue;
    const r = analyse(bottomKey, topKey);
    if (!r || tally[r.short] >= maxPerAnswer) continue;
    tally[r.short]++;
    questions.push({
      topKey,
      bottomKey,
      decision: r.short,
      tooGood: r.tooGood,
      nd: r.nd,
      dt: r.dt,
      dp: r.dp,
      win: r.win,
      topMethod: top.METHOD,
      bottomMethod: bottom.METHOD,
      varianceScore: VARIANCE_SCORES[top.VARIANCE] + VARIANCE_SCORES[bottom.VARIANCE],
    });
  }
  return questions;
}

const isCorrect = (answer, question) => answer === question.decision;

const fmtEq = (v) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(3);

// Each key's first six hex digits are the checker counts on six points.
// Bottom race goes on the A side (points 6..1); top race on the B side (points 19..24).
function keysToBoards(topKey, bottomKey) {
  const a = new Array(24).fill(0);
  const b = new Array(24).fill(0);
  for (let i = 0; i < 6; i++) {
    a[5 - i] = parseInt(bottomKey[i], 16);
    b[i + 18] = parseInt(topKey[i], 16);
  }
  return [a, b];
}

const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// ---------- screen ----------

export default function Benjamin_Quiz({ route, navigation }) {
  const { settings, review } = route.params;
  // review: opened from the results screen to look back at the finished quiz ({ quiz, answers, time })
  const numPositions = settings.numPositions ?? DEFAULT_NUM_POSITIONS;

  const { setPairCheckersCopy, selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;

  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = stylesFunc(height, width, activeTheme, insets);

  const [quiz, setQuiz] = useState(review ? review.quiz : null);       // [{ topKey, bottomKey, decision, ... }]
  const [answers, setAnswers] = useState(review ? review.answers : []);   // "D/T" | "D/P" | "ND", one per answered question
  const [index, setIndex] = useState(0);        // question currently being answered
  const [reviewIndex, setReviewIndex] = useState(review ? 0 : null); // question being reviewed, or null
  const [isDouble, setIsDouble] = useState(false);      // true after tapping "Double"
  const [seconds, setSeconds] = useState(review ? review.time : 0);
  const [isPaused, setIsPaused] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);

  // Positions allowed by the settings (settings don't change while the screen is open)
  const keys = useMemo(() => getAllowedKeys(settings), [settings]);

  // Start a fresh quiz every time the screen is focused
  const startQuiz = useCallback(() => {
    if (review) return;   // looking back at a finished quiz: never restart
    setQuiz(buildQuiz(keys, numPositions));
    setAnswers([]);
    setIndex(0);
    setReviewIndex(null);
    setIsDouble(false);
    setSeconds(0);
    setIsPaused(false);
  }, [keys, numPositions]);
  // Coming back from the Setup Position screen must not restart the quiz (no progress is lost): that
  // visit is flagged in awayRef, and the focus handler skips the restart once. The clock stays stopped
  // while away.
  const awayRef = useRef(false);
  const [away, setAway] = useState(false);
  useFocusEffect(useCallback(() => {
    if (awayRef.current) {
      awayRef.current = false;
      setAway(false);
      return;
    }
    startQuiz();
  }, [startQuiz]));

  const isReviewing = reviewIndex !== null;
  const isFinished = !!quiz && answers.length >= quiz.length;

  // Timer: stops while paused, reviewing, or finished
  useEffect(() => {
    if (!quiz || isPaused || away || isReviewing || isFinished) return;
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [quiz, isPaused, away, isReviewing, isFinished]);

  const shownIndex = reviewIndex ?? index;
  const shown = quiz?.[shownIndex];
  const [checkersA, checkersB] = useMemo(
    () => (shown ? keysToBoards(shown.topKey, shown.bottomKey) : [new Array(24).fill(0), new Array(24).fill(0)]),
    [shown?.topKey, shown?.bottomKey]
  );

  // Formula breakdown for each side: only offered while reviewing a question, so it never gives away an unanswered one
  const botExplain = useMemo(() => (isReviewing && shown ? explainChecker(checkersA) : null), [isReviewing, shown?.bottomKey]);
  const topExplain = useMemo(() => (isReviewing && shown ? explainChecker([...checkersB].reverse()) : null), [isReviewing, shown?.topKey]);

  const benjExplain = useMemo(
    () => (isReviewing && shown ? benjaminSection(positions[shown.bottomKey], positions[shown.topKey], shown.decision)?.explanation ?? null : null),
    [isReviewing, shown?.topKey, shown?.bottomKey]
  );

  const submitAnswer = (answer) => {
    if (!quiz || isReviewing || isPaused || isFinished) return;
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setIsDouble(false);

    if (index + 1 < quiz.length) {
      setIndex(index + 1);
      return;
    }

    // Last answer: tally everything and go to the results screen
    navigation.navigate('Benjamin_Quiz_Results', {
      settings,
      inaccuracy: 0, // not used by this quiz: answers are simply right or wrong
      time: seconds,
      correct: nextAnswers.filter((a, i) => isCorrect(a, quiz[i])).length,
      mistake: 0,
      count: quiz.length,
      mode: "Benjamin Count",
      review: { quiz, answers: nextAnswers, time: seconds },
    });
  };

  // "Double" -> then "Take"/"Pass".  "Roll" = no double.
  const onFirstButton = () => (isDouble ? submitAnswer("D/T") : setIsDouble(true));
  const onSecondButton = () => submitAnswer(isDouble ? "D/P" : "ND");

  const copyPosition = () => setPairCheckersCopy([checkersA, checkersB]);

  // Open the position under review in the Setup Position screen; its Back button returns here
  const openInSetup = (position) => {
    awayRef.current = true;
    setAway(true);
    navigation.push('Two_Players', { fromQuiz: true, position });
  };

  // ----- no positions match the chosen settings -----
  if (quiz && quiz.length === 0) {
    return (
      <View style={[styles.screen, styles.emptyScreen]}>
        <Text style={styles.emptyText}>No positions match these settings.</Text>
        <TouchableOpacity style={[styles.button, styles.emptyButton]} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!quiz) return <View style={styles.screen} />;

  const tilesPerRow = quiz.length <= 6 ? quiz.length : Math.ceil(quiz.length / 2);
  const inputLocked = isPaused || isFinished;

  return (
    <View style={styles.screen}>
      {/* Left rail */}
      <View style={styles.rail}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}
          accessibilityRole="button" accessibilityLabel="Go to home screen">
          <Text style={styles.buttonText} numberOfLines={1}>Home</Text>
        </TouchableOpacity>

        <View style={styles.railGroup}>
          {review && (
            <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}
              accessibilityRole="button" accessibilityLabel="Back to the results">
              <Text style={styles.buttonText} numberOfLines={1}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.button} onPress={copyPosition}
            accessibilityRole="button" accessibilityLabel="Copy this position">
            <Text style={styles.buttonText} numberOfLines={1}>Copy</Text>
          </TouchableOpacity>
          {isReviewing && (botExplain || topExplain || benjExplain) && (
            <FormulaButton onPress={() => setFormulaOpen(true)} style={styles.button} textStyle={styles.buttonText} />
          )}
          {isReviewing && (
            <TouchableOpacity style={styles.button} onPress={() => openInSetup([checkersA, checkersB])}
              accessibilityRole="button" accessibilityLabel="Open this position in Setup Position">
              <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit>Setup</Text>
            </TouchableOpacity>
          )}
          {!isReviewing && (
            <TouchableOpacity style={styles.button} onPress={() => setIsPaused(true)}
              accessibilityRole="button" accessibilityLabel="Pause quiz">
              <Text style={styles.buttonText} numberOfLines={1}>Pause</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Board */}
      <View style={styles.boardArea}>
        <BackgammonBoard
          liftToTop={noop}
          checkersA={checkersA}
          checkersB={checkersB}
          onCallParentFunction={noop}
          isInteractive={false}
        />
      </View>

      {/* Right panel */}
      <View style={styles.panel}>
        {/* Position number and time */}
        <View style={styles.infoStrip}>
          <View style={[styles.chip, styles.chipGray]}>
            <Text style={styles.chipText} numberOfLines={1}>{shownIndex + 1} / {quiz.length}</Text>
          </View>
          <View style={[styles.chip, styles.chipPink]}>
            <Text style={styles.chipText} numberOfLines={1}>{formatTime(seconds)}</Text>
          </View>
        </View>

        {/* Results strip: tap a finished position to go back and check it */}
        <View style={styles.tiles}>
          {quiz.map((question, i) => {
            const isAnswered = i < answers.length;
            const right = isAnswered && isCorrect(answers[i], question);
            const isShown = i === shownIndex && !isFinished;
            const label = !isAnswered ? String(i + 1) : right ? "✓" : question.decision;
            return (
              <View key={i} style={[styles.tileSlot, { width: `${100 / tilesPerRow}%` }]}>
                <TouchableOpacity
                  disabled={!isAnswered}
                  style={[
                    styles.tile,
                    { backgroundColor: !isAnswered ? 'orange' : right ? 'green' : 'red' },
                    (isShown || i === reviewIndex) && styles.tileSelected,
                    !isAnswered && styles.tileUnanswered,
                  ]}
                  onPress={() => setReviewIndex(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Position ${i + 1}${isAnswered ? (right ? ', correct' : ', incorrect') : ''}`}
                >
                  <Text style={styles.tileText} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Decision buttons while answering, review panel while going back */}
        <View style={styles.main}>
          {isReviewing ? (
            <View style={styles.review}>
              <View style={styles.reviewRows}>
                {[
                  { label: "Methods", value: `${shown.topMethod} / ${shown.bottomMethod}` },
                  { label: "Variance", value: String(shown.varianceScore) },
                  { label: "My guess", value: answers[reviewIndex] ?? "—" },
                  { label: "Correct", value: shown.decision + (shown.tooGood ? " (too good)" : "") },
                ].map((row) => (
                  <View key={row.label} style={styles.reviewRow}>
                    <View style={styles.reviewLabel}>
                      <Text style={styles.reviewText} numberOfLines={1} adjustsFontSizeToFit>{row.label}</Text>
                    </View>
                    <View style={styles.reviewValue}>
                      <Text style={styles.reviewText} numberOfLines={1} adjustsFontSizeToFit>{row.value}</Text>
                    </View>
                  </View>
                ))}
                <View style={styles.eqRow}>
                  {[
                    { key: "ND", label: "No Double", value: shown.nd },
                    { key: "D/T", label: "Double/Take", value: shown.dt },
                    { key: "D/P", label: "Double/Pass", value: shown.dp },
                  ].map((cell) => (
                    <View key={cell.key} style={[styles.eqCell, cell.key === shown.decision && styles.eqCellBest]}>
                      <Text style={styles.eqLabel} numberOfLines={1} adjustsFontSizeToFit>{cell.label}</Text>
                      <Text style={styles.eqValue} numberOfLines={1} adjustsFontSizeToFit>{fmtEq(cell.value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={styles.button} onPress={() => (review ? navigation.goBack() : setReviewIndex(null))}
                accessibilityRole="button" accessibilityLabel={review ? "Back to the results" : "Resume quiz"}>
                <Text style={styles.buttonText}>{review ? 'Results' : 'Resume'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.decision}>
              <View style={styles.promptRow}>
                <Text style={styles.promptText} numberOfLines={1}>
                  {isDouble ? "Take or pass?" : "Double or roll?"}
                </Text>
                {isDouble && (
                  <TouchableOpacity onPress={() => setIsDouble(false)} hitSlop={10}
                    accessibilityRole="button" accessibilityLabel="Undo double">
                    <Text style={styles.backText}>← Back</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                disabled={inputLocked}
                style={styles.decisionButton}
                onPress={onFirstButton}
                accessibilityRole="button"
              >
                <Text style={styles.decisionText}>{isDouble ? "Take" : "Double"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={inputLocked}
                style={styles.decisionButton}
                onPress={onSecondButton}
                accessibilityRole="button"
              >
                <Text style={styles.decisionText}>{isDouble ? "Pass" : "Roll"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <FormulaModal
        visible={formulaOpen && !!(botExplain || topExplain || benjExplain)}
        onClose={() => setFormulaOpen(false)}
        sections={[{ title: 'Top', explanation: topExplain }, { title: 'Bottom', explanation: botExplain }, { title: 'Benjamin Count', explanation: benjExplain }]}
        theme={activeTheme}
      />

      {/* Pause overlay hides the board so you can't study while the clock is stopped */}
      {isPaused && (
        <TouchableOpacity style={styles.pauseOverlay} activeOpacity={1} onPress={() => setIsPaused(false)}>
          <Text style={styles.pauseTitle}>Paused</Text>
          <Text style={styles.pauseSubtitle}>Tap to Resume</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const stylesFunc = (height, width, theme, insets) => {
  const gap = Math.max(0.025 * height, 8);
  const padTop = Math.max(gap, insets.top);
  const padBottom = Math.max(gap, insets.bottom);
  const railWidth = Math.min(Math.max(0.21 * height, 76), 120);
  const availableHeight = height - padTop - padBottom;
  // The board is 1.376 wide per unit of its own height, which is 0.9 of the unit we give it
  const boardWidth = 1.376 * 0.9 * availableHeight;
  const buttonRadius = Math.max(0.03 * height, 8);
  const chipHeight = Math.min(Math.max(0.085 * height, 30), 40);
  const tileHeight = Math.min(Math.max(0.085 * height, 28), 38);
  const smallFont = Math.min(Math.max(0.035 * height, 12), 15);

  return StyleSheet.create({
    screen: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: theme?.backgroundColor,
      gap: gap,
      // Keep clear of the status bar, gesture bar and any notch/cutout
      paddingTop: padTop,
      paddingBottom: padBottom,
      paddingLeft: Math.max(gap, insets.left),
      paddingRight: Math.max(gap, insets.right),
    },
    emptyScreen: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      color: theme?.textCol,
      fontSize: 18,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    emptyButton: {
      width: railWidth * 1.6,
    },

    // rail
    rail: {
      width: railWidth,
      justifyContent: 'space-between',
      alignItems: 'stretch',
    },
    railGroup: {
      gap: gap,
    },
    button: {
      minHeight: Math.max(0.12 * height, 40),
      paddingHorizontal: 6,
      borderRadius: buttonRadius,
      backgroundColor: theme?.buttonCol,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.04 * height, 12), 16),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textAlign: 'center',
    },

    // board + panel share the rest of the width
    boardArea: {
      width: boardWidth,
      flexShrink: 1,
      minWidth: 0,
      alignItems: 'stretch',
    },
    panel: {
      flex: 1,
      minWidth: 240,
      gap: gap,
    },

    // info strip
    infoStrip: {
      flexDirection: 'row',
      gap: 6,
    },
    chip: {
      flex: 1,
      height: chipHeight,
      borderRadius: chipHeight / 2,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    chipGray: { backgroundColor: 'lightgray' },
    chipPink: { backgroundColor: 'pink' },
    chipText: {
      color: 'black',
      fontSize: smallFont,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textAlign: 'center',
    },

    // results strip
    tiles: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: theme?.resultsBorderCol,
      borderRadius: 10,
      padding: 3,
    },
    tileSlot: {
      padding: 2,
    },
    tile: {
      height: tileHeight,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    tileSelected: {
      borderColor: 'black',
    },
    tileUnanswered: {
      opacity: 0.55,
    },
    tileText: {
      color: 'black',
      fontSize: smallFont,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textAlign: 'center',
    },

    // decision buttons / review area
    main: {
      flex: 1,
      minHeight: 0,
    },
    decision: {
      flex: 1,
      gap: gap,
    },
    promptRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    promptText: {
      color: theme?.textCol,
      fontSize: Math.min(Math.max(0.04 * height, 13), 17),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    backText: {
      color: theme?.textCol,
      fontSize: Math.min(Math.max(0.038 * height, 12), 16),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textDecorationLine: 'underline',
    },
    decisionButton: {
      flex: 1,
      backgroundColor: theme?.buttonCol,
      borderRadius: Math.max(0.04 * height, 10),
      justifyContent: 'center',
      alignItems: 'center',
    },
    decisionText: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.06 * height, 18), 28),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    review: {
      flex: 1,
      gap: gap,
    },
    reviewRows: {
      flex: 1,
      gap: Math.max(gap / 2, 4),
      justifyContent: 'center',
    },
    reviewRow: {
      flex: 1,
      maxHeight: 48,
      flexDirection: 'row',
    },
    reviewLabel: {
      flex: 1,
      backgroundColor: 'lightgray',
      justifyContent: 'center',
      paddingHorizontal: 10,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
    reviewValue: {
      flex: 1,
      backgroundColor: 'pink',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 10,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
    },
    eqRow: {
      flex: 1.6,
      flexDirection: 'row',
      gap: 4,
    },
    eqCell: {
      flex: 1,
      backgroundColor: 'lightgray',
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
    },
    eqCellBest: {
      backgroundColor: '#9be39b',
      borderColor: 'black',
    },
    eqLabel: {
      color: '#333',
      fontSize: Math.min(Math.max(0.03 * height, 10), 13),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    eqValue: {
      color: 'black',
      fontSize: Math.min(Math.max(0.04 * height, 12), 16),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    reviewText: {
      color: 'black',
      fontSize: Math.min(Math.max(0.038 * height, 12), 16),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },

    // pause overlay
    pauseOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme?.backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    pauseTitle: {
      color: theme?.textCol,
      fontSize: 28,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    pauseSubtitle: {
      color: theme?.textCol,
      opacity: 0.75,
      fontSize: 14,
      fontFamily: 'Arial',
      marginTop: 4,
    },
  });
};
