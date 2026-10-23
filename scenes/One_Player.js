// Component for the Setup Position screen of the app. Takes navigation as a prop.
//
// Layout (landscape):
//   [ action rail ] [ board (flexes, centered) ] [ stats panel ]
// Every button lives inside the rail's normal flex flow (no absolute positioning),
// so nothing can overlap the board or each other.

import { useContext, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { GameContext } from '../app/GameContext';
import positions from '../assets/epc_positions.json';
import { getEPC, isTablePosition, isWithinSixPoint, positionKey } from '../assets/epcEngine';
import { carnivalTheme, themeMap } from '../assets/themes';
import BackgammonBoard from "../views/BackgammonBoard";
import FormulaModal, { explainChecker, FormulaButton } from '../views/FormulaModal';
import OnePlayerStats from '../views/OnePlayerStats';

const noop = () => {};

// Positions within the 6 point show the "Actual EPC" stored in the JSON file. Set to true to use the
// exact table instead, which follows the same rules as the on-the-fly values (see epc_gen_fast.py).
const USE_TABLE_FOR_ALL_EPC = false;

const METHOD_LABELS = { exact: "Table", approx: "Computed", estimate: "Simulated" };
const BLANK = { epc: "", variance: "", method: "", bestimate: "", distribution: "", fastimate: "" };
const NOT_AVAILABLE = { epc: "N/A", variance: "N/A", method: "N/A", bestimate: "N/A", distribution: "N/A", fastimate: "N/A" };

// What to show for a position, using the JSON file when it can and the EPC engine otherwise
function describePosition(checkers) {
  if (isWithinSixPoint(checkers)) {
    const entry = positions[positionKey(checkers)];
    if (!entry) return NOT_AVAILABLE;
    return {
      epc: USE_TABLE_FOR_ALL_EPC ? getEPC(checkers).epc.toFixed(2) : entry.EPC,
      variance: entry.VARIANCE,
      method: entry.METHOD,
      bestimate: entry.BESTIMATE >= 0 ? entry.BESTIMATE : "N/A",
      distribution: entry.DESCRIPTION,
      fastimate: entry.FASTIMATE >= 0 ? entry.FASTIMATE : "N/A",
    };
  }
  // A checker is outside the 6 point: only the engine can answer. The variance and the
  // estimation methods only exist for positions in the JSON file.
  const result = getEPC(checkers);
  if (!result) return NOT_AVAILABLE;
  return {
    ...NOT_AVAILABLE,
    epc: (result.kind === 'exact' ? "" : "~") + result.epc.toFixed(2),
    method: METHOD_LABELS[result.kind],
  };
}

export default function One_Player({ navigation, route }) {
  // Opened from a quiz review: starts with that position and offers only Back (no Home) so the quiz keeps its progress
  const fromQuiz = !!route?.params?.fromQuiz;
  const { soloCheckersCopy, selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;

  const [checkersA, setcheckersA] = useState(route?.params?.position ? [...route.params.position] : new Array(24).fill(0));
  const [checkersB] = useState([-1, ...new Array(23).fill(0)]);
  const [EPCText, setEPCText] = useState("");
  const [VarianceText, setVarianceText] = useState("");
  const [MethodText, setMethodText] = useState("");
  const [BestimateText, setBestimateText] = useState("");
  const [DistributionText, setDistributionText] = useState("");
  const [FastimateText, setFastimateText] = useState("");
  const [formulaOpen, setFormulaOpen] = useState(false);
  // How the EPC is estimated by formula (null when no formula applies); only shown after pressing Formula
  const explanation = useMemo(() => explainChecker(checkersA), [checkersA]);

  const pastePosition = () => {
    setcheckersA([...soloCheckersCopy]);
  };

  function getNumHomeCheckers(arr) {
    return 15 - arr.reduce((acc, item) => acc + item, 0);
  }

  const updateArray = (newValue, index, player) => {
    if (!Number.isFinite(newValue)) return;   // ignore taps that couldn't be placed
    const isPlayerA = player === 'A';
    const currentArray = isPlayerA ? checkersA : checkersB;
    const setArray = isPlayerA ? setcheckersA : setcheckersB;

    const homeCheckers = getNumHomeCheckers(currentArray);
    const checkers = currentArray[index - 1];
    const setVal = (newValue === 5 && checkers >= 5)
      ? Math.min(checkers + 1, checkers + homeCheckers)
      : Math.min(newValue, checkers + homeCheckers);
    const newArray = currentArray.map((value, i) => index === i + 1 ? setVal : value);
    setArray(newArray);
  };

  const resetBoard = () => {
    setcheckersA(new Array(24).fill(0));
  };

  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = stylesFunc(height, width, activeTheme, insets);

  const showStats = (stats) => {
    setEPCText(stats.epc);
    setVarianceText(stats.variance);
    setMethodText(stats.method);
    setBestimateText(stats.bestimate);
    setDistributionText(stats.distribution);
    setFastimateText(stats.fastimate);
  };

  // Keep the stats in step with the board (also after Paste and Reset). Positions with checkers
  // far from home can take a moment to evaluate, so those are computed after a quick "..." frame.
  useEffect(() => {
    if (checkersA.every((c) => c === 0)) {
      showStats(BLANK);
      return;
    }
    const needsCalculation = !isWithinSixPoint(checkersA) && !isTablePosition(checkersA);
    if (!needsCalculation) {
      showStats(describePosition(checkersA));
      return;
    }
    showStats({ ...NOT_AVAILABLE, epc: "...", method: "Calculating" });
    const timer = setTimeout(() => showStats(describePosition(checkersA)), 0);
    return () => clearTimeout(timer);
  }, [checkersA]);

  return (
    <View style={styles.screen}>
      {/* Left rail: navigation on top, board actions at the bottom */}
      <View style={styles.rail}>
        <TouchableOpacity
          style={[styles.button, styles.navButton]}
          onPress={() => (fromQuiz ? navigation.goBack() : navigation.navigate('Home'))}
          accessibilityRole="button"
          accessibilityLabel={fromQuiz ? "Back to the quiz" : "Go to home screen"}
        >
          <Text style={styles.buttonText} numberOfLines={1}>{fromQuiz ? 'Back' : 'Home'}</Text>
        </TouchableOpacity>

        <View style={styles.actionGroup}>
          {explanation && (
            <FormulaButton onPress={() => setFormulaOpen(true)} style={styles.button} textStyle={styles.buttonText} />
          )}
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
        <OnePlayerStats
          EPCText={EPCText}
          VarianceText={VarianceText}
          MethodText={MethodText}
          BestimateText={BestimateText}
          DistributionText={DistributionText}
          FastimateText={FastimateText}
          height={height - insets.top - insets.bottom}
          theme={activeTheme}
        />
      </View>

      <FormulaModal
        visible={formulaOpen && !!explanation}
        onClose={() => setFormulaOpen(false)}
        sections={[{ title: 'Position', explanation }]}
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
    navButton: {
      // Same size as the others; kept as a hook for per-theme tweaks.
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
