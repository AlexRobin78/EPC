// Component for the Two Player (cube decision) screen of the app. Takes navigation as a prop.
//
// Layout (landscape):
//   [ action rail ] [ board (flexes, centered) ] [ stats panel ]
// Every button lives inside the rail's normal flex flow (no absolute positioning),
// so nothing can overlap the board or each other.

import { useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameContext } from '../app/GameContext';
import positions from '../assets/epc_positions.json';
import { getEPC, isTablePosition, isWithinSixPoint, positionKey } from '../assets/epcEngine';
import { cubeDecisionForCheckers, engineSupports } from '../assets/gnubgRace';
import { carnivalTheme, themeMap } from '../assets/themes';
import BackgammonBoard from "../views/BackgammonBoard";
import FormulaModal, { benjaminSection, explainChecker, FormulaButton } from '../views/FormulaModal';
import { benjaminCount } from '../assets/epcFormulas';
import TwoPlayerStats from '../views/TwoPlayerStats';

function getNumHomeCheckers(arr) {
  return 15 - arr.reduce((acc, item) => acc + item, 0);
}

const noop = () => {};

// Positions within the 6 point show the "Actual EPC" stored in the JSON file. Set to true to use the
// exact table instead, which follows the same rules as the on-the-fly values (see epc_gen_fast.py).
const USE_TABLE_FOR_ALL_EPC = false;

// Everything one side's stats need. `checkers` is in standard orientation (index 0 = that player's
// 1 point). Within the 6 point we use the JSON file; beyond it, the EPC engine computes the actual EPC
// (the estimated EPC and variance only exist in the JSON file).
function describeSide(checkers) {
  if (isWithinSixPoint(checkers)) {
    const key = positionKey(checkers);
    const entry = positions[key];
    if (!entry) return { key, entry: null, actual: "N/A", estimated: "N/A", variance: "N/A" };
    return {
      key,
      entry,
      actual: USE_TABLE_FOR_ALL_EPC ? getEPC(checkers).epc.toFixed(2) : entry.EPC,
      estimated: entry.BESTIMATE,
      variance: entry.VARIANCE,
    };
  }
  const result = getEPC(checkers);
  const actual = result ? (result.kind === 'exact' ? "" : "~") + result.epc.toFixed(2) : "N/A";
  return { key: null, entry: null, actual, estimated: "N/A", variance: "N/A" };
}

