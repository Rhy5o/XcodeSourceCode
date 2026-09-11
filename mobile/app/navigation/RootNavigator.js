import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import storage from '../utils/storage';
import api from '../utils/api';
import { colors } from '../utils/theme';

const navigationTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: colors.bg,
        card: colors.surface,
        border: colors.border,
        primary: colors.accent,
        text: colors.text
    }
};

// Checks AsyncStorage for a JWT on launch and picks AuthNavigator (stack:
// Login/Signup) or AppNavigator (bottom tabs) accordingly. api.js's 401
// interceptor calls setOnUnauthorized's handler to force back to
// AuthNavigator if a token expires or is rejected mid-session.
export default function RootNavigator() {
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const checkAuth = useCallback(async () => {
        const token = await storage.getJWT();
        setIsAuthenticated(!!token);
        setCheckingAuth(false);
    }, []);

    useEffect(() => {
        api.setOnUnauthorized(() => setIsAuthenticated(false));
        checkAuth();
    }, [checkAuth]);

    async function handleLogout() {
        await storage.clearSession();
        setIsAuthenticated(false);
    }

    if (checkingAuth) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <NavigationContainer theme={navigationTheme}>
            {isAuthenticated ? (
                <AppNavigator onLogout={handleLogout} />
            ) : (
                <AuthNavigator onAuthenticated={() => setIsAuthenticated(true)} />
            )}
        </NavigationContainer>
    );
}
