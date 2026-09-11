import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import api from '../utils/api';
import storage from '../utils/storage';
import { colors, MIN_TOUCH_TARGET } from '../utils/theme';

export default function LoginScreen({ navigation, onAuthenticated }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        setError('');
        setLoading(true);
        try {
            const { token, user } = await api.login({ email, password });
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
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.heading}>🏁 GridWars</Text>
                <Text style={styles.subheading}>Log in to your garage</Text>

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
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    accessibilityLabel="Password"
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Signup')}>
                    <Text style={styles.linkText}>No account yet? Sign up</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    heading: { fontSize: 32, fontWeight: '800', color: colors.text, textAlign: 'center' },
    subheading: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 28 },
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
        backgroundColor: colors.accent,
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
