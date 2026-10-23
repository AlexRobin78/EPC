// "Show formula" pop-up: explains, step by step, how the EPC of a position is estimated by the formula that
// applies to it. Nothing is visible until the user presses the Formula button (FormulaButton below).
//
//   <FormulaButton onPress={...} style={...} textStyle={...} />      the rail / panel button
//   <FormulaModal visible onClose sections={[{ title, explanation }]} theme />
//
// `explanation` comes from explainChecker(checkers) (epcFormulas.js applied to a board array). One section per
// player (Two Player shows Top and Bottom); a section can have several methods (the position's Bestimate
// method and the Fastimate).

import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import positions from '../assets/epc_positions.json';
import { isWithinSixPoint, positionKey } from '../assets/epcEngine';
import { benjaminCount, explainEPC, num } from '../assets/epcFormulas';
import { prettify, tokenize } from '../assets/richtext';

// null when the position has no formula (outside the 6 point, not in the table, SSS, few checkers ...)
export function explainChecker(checkers) {
  if (!checkers || checkers.every((c) => c === 0)) return null;
  if (!isWithinSixPoint(checkers)) return null;
  const entry = positions[positionKey(checkers)];
  return explainEPC(checkers, entry);
}

// Cube-decision section for FormulaModal (the Benjamin Count). bottom / top are rows of epc_positions.json.
// Returns { decision, explanation } or null. `engineShort` (optional) is the exact engine verdict, shown as a note.
export function benjaminSection(bottom, top, engineShort) {
  const r = benjaminCount(bottom, top, engineShort);
  return r ? { decision: r.decision, explanation: { methods: [r.method], cube: true } } : null;
}

// ------------------------------------------------------------------ button
export function FormulaButton({ onPress, style, textStyle, label = 'Formula' }) {
  return (
    <TouchableOpacity style={style} onPress={onPress} accessibilityRole="button" accessibilityLabel="Show how the EPC is calculated">
      <Text style={textStyle} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </TouchableOpacity>
  );
}

// ------------------------------------------------------------------ rich text with Learn-tab colours
function Rich({ text, style, boldAll }) {
  const spans = tokenize(prettify(text));
  return (
    <Text style={style}>
      {spans.map((s, i) => (
        <Text key={i} style={s.color ? { color: s.color, fontWeight: 'bold' } : boldAll ? { fontWeight: 'bold' } : undefined}>
          {s.text}
        </Text>
      ))}
    </Text>
  );
}

