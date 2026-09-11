import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import BadgeGrid from '../components/BadgeGrid';
import api from '../utils/api';
import storage from '../utils/storage';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

function StatBox({ label, value }) {
    return (
        <View style={styles.statBox}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

export default function ProfileScreen({ route, navigation }) {
    const [userId, setUserId] = useState(route?.params?.userId || null);
    const [profile, setProfile] = useState(null);
    const [badges, setBadges] = useState([]);
    const [error, setError] = useState('');
    const [followBusy, setFollowBusy] = useState(false);

    useEffect(() => {
        (async () => {
            if (!route?.params?.userId) {
                const currentUser = await storage.getUser();
                setUserId(currentUser?.id || null);
            }
        })();
    }, [route?.params?.userId]);

    const load = useCallback(async () => {
        if (!userId) return;
        setError('');
        try {
            const [profileRes, badgesRes] = await Promise.all([api.getUserProfile(userId), api.getUserBadges(userId)]);
            setProfile(profileRes);
            setBadges(badgesRes.badges);
        } catch (err) {
            setError(err.message);
        }
    }, [userId]);

    // Focus-based (not mount-only) so coming back from "View Garage" or from
    // toggling follow elsewhere reflects the latest counts/rank.
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    useEffect(() => {
        navigation.setOptions({ title: profile ? profile.user.username : 'Profile' });
    }, [navigation, profile]);

    async function toggleFollow() {
        if (!profile) return;
        setFollowBusy(true);
        try {
            if (profile.viewerIsFollowing) {
                await api.unfollowUser(userId);
            } else {
                await api.followUser(userId);
            }
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setFollowBusy(false);
        }
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    const { user, allTime, currentSeason, isSelf, viewerIsFollowing, followersCount, followingCount } = profile;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.followCounts}>
                {followersCount} followers · {followingCount} following
            </Text>

            <View style={styles.actionsRow}>
                {!isSelf && (
                    <TouchableOpacity
                        style={[styles.followButton, viewerIsFollowing ? styles.followButtonActive : styles.followButtonInactive]}
                        onPress={toggleFollow}
                        disabled={followBusy}
                    >
                        <Text style={[styles.followButtonText, viewerIsFollowing && styles.followButtonTextActive]}>
                            {followBusy ? '...' : viewerIsFollowing ? 'Unfollow' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={styles.garageButton}
                    onPress={() => navigation.navigate('Garage', { userId: user.id })}
                >
                    <Text style={styles.garageButtonText}>View Garage</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>All-time stats</Text>
                <View style={styles.statsRow}>
                    <StatBox label="XP" value={allTime.total_xp} />
                    <StatBox label="W / L" value={`${allTime.wins} / ${allTime.losses}`} />
                    <StatBox label="Win %" value={`${allTime.winRate}%`} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>This season</Text>
                <View style={styles.statsRow}>
                    <StatBox label="XP" value={currentSeason.total_xp} />
                    <StatBox label="Rank" value={currentSeason.rank ? `#${currentSeason.rank}` : '—'} />
                    <StatBox label="Win %" value={`${currentSeason.winRate}%`} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Badges</Text>
                <BadgeGrid badges={badges} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    error: { color: colors.accent, fontSize: 13 },
    username: { color: colors.text, fontSize: 22, fontWeight: '800' },
    followCounts: { color: colors.muted, fontSize: 13, marginTop: 4 },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    followButton: { minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    followButtonInactive: { backgroundColor: colors.accent },
    followButtonActive: { borderWidth: 1, borderColor: colors.border },
    followButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
    followButtonTextActive: { color: colors.text },
    garageButton: { minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    garageButtonText: { color: colors.text, fontWeight: '700', fontSize: 14 },
    section: { marginTop: 24 },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
    statLabel: { color: colors.muted, fontSize: 11, marginTop: 2, textTransform: 'uppercase' }
});
