// Shared layout for simple "pick one" menu screens (Quiz, Setup Position, ...).
//
// Layout (landscape):
//   [ Home rail ] [ title + subtitle, then large option cards side by side ]
// Nothing is absolutely positioned, so nothing can overlap on any phone size.
//
// Props:
//   navigation  - React Navigation object
//   title       - screen title
//   subtitle    - optional line under the title
//   options     - [{ label, description?, route }]

import { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameContext } from '../app/GameContext';
import { carnivalTheme, themeMap } from '../assets/themes';

export default function MenuScreen({ navigation, title, subtitle, options }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;
  const styles = stylesFunc(height, width, activeTheme, insets);

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

      {/* Title + option cards */}
      <View style={styles.main}>
        <View style={styles.header} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {/* Scrolls instead of overflowing if there are many options or the screen is tiny */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.cards}
          showsVerticalScrollIndicator={false}
        >
          {options.map((option) => (
            <TouchableOpacity
              key={option.route}
              style={styles.card}
              onPress={() => navigation.navigate(option.route)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
            >
              <Text style={styles.cardLabel} numberOfLines={2} adjustsFontSizeToFit>
                {option.label}
              </Text>
              {!!option.description && (
                <Text style={styles.cardDescription} numberOfLines={3}>
                  {option.description}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Mirrors the left rail so the cards are centered on the screen, not just in the leftover space */}
      <View style={styles.balanceSpacer} />
    </View>
  );
}

const stylesFunc = (height, width, theme, insets) => {
  const gap = Math.max(0.025 * height, 8);
  const railWidth = Math.min(Math.max(0.21 * height, 76), 120);
  const radius = Math.max(0.04 * height, 10);
  const padLeft = Math.max(gap, insets.left);
  const padRight = Math.max(gap, insets.right);
  const titleSize = Math.min(Math.max(0.065 * height, 22), 30);
  const subtitleSize = Math.min(Math.max(0.038 * height, 12), 16);
  // Space reserved above (and mirrored below) the cards so they sit in the true center
  const headerHeight = titleSize * 1.3 + subtitleSize * 1.3 + gap;

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
      paddingLeft: padLeft,
      paddingRight: padRight,
    },
    rail: {
      width: railWidth,
    },
    balanceSpacer: {
      width: Math.max(padLeft + railWidth - padRight, 0),
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
    },
    homeButton: {
      minHeight: Math.max(0.12 * height, 40),
      paddingHorizontal: 6,
      borderRadius: Math.max(0.03 * height, 8),
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
      fontSize: titleSize,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    subtitle: {
      color: theme?.textCol,
      opacity: 0.75,
      fontSize: subtitleSize,
      fontFamily: 'Arial',
    },
    scroll: {
      flex: 1,
    },
    // Cards share the row equally and are centered in the space under the title
    cards: {
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: gap * 1.5,
      // Equal padding top and bottom keeps the cards vertically centered
      // while still clearing the title at the top
      paddingVertical: headerHeight,
    },
    card: {
      flex: 1,
      maxWidth: 0.9 * height,
      minHeight: Math.max(0.4 * height, 110),
      maxHeight: 0.6 * height,
      backgroundColor: theme?.buttonCol,
      borderRadius: radius,
      padding: Math.max(0.04 * height, 14),
      justifyContent: 'center',
      alignItems: 'center',
      gap: Math.max(0.015 * height, 6),
    },
    cardLabel: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.06 * height, 18), 28),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textAlign: 'center',
    },
    cardDescription: {
      color: theme?.buttonTextCol,
      opacity: 0.8,
      fontSize: Math.min(Math.max(0.036 * height, 12), 15),
      fontFamily: 'Arial',
      textAlign: 'center',
    },
  });
};
