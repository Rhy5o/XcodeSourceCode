import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../utils/api';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

// Referenced by GarageScreen's "Add Car" button (spec item 8) even though
// it isn't in item 5's screens list — the flow needs somewhere for that
// button to go, so it's added here alongside the other screens.
export default function RegisterCarScreen({ navigation }) {
    const [regPlate, setRegPlate] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        setError('');
        setLoading(true);
        try {
            await api.registerCar(regPlate);
            navigation.goBack();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.container}>
                <Text style={styles.heading}>Register a car</Text>
                <Text style={styles.subheading}>Enter a UK registration plate and we&apos;ll look up the vehicle.</Text>

                <TextInput
                    style={styles.input}
                    placeholder="UK reg plate e.g. AB12 CDE"
                    placeholderTextColor={colors.muted}
                    value={regPlate}
                    onChangeText={setRegPlate}
                    autoCapitalize="characters"
                    accessibilityLabel="UK reg plate"
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading || !regPlate.trim()}
                >
                    <Text style={styles.buttonText}>{loading ? 'Looking up DVLA...' : 'Register'}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1, padding: 24, paddingTop: 32 },
    heading: { fontSize: 22, fontWeight: '800', color: colors.text },
    subheading: { fontSize: 13, color: colors.muted, marginTop: 6, marginBottom: 24 },
    input: {
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        color: colors.text,
        marginBottom: 12,
        fontSize: 15
    },
    error: { color: colors.accent, fontSize: 13, marginBottom: 12 },
    button: {
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.accent2,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 }
});
