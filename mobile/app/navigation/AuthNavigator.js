import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { colors } from '../utils/theme';

const Stack = createStackNavigator();

// onAuthenticated is injected into both screens so a successful login/signup
// can flip RootNavigator over to AppNavigator without a Context provider —
// screens call it after storage.saveJWT() succeeds.
export default function AuthNavigator({ onAuthenticated }) {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '700' }
            }}
        >
            <Stack.Screen name="Login" options={{ title: 'Log In' }}>
                {(props) => <LoginScreen {...props} onAuthenticated={onAuthenticated} />}
            </Stack.Screen>
            <Stack.Screen name="Signup" options={{ title: 'Sign Up' }}>
                {(props) => <SignupScreen {...props} onAuthenticated={onAuthenticated} />}
            </Stack.Screen>
        </Stack.Navigator>
    );
}
