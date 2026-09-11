import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import api from '../utils/api';
import storage from '../utils/storage';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

export default function SignupScreen({ navigation, onAuthenticated }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [regPlate, setRegPlate] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        setError('');
        setLoading(true);
        try {
            const { token, user } = await api.signup({ username, email, password, regPlate });
            await storage.saveJWT(token);
            await storage.saveUser(user);
            onAuthenticated();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.heading}>Create your account</Text>
                <Text style={styles.subheading}>
                    Sign up with your UK reg plate — it becomes your first car.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor={colors.muted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    accessibilityLabel="Username"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    accessibilityLabel="Email"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password (min 8 chars)"
                    placeholderTextColor={colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    accessibilityLabel="Password"
                />
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
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>Already have an account? Log in</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    heading: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
    subheading: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 24 },
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
        justifyContent: 'center',
        marginTop: 4
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    linkButton: { minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    linkText: { color: colors.muted, fontSize: 13 }
});
