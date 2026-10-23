// Shared settings screen for the quizzes (EPC and Benjamin Count).
//
// Layout (landscape):
//   [ Home rail ] [ title | position types (multi-select)  |  number of positions + Start ]
//
// Props:
//   navigation - React Navigation object
//   title      - screen title, e.g. "EPC Quiz Settings"
//   quizRoute  - route to start, e.g. 'EPC_Quiz'. It receives { settings } where settings is
//                { isMCG, isFastimate, isNNM, isCYM, isMM8, isAll, numPositions }

import { useContext, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameContext } from '../app/GameContext';
import { getAllowedKeys } from '../assets/quizFilters';
import { carnivalTheme, themeMap } from '../assets/themes';

const TYPES = [
  { key: 'isMCG', label: 'MCG' },
  { key: 'isFastimate', label: 'Fastimate' },
  { key: 'isNNM', label: 'NNM' },
  { key: 'isCYM', label: 'CYM' },
  { key: 'isMM8', label: 'MM8' },
];
const COUNTS = [3, 5, 10];

export default function QuizSettings({ navigation, title, quizRoute }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;
  const styles = stylesFunc(height, width, activeTheme, insets);

  // Every type starts selected; the user can choose any combination
  const [selected, setSelected] = useState({
    isMCG: true, isFastimate: true, isNNM: true, isCYM: true, isMM8: true,
  });
  const [numPositions, setNumPositions] = useState(10);

  const allSelected = TYPES.every((t) => selected[t.key]);
  const noneSelected = TYPES.every((t) => !selected[t.key]);

  const toggleType = (key) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAll = () => {
    const next = !allSelected;
    setSelected(Object.fromEntries(TYPES.map((t) => [t.key, next])));
  };

  // How many positions the current combination can draw from
  const available = useMemo(
    () => getAllowedKeys({ ...selected, isAll: allSelected }).length,
    [selected, allSelected]
  );
  const canStart = available > 0;

  const start = () => {
    if (!canStart) return;
    navigation.navigate(quizRoute, {
      settings: { ...selected, isAll: allSelected, numPositions },
    });
  };

  let hint;
  if (noneSelected) hint = "Pick at least one position type";
  else if (available === 0) hint = "No positions match this combination";
  else if (available < numPositions) hint = `Only ${available} positions available, so some may repeat`;
  else hint = `${available} positions available`;

  return (
    <View style={styles.screen}>
      {/* Left rail */}
      <View style={styles.rail}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel="Go to home screen"
        >
          <Text style={styles.homeText} numberOfLines={1}>Home</Text>
        </TouchableOpacity>
      </View>

      {/* Main */}
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>Choose what to practice</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Position types */}
          <View style={styles.typesColumn}>
            <Text style={styles.sectionLabel}>Position types</Text>
            <View style={styles.chipGrid}>
              {TYPES.map((type) => (
                <Chip
                  key={type.key}
                  label={type.label}
                  selected={!!selected[type.key]}
                  onPress={() => toggleType(type.key)}
                  styles={styles}
                  role="checkbox"
                />
              ))}
              <Chip label="All" selected={allSelected} onPress={toggleAll} styles={styles} role="checkbox" />
            </View>
            <Text style={[styles.hint, !canStart && styles.hintWarning]} numberOfLines={2}>
              {hint}
            </Text>
          </View>

          {/* Quiz length + Start */}
          <View style={styles.lengthColumn}>
            <View>
              <Text style={styles.sectionLabel}>Number of positions</Text>
              <View style={styles.segmented}>
                {COUNTS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.segment, numPositions === n ? styles.chipOn : styles.chipOff]}
                    onPress={() => setNumPositions(n)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: numPositions === n }}
                    accessibilityLabel={`${n} positions`}
                  >
                    <Text style={[styles.chipText, numPositions === n ? styles.chipTextOn : styles.chipTextOff]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.startButton, !canStart && styles.startDisabled]}
              onPress={start}
              disabled={!canStart}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canStart }}
            >
              <Text style={styles.startText}>Start Quiz</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// A toggle chip. Selected chips are filled and show a check mark.