export default function Two_Players({ navigation, route }) {
  // Opened from a quiz review: starts with that position and offers only Back (no Home) so the quiz keeps its progress
  const fromQuiz = !!route?.params?.fromQuiz;
  const { pairCheckersCopy, selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;

  const [checkersA, setcheckersA] = useState(route?.params?.position ? [...route.params.position[0]] : new Array(24).fill(0));
  const [checkersB, setcheckersB] = useState(route?.params?.position ? [...route.params.position[1]] : new Array(24).fill(0));

  const [topEPC, setTopEPC] = useState("");
  const [topActEPC, setTopActEPC] = useState("");
  const [topVar, setTopVar] = useState("");
  const [botEPC, setBotEPC] = useState("");
  const [botActEPC, setBotActEPC] = useState("");
  const [botVar, setBotVar] = useState("");
  const [cubeDec, setCubeDec] = useState("");   // Benjamin-count rule of thumb
  const [cube, setCube] = useState(null);       // GNU Backgammon engine result (or null)
  const [formulaOpen, setFormulaOpen] = useState(false);
  // How each side's EPC is estimated by formula (null when none applies); shown only after pressing Formula
  const botExplain = useMemo(() => explainChecker(checkersA), [checkersA]);
  const topExplain = useMemo(() => explainChecker([...checkersB].reverse()), [checkersB]);
  // Cube decision by the Benjamin Count (both sides need a Bestimate and a variance in the table)
  const benjExplain = useMemo(() => {
    const top = [...checkersB].reverse();
    if (!isWithinSixPoint(checkersA) || !isWithinSixPoint(top)) return null;
    return benjaminSection(positions[positionKey(checkersA)], positions[positionKey(top)], cube?.short)?.explanation ?? null;
  }, [checkersA, checkersB, cube]);

  const pastePosition = () => {
    setcheckersA([...pairCheckersCopy[0]]);
    setcheckersB([...pairCheckersCopy[1]]);
  };

  const updateArray = (newValue, index, player) => {
    const isPlayerA = player === 'A';
    const currentArray = isPlayerA ? checkersA : checkersB;
    const otherArray = isPlayerA ? checkersB : checkersA;
    const setArray = isPlayerA ? setcheckersA : setcheckersB;
    const setOtherArray = isPlayerA ? setcheckersB : setcheckersA;

    const homeCheckers = getNumHomeCheckers(currentArray);
    const checkers = currentArray[index - 1];
    const setVal = (newValue === 5 && checkers >= 5)
      ? Math.min(checkers + 1, checkers + homeCheckers)
      : Math.min(newValue, checkers + homeCheckers);
    const newArray = currentArray.map((value, i) => index === i + 1 ? setVal : value);
    const otherNewArray = otherArray.map((value, i) => index === i + 1 ? 0 : value);
    setArray(newArray);
    setOtherArray(otherNewArray);
  };

  // Swap the two sides: the bottom setup goes to the top and the top setup to the bottom
  // (each side is stored from its own end of the board, so both arrays are reversed as they move)
  const flipBoard = () => {
    setcheckersA([...checkersB].reverse());
    setcheckersB([...checkersA].reverse());
  };

  const resetBoard = () => {
    setcheckersA(new Array(24).fill(0));
    setcheckersB(new Array(24).fill(0));
  };

  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = stylesFunc(height, width, activeTheme, insets);

  // Benjamin Count rule of thumb (see benjaminCount in epcFormulas.js, which also drives the Formula pop-up)
  const calculateDecision = (bottomBoardStr, topBoardStr) => {
    const r = benjaminCount(positions[bottomBoardStr], positions[topBoardStr]);
    return r ? r.decision : "N/A";
  };

  // Keep the stats in step with the board (also after Paste and Reset). The top player's points are
  // numbered from the other end of the array, so flip them into standard orientation first.
  // Positions with checkers far from home can take a moment, so those are computed after a "..." frame.
  useEffect(() => {
    const topCheckers = [...checkersB].reverse();

    if (checkersA.every((c) => c === 0) && checkersB.every((c) => c === 0)) {
      setTopActEPC(""); setTopEPC(""); setTopVar("");
      setBotActEPC(""); setBotEPC(""); setBotVar("");
      setCubeDec("");
      return;
    }

    const update = () => {
      const bottom = describeSide(checkersA);
      const top = describeSide(topCheckers);
      setTopActEPC(top.actual); setTopEPC(top.estimated); setTopVar(top.variance);
      setBotActEPC(bottom.actual); setBotEPC(bottom.estimated); setBotVar(bottom.variance);
      setCubeDec(bottom.entry && top.entry ? calculateDecision(bottom.key, top.key) : "N/A");
    };

    if (isTablePosition(checkersA) && isTablePosition(topCheckers)) {
      update();
      return;
    }
    if (!isTablePosition(checkersA)) { setBotActEPC("..."); setBotEPC("N/A"); setBotVar("N/A"); }
    if (!isTablePosition(topCheckers)) { setTopActEPC("..."); setTopEPC("N/A"); setTopVar("N/A"); }
    setCubeDec("N/A");
    const timer = setTimeout(update, 0);
    return () => clearTimeout(timer);
  }, [checkersA, checkersB]);

  // GNU Backgammon cube decision (ported engine; money game, centred cube, 2-ply) for any position with
  // no contact left. Checkers all on the 6 point or lower use exact bear-off tables; further out it uses an
  // approximate race model (shown with a leading ≈). The bottom player is on roll and may double.
  // Computed after the board has painted so tapping stays responsive.
  useEffect(() => {
    const topCheckers = [...checkersB].reverse();
    if (!engineSupports(checkersA, topCheckers)) {
      setCube(null);
      return;
    }
    const timer = setTimeout(() => setCube(cubeDecisionForCheckers(checkersA, topCheckers)), 0);
    return () => clearTimeout(timer);
  }, [checkersA, checkersB]);

  return (
    <View style={styles.screen}>
      {/* Left rail: navigation on top, board actions at the bottom */}
      <View style={styles.rail}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => (fromQuiz ? navigation.goBack() : navigation.navigate('Home'))}
          accessibilityRole="button"
          accessibilityLabel={fromQuiz ? "Back to the quiz" : "Go to home screen"}
        >
          <Text style={styles.buttonText} numberOfLines={1}>{fromQuiz ? 'Back' : 'Home'}</Text>
        </TouchableOpacity>

        <View style={styles.actionGroup}>
          {(botExplain || topExplain || benjExplain) && (
            <FormulaButton onPress={() => setFormulaOpen(true)} style={styles.button} textStyle={styles.buttonText} />
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={flipBoard}
            accessibilityRole="button"
            accessibilityLabel="Swap the top and bottom positions"
          >
            <Text style={styles.buttonText} numberOfLines={1}>Flip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={pastePosition}
            accessibilityRole="button"
            accessibilityLabel="Paste copied position"
          >
            <Text style={styles.buttonText} numberOfLines={1}>Paste</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={resetBoard}
            accessibilityRole="button"
            accessibilityLabel="Clear the board"
          >
            <Text style={styles.buttonText} numberOfLines={1}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Board takes whatever horizontal space is left and stays centered */}
      <View style={styles.boardArea}>
        <BackgammonBoard
          liftToTop={(newValue, i, player) => updateArray(newValue, i, player)}
          checkersA={checkersA}
          checkersB={checkersB}
          onCallParentFunction={noop}
          isInteractive={true}
        />
      </View>

      {/* Stats panel */}
      <View style={styles.sidePanel}>
        <TwoPlayerStats
          topEPC={topEPC}
          topVar={topVar}
          topActEPC={topActEPC}
          botEPC={botEPC}
          botVar={botVar}
          botActEPC={botActEPC}
          cubeDec={cubeDec}
          cube={cube}
          height={height - insets.top - insets.bottom}
          theme={activeTheme}
        />
      </View>

      <FormulaModal
        visible={formulaOpen && !!(botExplain || topExplain || benjExplain)}
        onClose={() => setFormulaOpen(false)}
        sections={[{ title: 'Top', explanation: topExplain }, { title: 'Bottom', explanation: botExplain }, { title: 'Benjamin Count', explanation: benjExplain }]}
        theme={activeTheme}
      />
    </View>
  );
}

const stylesFunc = (height, width, theme, insets) => {
  // Rail width scales with screen height but is clamped so it stays tappable
  // on small phones and doesn't balloon on tablets.
  const railWidth = Math.min(Math.max(0.21 * height, 76), 120);
  const gap = Math.max(0.025 * height, 8);

  return StyleSheet.create({
    screen: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: theme?.backgroundColor,
      // Keep clear of the status bar, gesture bar and any notch/cutout
      paddingTop: Math.max(gap, insets.top),
      paddingBottom: Math.max(gap, insets.bottom),
      paddingLeft: Math.max(gap, insets.left),
      paddingRight: Math.max(gap, insets.right),
    },
    rail: {
      width: railWidth,
      justifyContent: 'space-between',
      alignItems: 'stretch',
    },
    actionGroup: {
      gap: gap,
    },
    button: {
      minHeight: Math.max(0.12 * height, 40),
      paddingHorizontal: 6,
      borderRadius: Math.max(0.03 * height, 8),
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
    boardArea: {
      flex: 1,
      // stretch so the board can measure the full space it has and scale to fit
      alignItems: 'stretch',
      marginHorizontal: gap,
      minWidth: 0,
    },
    sidePanel: {
      width: 0.62 * height,
      flexShrink: 1,
      minWidth: 0.4 * height,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme?.backgroundColor,
    },
  });
};
