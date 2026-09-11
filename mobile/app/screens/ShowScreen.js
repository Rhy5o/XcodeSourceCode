import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import StatBar from '../components/StatBar';
import MatchResult from '../components/MatchResult';
import api from '../utils/api';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

const POLL_MS = 2000;

function formatCountdown(seconds) {
    if (seconds === null || seconds === undefined) return '—:—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function ShowScreen() {
    const [status, setStatus] = useState(null);
    const [statusError, setStatusError] = useState('');
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [secondsLeft, setSecondsLeft] = useState(null);
    const nextRaceAtRef = useRef(null);

    const [activeCar, setActiveCar] = useState(null);
    const [matches, setMatches] = useState([]);
    const [busy, setBusy] = useState(false);
    const [toggleError, setToggleError] = useState('');

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.getShowStatus();
            setStatus(res);
            nextRaceAtRef.current = Date.now() + res.nextRaceIn * 1000;
            setSecondsLeft(res.nextRaceIn);
            setStatusError('');
        } catch (err) {
            setStatusError(err.message);
        } finally {
            setLoadingStatus(false);
        }
    }, []);

    // Polls /api/show/status every 2s (per spec item 10) — this is also
    // what naturally surfaces a new race result: the next poll after a
    // server-side race cycle just picks up the updated lastMatchResult.
    useEffect(() => {
        fetchStatus();
        const pollId = setInterval(fetchStatus, POLL_MS);
        return () => clearInterval(pollId);
    }, [fetchStatus]);

    // Ticks the on-screen countdown every second locally between polls,
    // resynced from the server's nextRaceIn on every poll rather than
    // drifting from purely local decrementing.
    useEffect(() => {
        const tickId = setInterval(() => {
            if (nextRaceAtRef.current === null) return;
            setSecondsLeft(Math.max(0, Math.round((nextRaceAtRef.current - Date.now()) / 1000)));
        }, 1000);
        return () => clearInterval(tickId);
    }, []);

    const loadCarAndMatches = useCallback(async () => {
        try {
            const garageRes = await api.getGarage();
            const car = garageRes.cars.find((c) => c.is_active);
            if (car) {
                const detail = await api.getCarWithMods(car.id);
                setActiveCar(detail);
            } else {
                setActiveCar(null);
            }
        } catch {
            // Non-fatal — the status card above still works without this.
        }
        try {
            const matchesRes = await api.getMyMatches();
            setMatches(matchesRes.matches.slice(0, 5));
        } catch {
            // Non-fatal.
        }
    }, []);

    useEffect(() => {
        loadCarAndMatches();
    }, [loadCarAndMatches]);

    // Re-pull the car/matches whenever a race just completed, so the "last
    // match result" and match history reflect it without a manual refresh.
    useEffect(() => {
        if (status?.lastMatchResult) {
            loadCarAndMatches();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status?.lastMatchResult?.timestamp]);

    async function handleToggle() {
        setBusy(true);
        setToggleError('');
        try {
            if (status?.isUserOnline) {
                await api.goOffline();
            } else {
                await api.goOnline();
            }
            await fetchStatus();
        } catch (err) {
            setToggleError(err.message);
        } finally {
            setBusy(false);
        }
    }

    if (loadingStatus) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.heading}>The Show</Text>
            <Text style={styles.subheading}>Every 5 minutes, online cars are paired up and raced. Winners earn XP.</Text>

            {statusError ? <Text style={styles.error}>{statusError}</Text> : null}

            {status && (
                <View style={styles.statusCard}>
                    <Text style={styles.statusHeadline}>
                        {status.isUserOnline
                            ? 'Your car is at the show'
                            : status.isCarAtTheShow
                              ? 'Go online to race'
                              : 'No car active — activate one in your garage first'}
                    </Text>
                    {status.isUserOnline && (
                        <Text style={styles.countdown}>Next race in {formatCountdown(secondsLeft)}</Text>
                    )}

                    {status.isCarAtTheShow && (
                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                status.isUserOnline ? styles.toggleButtonOffline : styles.toggleButtonOnline,
                                busy && styles.buttonDisabled
                            ]}
                            onPress={handleToggle}
                            disabled={busy}
                        >
                            <Text style={styles.toggleButtonText}>
                                {busy ? 'Please wait...' : status.isUserOnline ? 'Go Offline' : 'Go Online'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {toggleError ? <Text style={styles.error}>{toggleError}</Text> : null}

                    {status.lastMatchResult && (
                        <View
                            style={[
                                styles.lastResult,
                                status.lastMatchResult.draw
                                    ? styles.lastResultDraw
                                    : status.lastMatchResult.won
                                      ? styles.lastResultWin
                                      : styles.lastResultLoss
                            ]}
                        >
                            <Text style={styles.lastResultText}>
                                {status.lastMatchResult.draw
                                    ? `Draw vs ${status.lastMatchResult.opponentCar}`
                                    : status.lastMatchResult.won
                                      ? `Won! +${status.lastMatchResult.xpEarned} XP vs ${status.lastMatchResult.opponentCar}`
                                      : `Lost vs ${status.lastMatchResult.opponentCar}`}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {activeCar && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your car at the show</Text>
                    <View style={styles.carCard}>
                        <Text style={styles.carName}>
                            {activeCar.car.make} {activeCar.car.model}
                        </Text>
                        <Text style={styles.carPlate}>{activeCar.car.reg_plate}</Text>
                        <View style={{ marginTop: 10 }}>
                            <StatBar label="BHP" value={activeCar.finalStats.bhp} max={700} />
                            <StatBar label="Handling" value={activeCar.finalStats.handling_score} max={100} />
                            <StatBar label="Grip" value={activeCar.finalStats.grip_score} max={100} />
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Match history</Text>
                {matches.length === 0 ? (
                    <Text style={styles.empty}>No races yet.</Text>
                ) : (
                    matches.map((match) => <MatchResult key={match.id} match={match} />)
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    heading: { fontSize: 22, fontWeight: '800', color: colors.text },
    subheading: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 16 },
    error: { color: colors.accent, fontSize: 13, marginTop: 8 },
    statusCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 },
    statusHeadline: { color: colors.text, fontSize: 16, fontWeight: '700' },
    countdown: { color: colors.muted, fontSize: 13, marginTop: 4 },
    toggleButton: { minHeight: MIN_TOUCH_TARGET, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    toggleButtonOnline: { backgroundColor: colors.accent },
    toggleButtonOffline: { backgroundColor: '#3a3f4a' },
    buttonDisabled: { opacity: 0.6 },
    toggleButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    lastResult: { marginTop: 14, borderRadius: 10, borderWidth: 1, padding: 12 },
    lastResultWin: { borderColor: '#1f6b45', backgroundColor: 'rgba(47,211,107,0.15)' },
    lastResultLoss: { borderColor: '#6b1f1f', backgroundColor: 'rgba(255,77,79,0.12)' },
    lastResultDraw: { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
    lastResultText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    section: { marginTop: 24 },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
    carCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 },
    carName: { color: colors.text, fontSize: 15, fontWeight: '700' },
    carPlate: { color: colors.muted, fontSize: 12, marginTop: 2 },
    empty: { color: colors.muted, fontSize: 13 }
});
