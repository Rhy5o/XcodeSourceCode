import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import api from '../utils/api';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

// Top 3 get a medal in place of a plain rank number — the leaderboard
// endpoint doesn't return each user's earned badges (that's a per-profile
// lookup, too expensive to do for 100 rows at once), so "badge" here is a
// rank medal rather than an actual earned-badges list.
function rankBadge(rank) {
    // The API serializes rank as a string (Postgres bigint -> JSON), so
    // this must coerce before comparing rather than using ===.
    const n = Number(rank);
    if (n === 1) return '🥇';
    if (n === 2) return '🥈';
    if (n === 3) return '🥉';
    return null;
}

function Row({ item, onPress }) {
    const medal = rankBadge(item.rank);
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.rank}>{medal || `#${item.rank}`}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.record}>
                    {item.wins}W / {item.losses}L
                </Text>
            </View>
            <Text style={styles.xp}>{item.total_xp} XP</Text>
        </TouchableOpacity>
    );
}

export default function LeaderboardScreen({ navigation }) {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        setError('');
        try {
            const res = await api.getLeaderboard('current', 1, 100);
            setRows(res.leaderboard);
        } catch (err) {
            setError(err.message);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (rows === null && !error) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <FlatList
                data={rows || []}
                keyExtractor={(item) => item.user_id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
                renderItem={({ item }) => (
                    <Row item={item} onPress={() => navigation.navigate('Profile', { userId: item.user_id })} />
                )}
                ListEmptyComponent={<Text style={styles.empty}>No races have finished yet this season.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    list: { padding: 16 },
    error: { color: colors.accent, fontSize: 13, marginHorizontal: 16, marginTop: 12 },
    empty: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 40 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 8,
        gap: 12
    },
    rank: { width: 36, color: colors.muted, fontSize: 15, fontWeight: '700' },
    username: { color: colors.text, fontSize: 15, fontWeight: '600' },
    record: { color: colors.muted, fontSize: 12, marginTop: 2 },
    xp: { color: colors.text, fontSize: 14, fontWeight: '700' }
});
