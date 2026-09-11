// Must be the very first import — react-native-gesture-handler needs to
// install its native event handling before anything else touches it,
// otherwise the stack navigator can crash (mainly on Android).
import 'react-native-gesture-handler';

import { Component, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './app/navigation/RootNavigator';
import { colors, MIN_TOUCH_TARGET } from './app/utils/theme';

// Catches errors thrown during render anywhere below it in the tree —
// without this, an uncaught render error unmounts the whole app to a blank
// white screen with no way back in short of a full reload.
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary] caught a render error', error, info?.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Something went wrong</Text>
                <Text style={styles.errorMessage}>
                    The app hit an unexpected error. You can try again — if it keeps happening, restart the app.
                </Text>
                <TouchableOpacity style={styles.errorButton} onPress={this.handleReset}>
                    <Text style={styles.errorButtonText}>Try again</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

// Global handler for JS errors thrown outside of React's render cycle
// (rejected promises without a .catch, timers, native callbacks) — the RN
// equivalent of window.onerror on web. Logs full details for debugging;
// only re-throws fatal errors so RN's own red-box/crash reporting still
// gets a chance to run (never swallow a fatal error silently).
if (global.ErrorUtils) {
    const defaultHandler = global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // eslint-disable-next-line no-console
        console.error(`[GlobalError] ${isFatal ? 'FATAL' : 'non-fatal'}:`, error);
        if (defaultHandler) defaultHandler(error, isFatal);
    });
}

export default function App() {
    const [bootstrapping, setBootstrapping] = useState(true);

    // AsyncStorage itself needs no explicit init call — this just gives the
    // splash screen a beat to hand off cleanly before the first storage
    // read in RootNavigator's auth check.
    useEffect(() => {
        setBootstrapping(false);
    }, []);

    if (bootstrapping) {
        return (
            <View style={[styles.errorContainer, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <ErrorBoundary>
                <StatusBar style="light" />
                <RootNavigator />
            </ErrorBoundary>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        padding: 24,
        paddingTop: 120
    },
    errorTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
    errorMessage: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 20 },
    errorButton: {
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: 24,
        backgroundColor: colors.accent,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    errorButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 }
});