function Tabs({ items, selected, onSelect, styles }) {
  if (items.length < 2) return null;
  return (
    <View style={styles.tabs}>
      {items.map((label, i) => (
        <TouchableOpacity key={label + i} style={[styles.tab, i === selected && styles.tabOn]} onPress={() => onSelect(i)}>
          <Text style={[styles.tabText, i === selected && styles.tabTextOn]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MethodView({ method, actual, styles }) {
  const diff = !method.cube && typeof actual === 'number' && isFinite(actual) ? method.total - actual : null;
  return (
    <View>
      <Text style={styles.methodName}>
        {method.title}
        {method.subtitle ? <Text style={styles.methodSub}>{'  ' + method.subtitle}</Text> : null}
      </Text>
      <Text style={styles.restrictions}>
        <Text style={styles.label}>Restrictions: </Text>
        {method.restrictions}
      </Text>
      <View style={styles.formulaBox}>
        <Rich text={method.formula} style={styles.formulaText} />
      </View>

      <View style={styles.table}>
        {method.steps.map((s, i) => (
          <View key={s.name + i} style={[styles.stepRow, i % 2 === 1 && styles.stepRowAlt]}>
            <Text style={styles.stepName} numberOfLines={2}>{s.name}</Text>
            <View style={styles.stepExpr}><Rich text={s.expr} style={styles.exprText} /></View>
            <Text style={styles.stepValue} numberOfLines={1} adjustsFontSizeToFit>{s.text !== undefined ? s.text : s.value === null || s.value === undefined ? '' : (!method.cube && s.value > 0 && i > 0 && !/^(Pip count|Rolls|Constant)$/.test(s.name) ? '+' : s.value < 0 ? '−' : '') + num(Math.abs(s.value))}</Text>
          </View>
        ))}
        <View style={[styles.stepRow, styles.totalRow]}>
          <Text style={[styles.stepName, styles.totalText]}>{method.totalLabel || 'Estimated EPC'}</Text>
          <View style={styles.stepExpr} />
          <Text style={[styles.stepValue, styles.totalText, method.totalText && { width: 130 }]} numberOfLines={1} adjustsFontSizeToFit>{method.totalText ?? num(method.total)}</Text>
        </View>
      </View>

      {method.notes.map((n, i) => (
        <Rich key={i} text={n} style={styles.note} />
      ))}
      {diff !== null && (
        <Text style={styles.note}>
          Actual EPC {num(actual)}: the estimate is {Math.abs(diff) < 0.005 ? 'exact' : num(Math.abs(diff)) + (diff > 0 ? ' too high' : ' too low')}.
        </Text>
      )}
    </View>
  );
}

// ------------------------------------------------------------------ modal
export default function FormulaModal({ visible, onClose, sections, theme }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = stylesFunc(height, width, insets, theme);
  const list = (sections || []).filter((s) => s && s.explanation);
  const [sec, setSec] = useState(0);
  const [meth, setMeth] = useState(0);

  useEffect(() => { if (visible) { setSec(0); setMeth(0); } }, [visible]);
  useEffect(() => { setMeth(0); }, [sec]);

  if (!list.length) return null;
  const cur = list[Math.min(sec, list.length - 1)];
  const methods = cur.explanation.methods;
  const m = methods[Math.min(meth, methods.length - 1)];

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['landscape', 'portrait']}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{cur.explanation.cube ? 'How the cube decision is made' : 'How the EPC is estimated'}</Text>
            <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <Tabs items={list.map((s) => s.title)} selected={sec} onSelect={setSec} styles={styles} />
          <Tabs items={methods.map((x) => x.title)} selected={meth} onSelect={setMeth} styles={styles} />
          <ScrollView contentContainerStyle={styles.body}>
            {!cur.explanation.cube && (
              <Text style={styles.posLine}>
                {list.length > 1 ? cur.title + ': ' : ''}N = {cur.explanation.N} checkers, pip count {cur.explanation.PC}
              </Text>
            )}
            <MethodView method={m} actual={cur.explanation.actual} styles={styles} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const stylesFunc = (height, width, insets, theme) => {
  const fs = Math.min(Math.max(0.034 * height, 12), 16);
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: Math.max(12, insets.top),
      paddingBottom: Math.max(12, insets.bottom),
      paddingLeft: Math.max(12, insets.left),
      paddingRight: Math.max(12, insets.right),
    },
    card: {
      width: '100%',
      maxWidth: 760,
      maxHeight: '100%',
      backgroundColor: '#fff',      // white like the Learn card, so the colours stay readable in every theme
      borderRadius: 14,
      borderWidth: 3,
      borderColor: theme?.buttonCol || '#444',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme?.buttonCol || '#444',
    },
    title: { color: theme?.buttonTextCol || '#fff', fontSize: fs + 2, fontWeight: 'bold', flex: 1 },
    close: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)' },
    closeText: { color: '#111', fontWeight: 'bold', fontSize: fs },
    tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 8 },
    tab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#9ca3af', backgroundColor: '#f3f4f6' },
    tabOn: { backgroundColor: '#111827', borderColor: '#111827' },
    tabText: { color: '#111827', fontSize: fs, fontWeight: 'bold' },
    tabTextOn: { color: '#fff' },
    body: { padding: 14, paddingBottom: 20 },
    posLine: { color: '#374151', fontSize: fs, marginBottom: 6 },
    methodName: { color: '#111827', fontSize: fs + 4, fontWeight: 'bold' },
    methodSub: { color: '#4b5563', fontSize: fs, fontWeight: 'normal' },
    restrictions: { color: '#111827', fontSize: fs, marginTop: 4 },
    label: { fontWeight: 'bold' },
    formulaBox: { marginTop: 8, padding: 8, backgroundColor: '#f3f4f6', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
    formulaText: { color: '#111827', fontSize: fs + 1 },
    table: { marginTop: 10, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, overflow: 'hidden' },
    stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff' },
    stepRowAlt: { backgroundColor: '#f9fafb' },
    stepName: { width: '26%', color: '#111827', fontSize: fs, fontWeight: 'bold' },
    stepExpr: { flex: 1, paddingHorizontal: 6 },
    exprText: { color: '#111827', fontSize: fs },
    stepValue: { width: 62, textAlign: 'right', color: '#111827', fontSize: fs, fontWeight: 'bold' },
    totalRow: { backgroundColor: '#e5e7eb' },
    totalText: { fontSize: fs + 1 },
    note: { color: '#374151', fontSize: fs - 1, marginTop: 6 },
  });
};
