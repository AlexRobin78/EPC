// Stats panel for the Two Player screen. Two cards that fill the width of the side panel and scale
// with the usable screen height:
//   1. the two players side by side: estimated EPC, actual EPC, variance
//   2. the cube decision: the GNU Backgammon engine's verdict (marked ≈ when it comes from the approximate
//      race model used for checkers beyond the 6 point), the equity of each cube action
//      (no double / double-take / double-pass) and the Benjamin-count rule of thumb for comparison.

import { StyleSheet, Text, View } from 'react-native';
import { round2 } from '../assets/formatNumber';

const clean = (value) => (value === "-1.0" || value === "-1" || value === -1 || value === undefined || value === null ? "N/A" : round2(value));

// `approx` marks values from the approximate race model (checkers beyond the 6 point) with a leading ≈
const fmtEq = (v, approx) => (typeof v === 'number' && isFinite(v) ? (approx ? '≈ ' : '') + (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(3) : "N/A");
const fmtPct = (v, approx) => (typeof v === 'number' && isFinite(v) ? (approx ? '≈ ' : '') + (100 * v).toFixed(1) + '%' : "N/A");

function Cell({ children, bg, flex, align, styles, small }) {
  return (
    <View style={[styles.cell, { backgroundColor: bg, flex, alignItems: align || 'center' }]}>
      <Text style={small ? styles.valueTextSmall : styles.valueText} numberOfLines={1} adjustsFontSizeToFit>
        {children}
      </Text>
    </View>
  );
}

function TwoPlayerStats({ topEPC, topVar, topActEPC, botEPC, botVar, botActEPC, cubeDec, cube, height, theme }) {
  const styles = stylesFunc(height, theme);

  const playerRows = [
    { label: 'Estimated EPC', top: topEPC, bot: botEPC },
    { label: 'Actual EPC', top: topActEPC, bot: botActEPC },
    { label: 'Variance', top: topVar, bot: botVar, small: true },
  ];

  // Which of the three equity rows is the engine's choice
  const best = cube ? (cube.short === 'D/T' ? 'dt' : cube.short === 'D/P' ? 'dp' : 'nd') : null;
  const ap = !!cube?.approx;
  const decisionText = cube
    ? (ap ? '≈ ' : '') + cube.short + (cube.tooGood ? ' (too good)' : '') + (cube.optional ? ' *' : '')
    : "N/A";

  const cubeRows = [
    { key: 'dec', label: 'Money Decision', value: decisionText, bold: true },
    { key: 'nd', label: 'No Double', value: cube ? fmtEq(cube.nd, ap) : "N/A" },
    { key: 'dt', label: 'Double / Take', value: cube ? fmtEq(cube.dt, ap) : "N/A" },
    { key: 'dp', label: 'Double / Pass', value: cube ? fmtEq(cube.dp, ap) : "N/A" },
    { key: 'win', label: 'Win chance', value: cube ? fmtPct(cube.win, ap) : "N/A" },
    { key: 'rule', label: 'Benjamin rule', value: clean(cubeDec) },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: '#000' }]}>
        <View style={styles.row}>
          <Cell bg="lightgray" flex={3} align="flex-start" styles={styles}> </Cell>
          <View style={[styles.cell, styles.headCell, { flex: 2, backgroundColor: theme?.checkerCols?.[0] }]}>
            <Text style={styles.headText} numberOfLines={1}>Top</Text>
          </View>
          <View style={[styles.cell, styles.headCell, { flex: 2, backgroundColor: theme?.checkerCols?.[1] }]}>
            <Text style={styles.headText} numberOfLines={1}>Bottom</Text>
          </View>
        </View>
        {playerRows.map((row, r) => {
          const a = r % 2 === 0 ? 'lightgray' : 'pink';
          const b = r % 2 === 0 ? 'pink' : 'lightgray';
          return (
            <View key={row.label} style={styles.row}>
              <View style={[styles.cell, { flex: 3, backgroundColor: a, alignItems: 'flex-start' }]}>
                <Text style={styles.labelText} numberOfLines={1} adjustsFontSizeToFit>{row.label}</Text>
              </View>
              <Cell bg={b} flex={2} styles={styles} small={row.small}>{clean(row.top)}</Cell>
              <Cell bg={a} flex={2} styles={styles} small={row.small}>{clean(row.bot)}</Cell>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { borderColor: '#000' }]}>
        {cubeRows.map((row, r) => {
          const labelBg = r % 2 === 0 ? 'lightgray' : 'pink';
          let valueBg = r % 2 === 0 ? 'pink' : 'lightgray';
          if (row.key === best) valueBg = '#9be39b';       // the engine's choice
          return (
            <View key={row.key} style={styles.row}>
              <View style={[styles.cell, { flex: 3, backgroundColor: labelBg, alignItems: 'flex-start' }]}>
                <Text style={styles.labelText} numberOfLines={1} adjustsFontSizeToFit>{row.label}</Text>
              </View>
              <View style={[styles.cell, { flex: 4, backgroundColor: valueBg }]}>
                <Text style={row.bold ? styles.valueTextBold : styles.valueText} numberOfLines={1} adjustsFontSizeToFit>
                  {row.value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const stylesFunc = (height, theme) => {
  const gap = Math.max(0.03 * height, 8);
  // 4 rows in the first card + 6 in the second share the height
  const rowHeight = Math.min(Math.max((height - 3 * gap - 24) / 10.2, 20), 40);
  const radius = Math.max(0.02 * height, 6);
  const fontSize = Math.min(Math.max(rowHeight * 0.42, 10), 15);

  return StyleSheet.create({
    container: {
      width: '100%',
      gap,
      backgroundColor: theme?.backgroundColor,
    },
    card: {
      borderWidth: 3,
      borderRadius: radius,
      overflow: 'hidden',
    },
    row: {
      height: rowHeight,
      flexDirection: 'row',
    },
    cell: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Math.max(0.01 * height, 4),
    },
    headCell: {
      borderLeftWidth: 1,
      borderColor: '#000',
    },
    headText: {
      color: '#fff',
      fontSize,
      fontWeight: 'bold',
      textShadowColor: '#000',
      textShadowRadius: 3,
    },
    labelText: {
      color: '#333',
      fontSize,
      fontWeight: 'bold',
    },
    valueText: {
      color: 'black',
      fontSize,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    valueTextBold: {
      color: 'black',
      fontSize: fontSize + 1,
      fontWeight: '900',
      textAlign: 'center',
    },
    valueTextSmall: {
      color: 'black',
      fontSize: fontSize - 2,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });
};

export default TwoPlayerStats;
