import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CarCard from '../components/CarCard';
import api from '../utils/api';
import storage from '../utils/storage';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

// Doubles as "my garage" (no route param — the Garage tab's home screen)
// and a read-only public garage view when pushed with { userId } from
// ProfileScreen's "View Garage" button, matching spec item 12's "GarageScreen
// with userId param" — the same screen, branching on whether a param was
// passed, rather than two near-duplicate screens.
export default function GarageScreen({ navigation, route }) {
    const viewedUserId = route?.params?.userId;

    const [cars, setCars] = useState(null);
    const [ownerName, setOwnerName] = useState(null);
    const [isSelf, setIsSelf] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [fromCache, setFromCache] = useState(false);

    const load = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) setRefreshing(true);
            setError('');
            try {
                if (viewedUserId) {
                    const currentUser = await storage.getUser();
                    setIsSelf(!!currentUser && currentUser.id === viewedUserId);
                    const res = await api.getUserGarage(viewedUserId);
                    setCars(res.cars);
                    setOwnerName(res.user?.username || null);
                } else {
                    setIsSelf(true);
                    const res = await api.getGarage();
                    setCars(res.cars);
                    setOwnerName(null);
                    await storage.cacheGarage(res.cars);
                    setFromCache(false);
                }
            } catch (err) {
                if (!viewedUserId) {
                    const cached = await storage.getCachedGarage();
                    if (cached) {
                        setCars(cached);
                        setFromCache(true);
                        setError('Showing saved garage — could not reach the server.');
                        return;
                    }
                }
                setError(err.message);
            } finally {
                setRefreshing(false);
            }
        },
        [viewedUserId]
    );

    useEffect(() => {
        navigation.setOptions({ title: viewedUserId ? (ownerName ? `${ownerName}'s Garage` : 'Garage') : 'Garage' });
    }, [navigation, viewedUserId, ownerName]);

    // useFocusEffect (not a plain mount-only useEffect) so returning to this
    // screen — e.g. back from RegisterCarScreen after adding a car, or from
    // CarDetailScreen after activating one — picks up the change instead of
    // showing stale data until the user manually pulls to refresh.
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    async function handleActivate(carId) {
        try {
            await api.activateCar(carId);
            setCars((prev) => prev.map((c) => ({ ...c, is_active: c.id === carId })));
        } catch (err) {
            setError(err.message);
        }
    }

    function openCar(carId) {
        navigation.navigate('CarDetail', { carId });
    }

    return (
        <View style={styles.container}>
            {fromCache && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>Offline — showing your last saved garage</Text>
                </View>
            )}

            {error && !fromCache ? <Text style={styles.error}>{error}</Text> : null}

            {cars === null && !error ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <FlatList
                    data={cars || []}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
                    renderItem={({ item }) => (
                        <CarCard
                            car={item}
                            onPress={() => openCar(item.id)}
                            onActivate={isSelf && !item.is_active ? () => handleActivate(item.id) : undefined}
                        />
                    )}
                    ListEmptyComponent={
                        <Text style={styles.empty}>No cars registered yet.</Text>
                    }
                />
            )}

            {isSelf && (
                <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('RegisterCar')}>
                    <Text style={styles.addButtonText}>+ Add Car</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { padding: 16, paddingBottom: 90 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    error: { color: colors.accent, fontSize: 13, marginHorizontal: 16, marginTop: 12 },
    empty: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 40 },
    offlineBanner: { backgroundColor: '#3a2f10', padding: 10, alignItems: 'center' },
    offlineText: { color: '#f2c94c', fontSize: 12, fontWeight: '600' },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        left: 20,
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.accent,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    addButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 }
});
