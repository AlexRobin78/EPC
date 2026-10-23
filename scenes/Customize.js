// Component for the Customize screen of the app. Takes navigation as a prop. Still in development.
//
// Layout (landscape):
//   [ Home rail ] [ title + scrollable grid of theme preview cards ]
// Each card previews its theme's own colors, and the current theme is outlined.
// Nothing is absolutely positioned, so nothing can overlap on any phone size.

import { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameContext } from '../app/GameContext';
import { carnivalTheme, themeMap, themes } from '../assets/themes';

export default function Customize({ navigation }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setSelectedTheme, selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;

  const layout = getLayout(height, width, insets);
  const styles = stylesFunc(height, activeTheme, insets, layout);

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

      {/* Title + theme grid */}
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>Customize</Text>
        <Text style={styles.subtitle} numberOfLines={1}>Choose a theme</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {themes.map((name) => {
            // Preview each card in that theme's own colors
            const preview = (themeMap && themeMap.get(name)) || carnivalTheme;
            const isSelected = name === selectedTheme;
            return (
              <TouchableOpacity
                key={name}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelectedTheme(name)}
                accessibilityRole="button"
                accessibilityLabel={`${name} theme${isSelected ? ', selected' : ''}`}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.swatch, { backgroundColor: preview?.backgroundColor }]}>
                  <View style={[styles.swatchButton, { backgroundColor: preview?.buttonCol }]}>
                    <Text style={[styles.swatchButtonText, { color: preview?.buttonTextCol }]}>Aa</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>
                    {name}
                  </Text>
                  {isSelected && <Text style={styles.cardCheck}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// Works out how many cards fit per row from the real space available.
function getLayout(height, width, insets) {
  const gap = Math.max(0.025 * height, 8);
  const railWidth = Math.min(Math.max(0.21 * height, 76), 120);
  const contentWidth = width
    - Math.max(gap, insets.left) - Math.max(gap, insets.right)
    - railWidth - gap;
  const columns = contentWidth >= 640 ? 3 : 2;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  return { gap, railWidth, cardWidth };
}

const stylesFunc = (height, theme, insets, layout) => {
  const { gap, railWidth, cardWidth } = layout;
  const radius = Math.max(0.03 * height, 8);

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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: gap,
      paddingBottom: gap,
    },
    card: {
      width: cardWidth,
      borderRadius: radius,
      backgroundColor: 'white',
      borderWidth: 3,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    // Outlined in the current theme's text color so it stands out on any background
    cardSelected: {
      borderColor: theme?.textCol ?? '#000',
    },
    swatch: {
      height: Math.max(0.17 * height, 48),
      justifyContent: 'center',
      alignItems: 'center',
    },
    swatchButton: {
      paddingHorizontal: Math.max(0.04 * height, 14),
      paddingVertical: Math.max(0.012 * height, 4),
      borderRadius: Math.max(0.02 * height, 6),
    },
    swatchButtonText: {
      fontSize: Math.min(Math.max(0.045 * height, 14), 18),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      paddingHorizontal: Math.max(0.02 * height, 8),
      paddingVertical: Math.max(0.015 * height, 6),
    },
    cardName: {
      flex: 1,
      color: 'black',
      fontSize: Math.min(Math.max(0.042 * height, 13), 17),
      fontWeight: 'bold',
      fontFamily: 'Arial',
    },
    cardCheck: {
      color: 'black',
      fontSize: Math.min(Math.max(0.045 * height, 14), 18),
      fontWeight: 'bold',
    },
  });
};
