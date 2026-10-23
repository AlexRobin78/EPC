// Component for the EPC_Quiz screen of the app. Takes route and navigation as props.
//
// How it works
//   - When the screen is focused, a fresh quiz of N positions is generated up front.
//   - The user types an EPC estimate on the keypad and presses ENTER; the answer is stored
//     and the next position is shown. After the last answer we go to the results screen.
//   - Tapping a finished position in the results strip "goes back" to it: the board shows
//     that position and a review panel shows the user's guess, the estimate and the actual EPC.
//     The timer is paused while reviewing. Press Resume to continue.
//
// Layout (landscape):
//   [ button rail ] [ board ] [ info strip / results strip / keypad (or review panel) ]

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameContext } from '../app/GameContext';
import positions from '../assets/epc_positions.json';
import { getAllowedKeys, pickMethod } from '../assets/quizFilters';
import { carnivalTheme, themeMap } from '../assets/themes';
import BackgammonBoard from "../views/BackgammonBoard";
import FormulaModal, { explainChecker, FormulaButton } from '../views/FormulaModal';
import Keypad from "../views/Keypad";
import { round2 } from '../assets/formatNumber';

const DEFAULT_NUM_POSITIONS = 10;
const OPPONENT_CHECKERS = [-1, ...new Array(23).fill(0)]; // single-player board marker
const STATUS_COLORS = { correct: 'green', close: 'yellow', wrong: 'red' };
const noop = () => {};

// ---------- quiz logic (pure helpers) ----------

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Builds `count` questions. Positions don't repeat unless there are fewer than `count` to choose from.
function buildQuiz(keys, settings, count) {
  if (keys.length === 0) return [];
  const pool = shuffle(keys);
  return Array.from({ length: count }, (_, i) => {
    const key = pool[i % pool.length];
    const position = positions[key];
    const method = pickMethod(settings, position);
    const estimate = parseFloat(method === "Fastimate" ? position.FASTIMATE : position.BESTIMATE);
    return { key, method, estimate, actual: position.EPC };
  });
}

// Compares a typed guess with the question's estimate. A blank guess comes out as NaN -> "wrong".
function grade(guessText, question) {
  const diff = Math.abs(parseFloat(guessText) - question.estimate);
  const status = diff <= 0.01 ? 'correct' : diff <= 1.0 ? 'close' : 'wrong';
  return { diff, status };
}

// The key's first six hex digits are the checker counts on points 6..1
function keyToCheckers(key) {
  const checkers = new Array(24).fill(0);
  for (let i = 0; i < 6; i++) checkers[5 - i] = parseInt(key[i], 16);
  return checkers;
}

const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const formatEstimate = (estimate) => (Number.isNaN(estimate) ? "N/A" : round2(estimate));

// ---------- screen ----------

