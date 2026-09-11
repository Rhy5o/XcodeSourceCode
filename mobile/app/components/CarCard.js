import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CarSvg from './CarSvg';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

export default function CarCard({ car, onPress, onActivate, activating = false }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[styles.card, car.is_active && styles.cardActive]}
        >
            <CarSvg carId={car.id} cacheBust={car.mod_count} style={styles.svg} />

            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                        {car.make} {car.model}
                    </Text>
                    <Text style={styles.regPlate}>{car.reg_plate}</Text>
                </View>
                {car.is_active && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>At The Show</Text>
                    </View>
                )}
            </View>

            <View style={styles.statsRow}>
                <Text style={styles.statText}>{car.bhp} BHP</Text>
                <Text style={styles.statText}>{car.mod_count ?? 0} mods</Text>
            </View>

            {!car.is_active && onActivate && (
                <TouchableOpacity
                    onPress={onActivate}
                    disabled={activating}
                    style={[styles.activateButton, activating && styles.activateButtonDisabled]}
                >
                    <Text style={styles.activateButtonText}>
                        {activating ? 'Taking to the show...' : 'Take to the Show'}
                    </Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12
    },
    svg: { marginBottom: 12 },
    cardActive: { borderColor: colors.accent2, backgroundColor: '#0f2417' },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    title: { color: colors.text, fontSize: 17, fontWeight: '700' },
    regPlate: { color: colors.muted, fontSize: 12, marginTop: 2 },
    badge: { backgroundColor: 'rgba(47,211,107,0.2)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { color: colors.accent2, fontSize: 11, fontWeight: '700' },
    statsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    statText: { color: colors.text, fontSize: 14 },
    activateButton: {
        marginTop: 14,
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.accent,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    activateButtonDisabled: { opacity: 0.6 },
    activateButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 }
});