function Chip({ label, selected, onPress, styles, role }) {
  return (
    <View style={styles.chipSlot}>
      <TouchableOpacity
        style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
        onPress={onPress}
        accessibilityRole={role}
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
      >
        <Text
          style={[styles.chipText, selected ? styles.chipTextOn : styles.chipTextOff]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {selected ? "✓ " : ""}{label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const stylesFunc = (height, width, theme, insets) => {
  const gap = Math.max(0.025 * height, 8);
  const railWidth = Math.min(Math.max(0.21 * height, 76), 120);
  const radius = Math.max(0.03 * height, 8);
  const controlHeight = Math.min(Math.max(0.12 * height, 40), 56);

  return StyleSheet.create({
    screen: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: theme?.backgroundColor,
      gap: gap,
      // Keep clear of the status bar, gesture bar and any notch/cutout
      paddingTop: Math.max(gap, insets.top),
      paddingBottom: Math.max(gap, insets.bottom),
      paddingLeft: Math.max(gap, insets.left),
      paddingRight: Math.max(gap, insets.right),
    },
    rail: {
      width: railWidth,
    },
    homeButton: {
      minHeight: Math.max(0.12 * height, 40),
      paddingHorizontal: 6,
      borderRadius: radius,
      backgroundColor: theme?.buttonCol,
      justifyContent: 'center',
      alignItems: 'center',
    },
    homeText: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.04 * height, 12), 16),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textAlign: 'center',
    },
    main: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme?.textCol,
      fontSize: Math.min(Math.max(0.065 * height, 22), 30),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    subtitle: {
      color: theme?.textCol,
      opacity: 0.75,
      fontSize: Math.min(Math.max(0.038 * height, 12), 16),
      fontFamily: 'Arial',
      marginBottom: gap,
    },
    scroll: {
      flex: 1,
    },
    body: {
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: gap * 1.5,
    },
    typesColumn: {
      flex: 3,
      minWidth: 0,
    },
    lengthColumn: {
      flex: 2,
      minWidth: 0,
      justifyContent: 'space-between',
      gap: gap,
    },
    sectionLabel: {
      color: theme?.textCol,
      fontSize: Math.min(Math.max(0.04 * height, 13), 17),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      marginBottom: gap / 2,
    },

    // chips (three per row)
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -3,
    },
    chipSlot: {
      width: '33.333%',
      padding: 3,
    },
    chip: {
      height: controlHeight,
      borderRadius: radius,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    chipOn: {
      backgroundColor: theme?.buttonCol,
      borderColor: theme?.buttonTextCol,
    },
    chipOff: {
      backgroundColor: 'transparent',
      borderColor: theme?.buttonCol,
    },
    chipText: {
      fontSize: Math.min(Math.max(0.042 * height, 13), 17),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textAlign: 'center',
    },
    chipTextOn: {
      color: theme?.buttonTextCol,
    },
    chipTextOff: {
      color: theme?.textCol,
    },
    hint: {
      color: theme?.textCol,
      opacity: 0.75,
      fontSize: Math.min(Math.max(0.034 * height, 11), 14),
      fontFamily: 'Arial',
      marginTop: gap / 2,
    },
    hintWarning: {
      opacity: 1,
      fontWeight: 'bold',
    },

    // quiz length
    segmented: {
      flexDirection: 'row',
      gap: 6,
    },
    segment: {
      flex: 1,
      height: controlHeight,
      borderRadius: radius,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // start
    startButton: {
      minHeight: controlHeight * 1.15,
      borderRadius: radius,
      backgroundColor: theme?.buttonCol,
      justifyContent: 'center',
      alignItems: 'center',
    },
    startDisabled: {
      opacity: 0.4,
    },
    startText: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.05 * height, 16), 22),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
  });
};