export default function EPC_Quiz({ route, navigation }) {
  const { settings, review } = route.params;
  // review: opened from the results screen to look back at the finished quiz ({ quiz, guesses, time })
  const numPositions = settings.numPositions ?? DEFAULT_NUM_POSITIONS;

  const { setSoloCheckersCopy, selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;

  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = stylesFunc(height, width, activeTheme, insets);

  const [quiz, setQuiz] = useState(review ? review.quiz : null);       // [{ key, method, estimate, actual }]
  const [guesses, setGuesses] = useState(review ? review.guesses : []);   // typed answers, one per answered question
  const [index, setIndex] = useState(0);        // question currently being answered
  const [reviewIndex, setReviewIndex] = useState(review ? 0 : null); // question being reviewed, or null
  const [value, setValue] = useState("");       // what's currently typed on the keypad
  const [seconds, setSeconds] = useState(review ? review.time : 0);
  const [isPaused, setIsPaused] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);

  // Positions allowed by the settings (settings don't change while the screen is open)
  const keys = useMemo(() => getAllowedKeys(settings), [settings]);

  // Start a fresh quiz every time the screen is focused
  const startQuiz = useCallback(() => {
    if (review) return;   // looking back at a finished quiz: never restart
    setQuiz(buildQuiz(keys, settings, numPositions));
    setGuesses([]);
    setIndex(0);
    setReviewIndex(null);
    setValue("");
    setSeconds(0);
    setIsPaused(false);
  }, [keys, settings, numPositions]);
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
  const isFinished = !!quiz && guesses.length >= quiz.length;

  // Timer: stops while paused, reviewing, or finished
  useEffect(() => {
    if (!quiz || isPaused || away || isReviewing || isFinished) return;
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [quiz, isPaused, away, isReviewing, isFinished]);

  const shownIndex = reviewIndex ?? index;
  const shown = quiz?.[shownIndex];
  const board = useMemo(() => (shown ? keyToCheckers(shown.key) : new Array(24).fill(0)), [shown?.key]);

  // Formula breakdown: only offered while reviewing a question, so it never gives away an unanswered position
  const explanation = useMemo(() => (isReviewing && shown ? explainChecker(board) : null), [isReviewing, shown?.key]);

  const submitAnswer = (text) => {
    if (!quiz || isReviewing || isPaused) return;
    const nextGuesses = [...guesses, text];
    setGuesses(nextGuesses);

    if (index + 1 < quiz.length) {
      setIndex(index + 1);
      return;
    }

    // Last answer: tally everything and go to the results screen
    const graded = nextGuesses.map((guess, i) => grade(guess, quiz[i]));
    navigation.navigate('EPC_Quiz_Results', {
      settings,
      inaccuracy: graded.reduce((sum, r) => sum + (Number.isNaN(r.diff) ? 0 : r.diff), 0),
      time: seconds,
      correct: graded.filter(r => r.status === 'correct').length,
      mistake: graded.filter(r => r.status === 'close').length,
      count: quiz.length,
      mode: "EPC",
      review: { quiz, guesses: nextGuesses, time: seconds },
    });
  };

  const copyPosition = () => setSoloCheckersCopy(board);

  // Open the position under review in the Setup Position screen; its Back button returns here
  const openInSetup = (position) => {
    awayRef.current = true;
    setAway(true);
    navigation.push('One_Player', { fromQuiz: true, position });
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
          {isReviewing && explanation && (
            <FormulaButton onPress={() => setFormulaOpen(true)} style={styles.button} textStyle={styles.buttonText} />
          )}
          {isReviewing && (
            <TouchableOpacity style={styles.button} onPress={() => openInSetup(board)}
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
          checkersA={board}
          checkersB={OPPONENT_CHECKERS}
          onCallParentFunction={noop}
          isInteractive={false}
        />
      </View>

      {/* Right panel */}
      <View style={styles.panel}>
        {/* Position number, time, method */}
        <View style={styles.infoStrip}>
          <View style={[styles.chip, styles.chipGray]}>
            <Text style={styles.chipText} numberOfLines={1}>{shownIndex + 1} / {quiz.length}</Text>
          </View>
          <View style={[styles.chip, styles.chipPink]}>
            <Text style={styles.chipText} numberOfLines={1}>{formatTime(seconds)}</Text>
          </View>
          <View style={[styles.chip, styles.chipGray]}>
            <Text style={styles.chipText} numberOfLines={1} adjustsFontSizeToFit>{shown?.method ?? ""}</Text>
          </View>
        </View>

        {/* Results strip: tap a finished position to go back and check it */}
        <View style={styles.tiles}>
          {quiz.map((question, i) => {
            const isAnswered = i < guesses.length;
            const result = isAnswered ? grade(guesses[i], question) : null;
            const isShown = i === shownIndex && !isFinished;
            const label = !isAnswered
              ? String(i + 1)
              : result.status === 'correct' ? "✓" : formatEstimate(question.estimate);
            return (
              <View key={i} style={[styles.tileSlot, { width: `${100 / tilesPerRow}%` }]}>
                <TouchableOpacity
                  disabled={!isAnswered}
                  style={[
                    styles.tile,
                    { backgroundColor: isAnswered ? STATUS_COLORS[result.status] : 'orange' },
                    (isShown || i === reviewIndex) && styles.tileSelected,
                    !isAnswered && styles.tileUnanswered,
                  ]}
                  onPress={() => setReviewIndex(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Position ${i + 1}${isAnswered ? `, ${result.status}` : ''}`}
                >
                  <Text style={styles.tileText} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Keypad while answering, review panel while going back */}
        <View style={styles.main}>
          {isReviewing ? (
            <View style={styles.review}>
              <View style={styles.reviewRows}>
                {[
                  { label: "My guess", value: guesses[reviewIndex]?.trim() ? guesses[reviewIndex] : "—" },
                  { label: "Estimate EPC", value: formatEstimate(shown.estimate) },
                  { label: "Actual EPC", value: round2(shown.actual) ?? "N/A" },
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
              </View>
              <TouchableOpacity style={styles.button} onPress={() => (review ? navigation.goBack() : setReviewIndex(null))}
                accessibilityRole="button" accessibilityLabel={review ? "Back to the results" : "Resume quiz"}>
                <Text style={styles.buttonText}>{review ? 'Results' : 'Resume'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Keypad value={value} setValue={setValue} isDisabled={isPaused || isFinished} onEnter={submitAnswer} />
          )}
        </View>
      </View>

      <FormulaModal
        visible={formulaOpen && !!explanation}
        onClose={() => setFormulaOpen(false)}
        sections={[{ title: 'Position', explanation }]}
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

    // board + panel share the rest of the width; the panel (keypad) gets whatever the board doesn't need
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

    // keypad / review area
    main: {
      flex: 1,
      minHeight: 0,
    },
    review: {
      flex: 1,
      gap: gap,
    },
    reviewRows: {
      flex: 1,
      gap: gap,
      justifyContent: 'center',
    },
    reviewRow: {
      flex: 1,
      maxHeight: 52,
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
