// Stats panel for the One Player screen: five label/value rows that fill the width
// of the side panel they're placed in and scale with the usable screen height.

import { StyleSheet, Text, View } from 'react-native';
import { round2 } from '../assets/formatNumber';

function OnePlayerStats({ EPCText, VarianceText, MethodText, BestimateText, FastimateText, height, theme }) {
    const styles = stylesFunc(height, theme);
    const rows = [
        { label: "Actual EPC", value: EPCText },
        { label: "Variance", value: VarianceText },
        { label: "Method", value: MethodText },
        { label: "Bestimate", value: BestimateText },
        { label: "Fastimate", value: FastimateText },
    ].filter((r) => r.label !== "Fastimate" || (r.value && r.value !== "N/A"));   // Fastimate row only when it applies (not on an empty board either)

    return (
        <View style={styles.statsWrapper}>
            {rows.map((item) => (
                <View key={item.label} style={styles.row}>
                    <View style={styles.labelCell}>
                        <Text style={styles.labelText} numberOfLines={1} adjustsFontSizeToFit>
                            {item.label}
                        </Text>
                    </View>
                    <View style={styles.valueCell}>
                        <Text style={styles.valueText} numberOfLines={1} adjustsFontSizeToFit>
                            {round2(item.value)}
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const stylesFunc = (height, theme) => {
    const rowHeight = Math.min(Math.max(0.075 * height, 34), 56);
    const radius = rowHeight * 0.4;
    const fontSize = Math.min(Math.max(0.032 * height, 12), 16);

    return StyleSheet.create({
        statsWrapper: {
            width: '100%',
            gap: Math.max(0.035 * height, 8),
        },
        row: {
            height: rowHeight,
            flexDirection: 'row',
        },
        labelCell: {
            flex: 1,
            backgroundColor: 'lightgray',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingHorizontal: Math.max(0.02 * height, 8),
            borderTopLeftRadius: radius,
            borderBottomLeftRadius: radius,
        },
        valueCell: {
            flex: 1,
            backgroundColor: 'pink',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: Math.max(0.02 * height, 8),
            borderTopRightRadius: radius,
            borderBottomRightRadius: radius,
        },
        labelText: {
            color: 'black',
            fontSize,
            fontWeight: 'bold',
            fontFamily: 'Arial',
        },
        valueText: {
            color: 'black',
            fontSize,
            fontWeight: 'bold',
            fontFamily: 'Arial',
            textAlign: 'center',
        },
    });
};

export default OnePlayerStats;
