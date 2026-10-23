import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from 'expo-splash-screen'; // 1. Import the Splash Screen module
import { useEffect, useState } from 'react';
import { Platform, Text, useWindowDimensions, View } from 'react-native';
import { themeMap, themes } from '../assets/themes';
import Benjamin_Quiz from "../scenes/Benjamin_Quiz";
import Benjamin_Quiz_Settings from "../scenes/Benjamin_Quiz_Settings";
import Customize from "../scenes/Customize";
import EPC_Quiz from "../scenes/EPC_Quiz";
import EPC_Quiz_Results from "../scenes/EPC_Quiz_Results";
import Benjamin_Quiz_Results from "../scenes/Benjamin_Quiz_Results";
import EPC_Quiz_Settings from "../scenes/EPC_Quiz_Settings";
import Home from "../scenes/Home";
import Learn from "../scenes/Learn";
import One_Player from "../scenes/One_Player";
import Quiz from "../scenes/Quiz";
import SetupPosition from "../scenes/SetupPosition";
import Two_Players from "../scenes/Two_Players";
import { GameContext } from './GameContext';

// Keep the splash screen visible while we fetch resources/assets
SplashScreen.preventAutoHideAsync().catch(() => {
  /* manage error */
});

const Stack = createNativeStackNavigator();

export default function App() {
  // On the web a phone can't be locked to landscape, so ask the user to rotate it
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const askToRotate = Platform.OS === 'web' && winHeight > winWidth && winWidth < 700;

  const [soloCheckersCopy, setSoloCheckersCopy] = useState(
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  );

  const [pairCheckersCopy, setPairCheckersCopy] = useState([
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ]);

  const [selectedTheme, setSelectedTheme] = useState(themes[1]);

  // 2. Add a useEffect hook to hide the splash screen once mounted
  useEffect(() => {
    // Hide the splash screen immediately
    SplashScreen.hideAsync().catch(() => {
      /* manage error */
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
    <NavigationContainer>
      <GameContext.Provider value={{ soloCheckersCopy, setSoloCheckersCopy, pairCheckersCopy, setPairCheckersCopy, themes, selectedTheme, setSelectedTheme, themeMap }}>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={Home}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SetupPosition"
            component={SetupPosition}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="One_Player"
            component={One_Player}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Two_Players"
            component={Two_Players}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Quiz"
            component={Quiz}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Learn"
            component={Learn}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Customize"
            component={Customize}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EPC_Quiz"
            component={EPC_Quiz}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Benjamin_Quiz"
            component={Benjamin_Quiz}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EPC_Quiz_Settings"
            component={EPC_Quiz_Settings}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Benjamin_Quiz_Settings"
            component={Benjamin_Quiz_Settings}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EPC_Quiz_Results"
            component={EPC_Quiz_Results}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Benjamin_Quiz_Results"
            component={Benjamin_Quiz_Results}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </GameContext.Provider>
    </NavigationContainer>
    {askToRotate && (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 100 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}>Please rotate your phone</Text>
        <Text style={{ color: '#ccc', fontSize: 15, textAlign: 'center', marginTop: 8 }}>This app is designed for landscape (sideways) screens.</Text>
      </View>
    )}
    </View>
  );
}