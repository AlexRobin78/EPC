// Shared results screen for the quizzes (EPC and Benjamin Count).
//
// Layout (landscape):
//   [ Home rail ] [ title | big score card  |  stat rows + Restart / Settings buttons ]
//
// Props:
//   route, navigation - React Navigation objects. route.params:
//                       { settings, inaccuracy, time, correct, mistake, count, review }
//                       (review = { quiz, guesses | answers, time }: lets the user look back at each position)
//   quizName          - e.g. "EPC Quiz"
//   quizRoute         - route to restart, e.g. 'EPC_Quiz' (receives { settings })
//   settingsRoute     - route to change settings, e.g. 'EPC_Quiz_Settings'
//   variant           - 'epc' (correct / mistakes / blunders / average error) or
//                       'benjamin' (correct / incorrect)

import { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameContext } from '../app/GameContext';
import { carnivalTheme, themeMap } from '../assets/themes';

const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const encouragement = (percent) =>
  percent >= 90 ? "Excellent!" : percent >= 70 ? "Nice work" : percent >= 50 ? "Getting there" : "Keep practicing";

export default function QuizResults({ route, navigation, quizName, quizRoute, settingsRoute, variant = 'epc' }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;
  const styles = stylesFunc(height, width, activeTheme, insets);

  const { settings, inaccuracy = 0, time = 0, correct = 0, mistake = 0, count = 0, review } = route.params;
  const percent = count > 0 ? Math.round((100 * correct) / count) : 0;

  const rows = variant === 'epc'
    ? [
        { label: "Correct", value: correct, color: 'green' },
        { label: "Mistakes", value: mistake, color: 'yellow' },
        { label: "Blunders", value: count - correct - mistake, color: 'red' },
        { label: "Avg. error", value: count > 0 ? (inaccuracy / count).toFixed(2) : "0.00" },
        { label: "Time", value: formatTime(time) },
      ]
    : [
        { label: "Correct", value: correct, color: 'green' },
        { label: "Incorrect", value: count - correct, color: 'red' },
        { label: "Time", value: formatTime(time) },
      ];

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
        <Text style={styles.title} numberOfLines={1}>Results</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{quizName} · {count} positions</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Score card */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreValue} numberOfLines={1} adjustsFontSizeToFit>
              {correct}/{count}
            </Text>
            <Text style={styles.scorePercent}>{percent}% correct</Text>
            <Text style={styles.scoreMessage}>{encouragement(percent)}</Text>
          </View>

          {/* Stats + actions */}
          <View style={styles.rightColumn}>
            <View style={styles.rows}>
              {rows.map((row) => (
                <View key={row.label} style={styles.row}>
                  <View style={styles.rowLabel}>
                    {row.color && <View style={[styles.dot, { backgroundColor: row.color }]} />}
                    <Text style={styles.rowText} numberOfLines={1} adjustsFontSizeToFit>{row.label}</Text>
                  </View>
                  <View style={styles.rowValue}>
                    <Text style={styles.rowText} numberOfLines={1} adjustsFontSizeToFit>{row.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              {review && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.push(quizRoute, { settings, review })}
                  accessibilityRole="button"
                  accessibilityLabel="Review the positions from this quiz"
                >
                  <Text style={styles.actionText} numberOfLines={1}>Review</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate(quizRoute, { settings })}
                accessibilityRole="button"
                accessibilityLabel="Restart the quiz with the same settings"
              >
                <Text style={styles.actionText} numberOfLines={1}>Restart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate(settingsRoute)}
                accessibilityRole="button"
                accessibilityLabel="Change quiz settings"
              >
                <Text style={styles.actionText} numberOfLines={1}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const stylesFunc = (height, width, theme, insets) => {
  const gap = Math.max(0.025 * height, 8);
  const railWidth = Math.min(Math.max(0.21 * height, 76), 120);
  const radius = Math.max(0.03 * height, 8);
  const rowHeight = Math.min(Math.max(0.075 * height, 30), 44);
  const rowFont = Math.min(Math.max(0.038 * height, 12), 16);

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

    // score card
    scoreCard: {
      flex: 1,
      minWidth: 0,
      minHeight: Math.max(0.35 * height, 120),
      backgroundColor: theme?.buttonCol,
      borderRadius: radius * 1.5,
      justifyContent: 'center',
      alignItems: 'center',
      padding: gap,
    },
    scoreValue: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.16 * height, 40), 72),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    scorePercent: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.05 * height, 15), 22),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    scoreMessage: {
      color: theme?.buttonTextCol,
      opacity: 0.8,
      fontSize: Math.min(Math.max(0.038 * height, 12), 16),
      fontFamily: 'Arial',
      marginTop: 4,
    },

    // stats rows
    rightColumn: {
      flex: 1.3,
      minWidth: 0,
      justifyContent: 'space-between',
      gap: gap,
    },
    rows: {
      gap: Math.max(gap / 2, 5),
    },
    row: {
      height: rowHeight,
      flexDirection: 'row',
    },
    rowLabel: {
      flex: 3,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'lightgray',
      paddingHorizontal: 12,
      borderTopLeftRadius: rowHeight / 2,
      borderBottomLeftRadius: rowHeight / 2,
    },
    rowValue: {
      flex: 2,
      backgroundColor: 'pink',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
      borderTopRightRadius: rowHeight / 2,
      borderBottomRightRadius: rowHeight / 2,
    },
    rowText: {
      color: 'black',
      fontSize: rowFont,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.35)',
    },

    // actions
    actions: {
      flexDirection: 'row',
      gap: gap,
    },
    actionButton: {
      flex: 1,
      minHeight: Math.max(0.12 * height, 40),
      borderRadius: radius,
      backgroundColor: theme?.buttonCol,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    actionText: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.045 * height, 14), 18),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
  });
};
