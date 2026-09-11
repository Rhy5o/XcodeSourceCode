import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

export default function StatBar({ label, value, max }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    label: { color: colors.muted, fontSize: 13 },
    value: { color: colors.text, fontSize: 13, fontWeight: '600' },
    track: { backgroundColor: '#0d0f14', borderRadius: 6, height: 8, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: colors.accent2 }
});
