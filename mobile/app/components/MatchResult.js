import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

export default function MatchResult({ match }) {
    const when = new Date(match.timestamp).toLocaleString();
    const resultColor = match.draw ? colors.muted : match.won ? colors.accent2 : colors.accent;
    const resultText = match.draw ? 'DRAW' : match.won ? `WIN +${match.xpEarned} XP` : 'LOSS';

    return (
        <View style={styles.row}>
            <View style={{ flex: 1 }}>
                <Text style={styles.opponent} numberOfLines={1}>
                    vs {match.opponentCar}
                </Text>
                <Text style={styles.when}>{when}</Text>
            </View>
            <Text style={[styles.result, { color: resultColor }]}>{resultText}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8
    },
    opponent: { color: colors.text, fontSize: 14, fontWeight: '600' },
    when: { color: colors.muted, fontSize: 12, marginTop: 2 },
    result: { fontWeight: '700', fontSize: 13, marginLeft: 8 }
});
