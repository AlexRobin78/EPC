// Component for the Learn screen of the app. Takes navigation as a prop. Still in development.
//
// Layout (landscape):
//   [ Home + scrollable topic list ] [ content card with title and scrollable text ]
// Nothing is absolutely positioned, so the Home button can't overlap the topic list,
// and the topic list scrolls on short screens instead of squashing 11 buttons together.
//
// The text comes from assets/learn_texts.js as plain strings. assets/richtext.js turns each line into
// colour-coded spans (the same variable or concept has the same colour on every tab) and swaps plain
// characters for proper math symbols (×, ÷, −, ≤, ≥, ⌊ ⌋). The content card stays white in every theme,
// so the colours are picked to be readable on white.

import { useContext, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameContext } from '../app/GameContext';
import { BenjaminCount, CYM, EPC, Fastimate, Legend, LowCheckers, MCG, MM8, NNM, TricesRule, Variance } from '../assets/learn_texts';
import { isFormula, prettify, tokenize } from '../assets/richtext';
import { carnivalTheme, themeMap } from '../assets/themes';

const tabs = ["Legend", "EPC", "Variance", "Trice's Rule", "Benjamin Count", "Fastimate", "Low Checkers",
  "MM8", "NNM", "CYM", "MCG"];

const tabContent = {
  "Legend": Legend,
  "EPC": EPC,
  "Variance": Variance,
  "Trice's Rule": TricesRule,
  "Benjamin Count": BenjaminCount,
  "Fastimate": Fastimate,
  "Low Checkers": LowCheckers,
  "MM8": MM8,
  "NNM": NNM,
  "CYM": CYM,
  "MCG": MCG,
};

// One text line as nested coloured spans
function Spans({ line }) {
  return tokenize(line).map((t, i) => (
    <Text key={i} style={t.color ? { color: t.color, fontWeight: 'bold', fontStyle: t.italic ? 'italic' : 'normal' } : null}>
      {t.text}
    </Text>
  ));
}

// The whole topic: formulas get a shaded box, blank lines become small gaps
function RichContent({ text, tab, styles }) {
  return text.split('\n').map((raw, i) => {
    const line = prettify(raw).trim();
    if (!line) return <View key={i} style={styles.spacer} />;
    if (tab !== "Legend" && isFormula(line)) {
      return (
        <View key={i} style={styles.formulaBox}>
          <Text style={styles.formulaText}><Spans line={line} /></Text>
        </View>
      );
    }
    return <Text key={i} style={styles.contentText}><Spans line={line} /></Text>;
  });
}

export default function Learn({ navigation }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme)
    ? themeMap.get(selectedTheme)
    : carnivalTheme;
  const styles = stylesFunc(height, width, activeTheme, insets);

  const [selectedTab, setSelectedTab] = useState(tabs[0]);
  const contentRef = useRef(null);

  const selectTab = (tab) => {
    setSelectedTab(tab);
    // Start each topic from the top
    contentRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={styles.screen}>
      {/* Left column: Home on top, topics scroll beneath it */}
      <View style={styles.sidebar}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel="Go to home screen"
        >
          <Text style={styles.homeText} numberOfLines={1}>Home</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.tabList}
          contentContainerStyle={styles.tabListContent}
          showsVerticalScrollIndicator={false}
        >
          {tabs.map((tab) => {
            const isActive = tab === selectedTab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonInactive]}
                onPress={() => selectTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={styles.tabText} numberOfLines={1} adjustsFontSizeToFit>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content card */}
      <View style={styles.contentCard}>
        <Text style={styles.contentTitle} numberOfLines={1}>{selectedTab}</Text>
        <View style={styles.divider} />
        <ScrollView
          ref={contentRef}
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator
        >
          <RichContent text={tabContent[selectedTab]} tab={selectedTab} styles={styles} />
        </ScrollView>
      </View>
    </View>
  );
}

const stylesFunc = (height, width, theme, insets) => {
  const gap = Math.max(0.025 * height, 8);
  // Wide enough for "Benjamin Count", but never more than a third of the screen
  const sidebarWidth = Math.min(Math.max(0.24 * width, 120), 200, 0.33 * width);
  const buttonHeight = Math.max(0.11 * height, 38);
  const radius = Math.max(0.025 * height, 8);

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
    sidebar: {
      width: sidebarWidth,
      gap: gap,
    },
    homeButton: {
      height: buttonHeight,
      borderRadius: radius,
      backgroundColor: theme?.buttonCol,
      justifyContent: 'center',
      alignItems: 'center',
    },
    homeText: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.04 * height, 13), 16),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textAlign: 'center',
    },
    tabList: {
      flex: 1,
    },
    tabListContent: {
      gap: Math.max(0.012 * height, 5),
    },
    tabButton: {
      height: buttonHeight,
      paddingHorizontal: 8,
      borderRadius: radius,
      backgroundColor: theme?.buttonCol,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    },
    // The selected topic is fully opaque and outlined; the rest are dimmed
    tabButtonActive: {
      borderColor: theme?.buttonTextCol,
    },
    tabButtonInactive: {
      borderColor: 'transparent',
      opacity: 0.7,
    },
    tabText: {
      color: theme?.buttonTextCol,
      fontSize: Math.min(Math.max(0.038 * height, 12), 15),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      textAlign: 'center',
    },
    contentCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: 'white',
      borderRadius: radius,
      paddingTop: Math.max(0.03 * height, 10),
      overflow: 'hidden',
    },
    contentTitle: {
      color: 'black',
      fontSize: Math.min(Math.max(0.055 * height, 18), 26),
      fontWeight: 'bold',
      fontFamily: 'Arial',
      paddingHorizontal: Math.max(0.04 * height, 14),
    },
    divider: {
      height: 1,
      backgroundColor: '#ddd',
      marginTop: Math.max(0.02 * height, 8),
      marginHorizontal: Math.max(0.04 * height, 14),
    },
    contentScroll: {
      flex: 1,
    },
    contentContainer: {
      padding: Math.max(0.04 * height, 14),
    },
    contentText: {
      color: '#111827',
      fontSize: Math.min(Math.max(0.04 * height, 14), 17),
      lineHeight: Math.min(Math.max(0.04 * height, 14), 17) * 1.5,
    },
    spacer: {
      height: Math.max(0.025 * height, 8),
    },
    // formulas stand out from the explanation around them
    formulaBox: {
      backgroundColor: '#F3F4F6',
      borderLeftWidth: 4,
      borderLeftColor: '#9CA3AF',
      borderRadius: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginVertical: 3,
    },
    formulaText: {
      color: '#111827',
      fontSize: Math.min(Math.max(0.04 * height, 14), 17),
      lineHeight: Math.min(Math.max(0.04 * height, 14), 17) * 1.5,
    },
  });
};
