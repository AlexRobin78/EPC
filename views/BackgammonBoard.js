// Component file for the Backgammon board view. Takes numCheckers and liftToTop as props.

import { createContext, useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { GameContext } from '../app/GameContext';
import { carnivalTheme, themeMap } from '../assets/themes';

// Shares the board's measured size with every Point so triangles, checkers and trays
// all scale with the board instead of the raw window height.
const BoardUnitContext = createContext(null);

function boardIDTranslate(x) {
    switch (x) {
        case 'z':
            return 0;
        default:
            return x.charCodeAt(0) - 96; // 'a' is 97 in ASCII
    }
}

const Point = ({ liftValue, countA, countB, inputStyle, isTop, activePlayer, isMulti, theme }) => {
  const windowHeight = useWindowDimensions().height;
  const height = useContext(BoardUnitContext) ?? windowHeight;
  const heightChecker = height * 0.08;
  const heightPoint = height * 0.384;
  const styles = stylesFunc(height, theme);
  
  // Determine count
  const isPlayerA = isMulti ? (countA > 0 || countB === 0) : true;
  const count = isMulti ? (countA > 0 ? countA : countB) : countA;
  const activeCheckerColor = isPlayerA ? theme?.checkerCols[1] : theme?.checkerCols[0];
  const activeCheckerBorderColor = isPlayerA ? theme?.checkerBorderCols[1] : theme?.checkerBorderCols[0];

  // Where inside the point was it tapped? On a phone React Native gives locationY directly; on the web the
  // press event is a browser click, which has no locationY, so measure it from the element's bounding box.
  const tapY = (event) => {
      const ne = event?.nativeEvent ?? {};
      if (typeof ne.locationY === 'number' && isFinite(ne.locationY)) return ne.locationY;
      const el = event?.currentTarget;
      const clientY = ne.clientY ?? event?.clientY ?? ne.pageY;
      if (el && typeof el.getBoundingClientRect === 'function' && typeof clientY === 'number') {
        return clientY - el.getBoundingClientRect().top;
      }
      return undefined;
  };

  const handlePress = (event) => {
      const locationY = tapY(event);
      if (locationY === undefined) return;   // never pass NaN on to the board
      const preLevel = Math.ceil((heightPoint - locationY) / heightChecker);
      const level = isTop ? (6 - preLevel) : preLevel;
      if (!Number.isFinite(level)) return;
      liftValue(level, activePlayer);
  };

  const handleLongPress = (event) => {
    liftValue(0, activePlayer);
  }

  return (
    // Create a touchable point with a function to either add or remove components
    // Create a list of n checkers where n is the number of components added
    <TouchableOpacity style={inputStyle} activeOpacity={1}
                      onPress={handlePress} onLongPress={handleLongPress}>
        <View style={isTop ? styles.myContainerTop : styles.myContainerBottom}>
            {Array.from({ length: Math.min(5, count) }).map((_, index) => (
            <View key={index} style={[styles.circle, { backgroundColor: activeCheckerColor, borderColor: activeCheckerBorderColor, borderWidth: 1 }]} pointerEvents="none">
              <Text style={styles.checkerText}>
                {((index === 0 && isTop) || (index == 4 && !isTop)) && count > 5 ? count.toString() : ""}
              </Text>
            </View>
            ))}
        </View>
    </TouchableOpacity>
  );
};

function getNumHomeCheckers(numCheckers) {
    return 15 - numCheckers.reduce((acc, item) => acc + item, 0);
}

function getPipCount(numCheckers, isPlayerA = true) {
  if (!isPlayerA) {
    numCheckers = numCheckers.slice().reverse();
    console.log("reversed", numCheckers);
  }
  return numCheckers.reduce((acc, item, index) => acc + item * (index + 1), 0);
}

function BackgammonBoard({ checkersA, checkersB, liftToTop, onCallParentFunction, isInteractive }) {
  const { height: windowHeight } = useWindowDimensions();
  // Size of the area this component is given (measured on layout)
  const [area, setArea] = useState(null);
  // `height` is the unit all sizes below were tuned for (board is 0.9 * unit tall and
  // 1.376x as wide as it is tall). Derive it from the available area so the board and
  // everything inside it fits on any screen.
  const height = area
    ? Math.min(area.height, area.width / (BOARD_ASPECT * BOARD_HEIGHT_FRACTION))
    : windowHeight;
  const { soloCheckersCopy, setSoloCheckersCopy, pairCheckersCopy, setPairCheckersCopy, selectedTheme } = useContext(GameContext);
  const activeTheme = themeMap && themeMap.has(selectedTheme) 
    ? themeMap.get(selectedTheme) 
    : carnivalTheme;
  const styles = stylesFunc(height, activeTheme);

  //console.log("checkersA", checkersA, "checkersB", checkersB);
  const isMulti = (checkersB[0] != -1);
  //console.log("isMulti", isMulti, checkersB);

  // Toggle between A and B
  const [selectedPlayer, setSelectedPlayer] = useState('A');
  const [bottomPipCount, setBottomPipCount] = useState(0);
  const [topPipCount, setTopPipCount] = useState(0);

  useEffect(() => {
    setBottomPipCount(getPipCount(checkersA));
    setTopPipCount(getPipCount(checkersB, false));
    onCallParentFunction();
  }, [checkersA, checkersB]);

    return (
      <BoardUnitContext.Provider value={height}>
        <View
          style={styles.container}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setArea(prev => (prev && prev.width === w && prev.height === h) ? prev : { width: w, height: h });
          }}>
            <View style={styles.board}>
                  <View style={styles.NWtray}/>
                  <View style={styles.NEtray}>
                  {isMulti && (
                    <>
                      {Array.from({ length: getNumHomeCheckers(checkersB) }).map((_, index) => (
                        <View key={index} style={[styles.stackedChecker, { backgroundColor: activeTheme?.checkerCols[0], borderColor: activeTheme?.checkerBorderCols[0], borderWidth: 1 }]} />
                      ))}
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                        {getNumHomeCheckers(checkersB)}
                      </Text>
                    </>
                  )}
                </View>
                <View style={styles.SWtray}/>
                <View style={styles.SEtray}>
                  {Array.from({ length: getNumHomeCheckers(checkersA) }).map((_, index) => (
                        <View key={index} style={[styles.stackedChecker, { backgroundColor: activeTheme?.checkerCols[1], borderColor: activeTheme?.checkerBorderCols[1], borderWidth: 1 }]} />
                    ))}
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                        {getNumHomeCheckers(checkersA)}
                    </Text>
                </View>

                <View style={styles.surface}>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 13, selectedPlayer)}
                          countA={checkersA[12]}
                          countB={checkersB[12]}
                          inputStyle={styles.pointADown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 14, selectedPlayer)}
                          countA={checkersA[13]}
                          countB={checkersB[13]}
                          inputStyle={styles.pointBDown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 15, selectedPlayer)}
                          countA={checkersA[14]}
                          countB={checkersB[14]}
                          inputStyle={styles.pointADown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 16, selectedPlayer)}
                          countA={checkersA[15]}
                          countB={checkersB[15]}
                          inputStyle={styles.pointBDown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 17, selectedPlayer)}
                          countA={checkersA[16]}
                          countB={checkersB[16]}
                          inputStyle={styles.pointADown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 18, selectedPlayer)}
                          countA={checkersA[17]}
                          countB={checkersB[17]}
                          inputStyle={styles.pointBDown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 12, selectedPlayer)}
                          countA={checkersA[11]}
                          countB={checkersB[11]}
                          inputStyle={styles.pointBUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 11, selectedPlayer)}
                          countA={checkersA[10]}
                          countB={checkersB[10]}
                          inputStyle={styles.pointAUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 10, selectedPlayer)}
                          countA={checkersA[9]}
                          countB={checkersB[9]}
                          inputStyle={styles.pointBUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 9, selectedPlayer)}
                          countA={checkersA[8]}
                          countB={checkersB[8]}
                          inputStyle={styles.pointAUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 8, selectedPlayer)}
                          countA={checkersA[7]}
                          countB={checkersB[7]}
                          inputStyle={styles.pointBUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 7, selectedPlayer)}
                          countA={checkersA[6]}
                          countB={checkersB[6]}
                          inputStyle={styles.pointAUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}
                          />
                </View>
                <View style={styles.bar}>
                  {isMulti ? (<Text style={styles.pipCount}>
                    {topPipCount}
                  </Text>) : (<Text style={styles.pipCount}> {" "}</Text>)
                  }
                  {isMulti && isInteractive && (
                    <TouchableOpacity 
                      style={[styles.toggleButton, { borderColor: selectedPlayer === 'A' ? activeTheme?.checkerCols[1] : activeTheme?.checkerCols[0] }]}
                      onPress={() => setSelectedPlayer(prev => prev === 'A' ? 'B' : 'A')}>
                      <Text style={styles.toggleText} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.5}>EDIT</Text>
                      <View style={[styles.indicator, { backgroundColor: selectedPlayer === 'A' ? activeTheme?.checkerCols[1] : activeTheme?.checkerCols[0] }]} />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.pipCount}>
                    {bottomPipCount}
                  </Text>
                </View>
                <View style={styles.surface}>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 19, selectedPlayer)}
                          countA={checkersA[18]}
                          countB={checkersB[18]}
                          inputStyle={styles.pointADown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 20, selectedPlayer)}
                          countA={checkersA[19]}
                          countB={checkersB[19]}
                          inputStyle={styles.pointBDown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 21, selectedPlayer)}
                          countA={checkersA[20]}
                          countB={checkersB[20]}
                          inputStyle={styles.pointADown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 22, selectedPlayer)}
                          countA={checkersA[21]}
                          countB={checkersB[21]}
                          inputStyle={styles.pointBDown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 23, selectedPlayer)}
                          countA={checkersA[22]}
                          countB={checkersB[22]}
                          inputStyle={styles.pointADown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 24, selectedPlayer)}
                          countA={checkersA[23]}
                          countB={checkersB[23]}
                          inputStyle={styles.pointBDown}
                          isTop={true}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 6, selectedPlayer)}
                          countA={checkersA[5]}
                          countB={checkersB[5]}
                          inputStyle={styles.pointBUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 5, selectedPlayer)}
                          countA={checkersA[4]}
                          countB={checkersB[4]}
                          inputStyle={styles.pointAUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 4, selectedPlayer)}
                          countA={checkersA[3]}
                          countB={checkersB[3]}
                          inputStyle={styles.pointBUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 3, selectedPlayer)}
                          countA={checkersA[2]}
                          countB={checkersB[2]}
                          inputStyle={styles.pointAUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 2, selectedPlayer)}
                          countA={checkersA[1]}
                          countB={checkersB[1]}
                          inputStyle={styles.pointBUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                        <Point 
                          liftValue={(newValue) => liftToTop(newValue, 1, selectedPlayer)}
                          countA={checkersA[0]}
                          countB={checkersB[0]}
                          inputStyle={styles.pointAUp}
                          isTop={false}
                          activePlayer={selectedPlayer}
                          isMulti={isMulti}
                          theme={activeTheme}/>
                </View>
            </View>
        </View>
      </BoardUnitContext.Provider>
    )
}


