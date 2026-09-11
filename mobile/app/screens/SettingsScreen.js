import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Constants from 'expo-constants';
import storage from '../utils/storage';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

const appVersion = Constants.expoConfig?.version || '1.0.0';

export default function SettingsScreen({ onLogout }) {
    async function handleLogout() {
        await storage.clearSession();
        onLogout();
    }

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>App version</Text>
                    <Text style={styles.rowValue}>{appVersion}</Text>
                </View>
                <TouchableOpacity
                    style={styles.row}
                    onPress={() => Linking.openURL('mailto:support@gridwars.example')}
                >
                    <Text style={styles.rowLabel}>Contact support</Text>
                    <Text style={styles.rowValueLink}>support@gridwars.example</Text>
                </TouchableOpacity>
                <Text style={styles.footer}>🏁 GridWars — sign up with your reg plate, mod your car, race every 5 minutes.</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
    section: { marginBottom: 28 },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
    logoutButton: {
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.accent,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    logoutButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    row: {
        minHeight: MIN_TOUCH_TARGET,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        marginBottom: 8
    },
    rowLabel: { color: colors.text, fontSize: 14 },
    rowValue: { color: colors.muted, fontSize: 14 },
    rowValueLink: { color: colors.accent, fontSize: 13 },
    footer: { color: colors.muted, fontSize: 12, marginTop: 12, lineHeight: 18 }
});
