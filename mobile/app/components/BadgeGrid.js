import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

function BadgeTile({ badge }) {
    const locked = !badge.earned;
    return (
        <View style={[styles.tile, locked && styles.tileLocked]}>
            <Text style={styles.icon}>{badge.icon_url || '🏅'}</Text>
            <Text style={styles.name} numberOfLines={2}>
                {badge.name}
            </Text>
            {locked && badge.target > 1 && (
                <Text style={styles.progress}>
                    {badge.progress}/{badge.target}
                </Text>
            )}
        </View>
    );
}

export default function BadgeGrid({ badges }) {
    if (!badges || badges.length === 0) {
        return <Text style={styles.empty}>No badges yet.</Text>;
    }

    return (
        <View style={styles.grid}>
            {badges.map((badge) => (
                <BadgeTile key={badge.id} badge={badge} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: {
        width: '31%',
        minHeight: 90,
        borderWidth: 1,
        borderColor: '#1f6b45',
        backgroundColor: 'rgba(47,211,107,0.12)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8
    },
    tileLocked: { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.03)', opacity: 0.6 },
    icon: { fontSize: 26 },
    name: { color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 4 },
    progress: { color: colors.muted, fontSize: 10, marginTop: 2 },
    empty: { color: colors.muted, fontSize: 13 }
});