const BOARD_ASPECT = 1.376;
const BOARD_HEIGHT_FRACTION = 0.9;

const stylesFunc = (height, theme) => StyleSheet.create({
  point : {
    width: '100%',
    aspectRatio: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme?.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Arial',
  },
  checkerText: {
    color: 'black',
    fontSize: 12,
    fontFamily: 'Arial',
  },
  pipCount: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'bold'
  },
  board : {
    height: height * BOARD_HEIGHT_FRACTION,
    aspectRatio: BOARD_ASPECT,
    backgroundColor: theme?.frameCol,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: height * 0.003,
    alignItems: 'center',
  },
  surface: {
    height: '99%',
    width: '40%',
    backgroundColor: theme?.surfaceCol,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignContent: 'space-between',
  },
  bar: {
    height: '100%',
    width: '6%',
    backgroundColor: theme?.barCol,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 0.01 * height
  },
  toggleButton: {
    paddingVertical: 5,
    paddingHorizontal: 2,
    maxWidth: '100%',
    borderWidth: 2,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: theme?.toggleButtonCol,
  },
  toggleText: {
    color: 'white',
    fontSize: 6,
    textAlign: 'center',
    includeFontPadding: false,
  },
  indicator: {
    width: 20,
    height: 10,
    marginTop: 4,
    borderRadius: 2,
  },
  pointADown: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: height * 0.041, // Adjust size as needed
    borderRightWidth: height * 0.041, // Adjust size as needed
    borderTopWidth: height * 0.384, // Adjust size as needed
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme?.pointCols[0], // Color of the triangle
  },
  pointBDown: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: height * 0.041, // Adjust size as needed
    borderRightWidth: height * 0.041, // Adjust size as needed
    borderTopWidth: height * 0.384, // Adjust size as needed
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme?.pointCols[1], // Color of the triangle
  },
  pointAUp: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: height * 0.041, // Adjust size as needed
    borderRightWidth: height * 0.041, // Adjust size as needed
    borderBottomWidth: height * 0.384, // Adjust size as needed
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme?.pointCols[0], // Color of the triangle
  },
  pointBUp: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: height * 0.041, // Adjust size as needed
    borderRightWidth: height * 0.041, // Adjust size as needed
    borderBottomWidth: height * 0.384, // Adjust size as needed
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme?.pointCols[1], // Color of the triangle
  },
  NWtray: {
    position: 'absolute',
    width: 0.074 * height,
    height: 0.384 * height,
    backgroundColor: theme?.trayCol,
    top: 0.0045 * height,
    left: 0.0045 * height,
  },
  SWtray: {
    position: 'absolute',
    width: 0.074 * height,
    height: 0.384 * height,
    backgroundColor: theme?.trayCol,
    bottom: 0.0045 * height,
    left: 0.0045 * height,
    },
  NEtray: {
    position: 'absolute',
    width: 0.074 * height,
    height: 0.384 * height,
    backgroundColor: theme?.trayCol,
    top: 0.0045 * height,
    right: 0.0045 * height,
    alignItems: 'center',
  },
  SEtray: {
    position: 'absolute',
    width: 0.074 * height,
    height: 0.384 * height,
    backgroundColor: theme?.trayCol,
    bottom: 0.0045 * height,
    right: 0.0045 * height,
    flexDirection: 'column-reverse',
    alignItems: 'center',
    paddingBottom: 0.005 * height,
  },
  stackedChecker: {
    width: '90%',
    height: '5%',
    backgroundColor: theme?.checkerCols[0],
    borderWidth: 1,
  }, // Example color for the stacked checker}
  circle: {
        width: height * 0.08, // Adjust size as needed
        aspectRatio: 1,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: height * 0.04, // Half of the width/height
  },
  myContainerBottom: {
    flex: 1,
    top: height * 0.384,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'column-reverse',
  },
  myContainerTop: {
    flex: 1,
    bottom: height * 0.384,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'column-reverse',
  },
});

const styles = StyleSheet.create({
      circle: {
        width: 10,
        aspectRatio: 1,
        borderRadius: '%50', // Half of the width/height
        backgroundColor: 'blue',
      },
      myContainer: {
        flex: 1,
        backgroundColor: 'white',
      }
    });

export default BackgammonBoard;