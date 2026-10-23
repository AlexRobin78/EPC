// Numeric keypad for entering decimal answers (e.g. an EPC like 15.2).
//
// Layout:   1  2  3 | 
//           4  5  6 | ENTER (tall key on the right)
//           7  8  9 |
//           .  0  ⌫ |
//
// The keypad fills whatever space its parent gives it: the keys stretch to fit, so give
// it a container with a real height and it will use all of it. Safe-area padding is the
// screen's job, not the keypad's.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MAX_LENGTH = 10;

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

const LABELS = { backspace: '⌫' };

export default function Keypad({ value, setValue, isDisabled, onEnter, placeholder = "Enter EPC" }) {
  const handlePress = (key) => {
    if (isDisabled) return;

    if (key === 'backspace') {
      setValue(prev => prev.slice(0, -1));
    } else if (key === '.') {
      // One decimal point only; a leading "." becomes "0."
      setValue(prev => (prev.includes('.') ? prev : prev === '' ? '0.' : prev + '.'));
    } else {
      setValue(prev => (prev.length < MAX_LENGTH ? prev + key : prev));
    }
  };

  const handleEnter = () => {
    if (isDisabled || !onEnter) return;
    onEnter(value);
    setValue("");
  };

  return (
    <View style={[styles.wrapper, isDisabled && styles.disabled]}>
      <View style={styles.displayArea}>
        <Text
          style={[styles.displayText, !value && styles.placeholderText]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value || placeholder}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.digits}>
          {DIGIT_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.6}
                  style={styles.key}
                  onPress={() => handlePress(key)}
                  accessibilityRole="button"
                  accessibilityLabel={key === 'backspace' ? 'Backspace' : key === '.' ? 'Decimal point' : key}
                >
                  <Text style={styles.keyText}>{LABELS[key] ?? key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.6}
          style={styles.enterKey}
          onPress={handleEnter}
          accessibilityRole="button"
          accessibilityLabel="Enter"
        >
          <Text style={styles.enterText} numberOfLines={1} adjustsFontSizeToFit>ENTER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const GAP = 6;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 480, // keeps it from getting absurdly wide on tablets
    alignSelf: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: GAP + 2,
    gap: GAP,
  },
  disabled: {
    opacity: 0.4,
  },
  displayArea: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
  },
  displayText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  digits: {
    flex: 3,
    gap: GAP,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  key: {
    flex: 1,
    backgroundColor: '#3A3A3C',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '500',
  },
  enterKey: {
    flex: 1,
    backgroundColor: 'green',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  enterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
