import { useContext } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { GameContext } from '../app/GameContext';
import { carnivalTheme, themeMap } from '../assets/themes';

export default function Home({ navigation }) {
  const { height, width } = useWindowDimensions();
  const { selectedTheme } = useContext(GameContext);
  
  const activeTheme = themeMap && themeMap.has(selectedTheme) 
        ? themeMap.get(selectedTheme) 
        : carnivalTheme;

  const styles = stylesFunc(height, width, activeTheme);

  const navItems = [
    { title: 'Setup Position', screen: 'SetupPosition', subtitle: 'Configure positions & settings' },
    { title: 'Quiz', screen: 'Quiz', subtitle: 'Test your knowledge & skill' },
    { title: 'Learn', screen: 'Learn', subtitle: 'Explore guides & study materials' },
    { title: 'Customize', screen: 'Customize', subtitle: 'Change themes & preferences' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>EPC Practice App</Text>
        <Text style={styles.subHeader}>Select a mode to get started</Text>
      </View>

      {/* Main Navigation Menu */}
      <View style={styles.menuContainer}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.button}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>{item.title}</Text>
              <Text style={styles.buttonSubtitle}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const stylesFunc = (height, width, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.backgroundColor || '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Math.min(height * 0.04, 40),
  },
  appTitle: {
    color: theme?.textCol || '#1A1A1A',
    fontSize: Math.min(height * 0.04, 32),
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subHeader: {
    color: theme?.textCol || '#666666',
    opacity: 0.75,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  menuContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
    alignItems: 'center',
  },
  button: {
    backgroundColor: theme?.buttonCol || '#007AFF',
    width: '100%',
    paddingVertical: Math.min(height * 0.02, 18),
    paddingHorizontal: 24,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',

    // iOS Elevation & Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,

    // Android Elevation
    elevation: 4,
  },
  buttonContent: {
    alignItems: 'center',
  },
  buttonText: {
    color: theme?.buttonTextCol || '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonSubtitle: {
    color: theme?.buttonTextCol || '#FFFFFF',
    opacity: 0.8,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '400',
    textAlign: 'center',
  },
});