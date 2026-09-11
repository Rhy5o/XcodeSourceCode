import { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import StatBar from '../components/StatBar';
import api, { API_URL } from '../utils/api';
import storage from '../utils/storage';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

function modTypeLabel(modType) {
    return modType
        .split('_')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
}

export default function CarDetailScreen({ route, navigation }) {
    const { carId } = route.params;

    const [detail, setDetail] = useState(null); // { car, mods, finalStats }
    const [isOwner, setIsOwner] = useState(false);
    const [error, setError] = useState('');
    const [activating, setActivating] = useState(false);

    const [catalog, setCatalog] = useState(null);
    const [showAddMod, setShowAddMod] = useState(false);
    const [selectedModType, setSelectedModType] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [modError, setModError] = useState('');

    const load = useCallback(async () => {
        setError('');
        try {
            const res = await api.getCarWithMods(carId);
            setDetail(res);
            const currentUser = await storage.getUser();
            setIsOwner(!!currentUser && currentUser.id === res.car.user_id);
        } catch (err) {
            setError(err.message);
        }
    }, [carId]);

    // Refresh on focus (not just mount) so activating this car elsewhere,
    // or coming back after adding a mod, shows up without a manual pull.
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    useEffect(() => {
        navigation.setOptions({ title: detail ? `${detail.car.make} ${detail.car.model}` : 'Car' });
    }, [navigation, detail]);

    async function handleActivate() {
        setActivating(true);
        setError('');
        try {
            await api.activateCar(carId);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setActivating(false);
        }
    }

    async function openAddMod() {
        setShowAddMod((s) => !s);
        setModError('');
        if (!catalog) {
            try {
                const res = await api.getModCatalog();
                setCatalog(res.catalog);
                setSelectedModType(Object.keys(res.catalog)[0] || null);
            } catch (err) {
                setModError(err.message);
            }
        }
    }

    async function pickFromLibrary() {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            setModError('Photo library permission is required to attach a mod photo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (!result.canceled) setPhoto(result.assets[0]);
    }

    async function takePhoto() {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
            setModError('Camera permission is required to take a mod photo.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!result.canceled) setPhoto(result.assets[0]);
    }

    async function submitMod() {
        if (!selectedModType) return;
        setUploading(true);
        setModError('');
        try {
            await api.addMod(carId, selectedModType, '', photo);
            setPhoto(null);
            setShowAddMod(false);
            await load();
        } catch (err) {
            setModError(err.message);
        } finally {
            setUploading(false);
        }
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    if (!detail) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    const { car, mods, finalStats } = detail;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>
                    {car.make} {car.model}
                </Text>
                {car.is_active && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>At The Show</Text>
                    </View>
                )}
            </View>
            <Text style={styles.regPlate}>{car.reg_plate}</Text>

            <View style={styles.statsCard}>
                <StatBar label="BHP" value={finalStats.bhp} max={700} />
                <StatBar label="0-60 (lower is better)" value={finalStats.zero_to_sixty} max={10} />
                <StatBar label="Handling" value={finalStats.handling_score} max={100} />
                <StatBar label="Grip" value={finalStats.grip_score} max={100} />
            </View>

            {isOwner && !car.is_active && (
                <TouchableOpacity
                    style={[styles.primaryButton, activating && styles.buttonDisabled]}
                    onPress={handleActivate}
                    disabled={activating}
                >
                    <Text style={styles.primaryButtonText}>
                        {activating ? 'Taking to the show...' : 'Take to the Show'}
                    </Text>
                </TouchableOpacity>
            )}

            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Mods</Text>
                {isOwner && (
                    <TouchableOpacity style={styles.addModButton} onPress={openAddMod}>
                        <Text style={styles.addModButtonText}>{showAddMod ? 'Cancel' : '+ Add Mod'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {showAddMod && (
                <View style={styles.addModForm}>
                    {!catalog ? (
                        <ActivityIndicator color={colors.accent} />
                    ) : (
                        <>
                            <View style={styles.chipRow}>
                                {Object.keys(catalog).map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setSelectedModType(type)}
                                        style={[styles.chip, selectedModType === type && styles.chipSelected]}
                                    >
                                        <Text style={[styles.chipText, selectedModType === type && styles.chipTextSelected]}>
                                            {modTypeLabel(type)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.photoRow}>
                                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                                    <Text style={styles.photoButtonText}>📷 Take Photo</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.photoButton} onPress={pickFromLibrary}>
                                    <Text style={styles.photoButtonText}>🖼️ Choose Photo</Text>
                                </TouchableOpacity>
                            </View>

                            {photo && <Image source={{ uri: photo.uri }} style={styles.photoPreview} />}
                            {modError ? <Text style={styles.error}>{modError}</Text> : null}

                            <TouchableOpacity
                                style={[styles.primaryButton, (uploading || !selectedModType) && styles.buttonDisabled]}
                                onPress={submitMod}
                                disabled={uploading || !selectedModType}
                            >
                                <Text style={styles.primaryButtonText}>{uploading ? 'Uploading...' : 'Add Mod'}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}

            {mods.length === 0 ? (
                <Text style={styles.empty}>No mods installed yet.</Text>
            ) : (
                mods.map((mod) => (
                    <View key={mod.id} style={styles.modRow}>
                        {mod.photo_url ? (
                            <Image source={{ uri: `${API_URL}${mod.photo_url}` }} style={styles.modPhoto} />
                        ) : (
                            <View style={styles.modPhotoPlaceholder}>
                                <Text style={styles.modPhotoPlaceholderText}>No photo</Text>
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modType}>{modTypeLabel(mod.mod_type)}</Text>
                            {mod.description ? <Text style={styles.modDescription}>{mod.description}</Text> : null}
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    regPlate: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: 16 },
    badge: { backgroundColor: 'rgba(47,211,107,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { color: colors.accent2, fontSize: 12, fontWeight: '700' },
    statsCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
    primaryButton: {
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.accent,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16
    },
    buttonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    addModButton: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: 4 },
    addModButtonText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
    addModForm: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 14 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
    chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { color: colors.text, fontSize: 12 },
    chipTextSelected: { color: colors.white, fontWeight: '700' },
    photoRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    photoButton: { flex: 1, minHeight: MIN_TOUCH_TARGET, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    photoButtonText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    photoPreview: { width: 90, height: 90, borderRadius: 10, marginTop: 12 },
    error: { color: colors.accent, fontSize: 13, marginTop: 10 },
    empty: { color: colors.muted, fontSize: 14 },
    modRow: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10 },
    modPhoto: { width: 56, height: 56, borderRadius: 8 },
    modPhotoPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    modPhotoPlaceholderText: { color: colors.muted, fontSize: 9, textAlign: 'center' },
    modType: { color: colors.text, fontWeight: '700', fontSize: 14 },
    modDescription: { color: colors.muted, fontSize: 12, marginTop: 2 }
});
