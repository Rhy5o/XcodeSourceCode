import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import GarageScreen from '../screens/GarageScreen';
import CarDetailScreen from '../screens/CarDetailScreen';
import RegisterCarScreen from '../screens/RegisterCarScreen';
import ShowScreen from '../screens/ShowScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../utils/theme';

const Tab = createBottomTabNavigator();
const GarageStack = createStackNavigator();
const ShowStack = createStackNavigator();
const LeaderboardStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const SettingsStack = createStackNavigator();

const stackScreenOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700' }
};

// GarageScreen and ProfileScreen are registered in more than one stack
// (e.g. Leaderboard -> tap a user -> Profile -> "View Garage" -> Garage ->
// tap a car -> CarDetail) so the same screen component can be reached from
// wherever the flow needs it, per React Navigation's usual pattern for
// sharing a screen across bottom-tab stacks.

function GarageStackScreen() {
    return (
        <GarageStack.Navigator screenOptions={stackScreenOptions}>
            <GarageStack.Screen name="Garage" component={GarageScreen} options={{ title: 'Garage' }} />
            <GarageStack.Screen name="CarDetail" component={CarDetailScreen} options={{ title: 'Car' }} />
            <GarageStack.Screen name="RegisterCar" component={RegisterCarScreen} options={{ title: 'Register a Car' }} />
            <GarageStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        </GarageStack.Navigator>
    );
}

function ShowStackScreen() {
    return (
        <ShowStack.Navigator screenOptions={stackScreenOptions}>
            <ShowStack.Screen name="Show" component={ShowScreen} options={{ title: 'The Show' }} />
            <ShowStack.Screen name="CarDetail" component={CarDetailScreen} options={{ title: 'Car' }} />
        </ShowStack.Navigator>
    );
}

function LeaderboardStackScreen() {
    return (
        <LeaderboardStack.Navigator screenOptions={stackScreenOptions}>
            <LeaderboardStack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
            <LeaderboardStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <LeaderboardStack.Screen name="Garage" component={GarageScreen} options={{ title: 'Garage' }} />
            <LeaderboardStack.Screen name="CarDetail" component={CarDetailScreen} options={{ title: 'Car' }} />
        </LeaderboardStack.Navigator>
    );
}

function ProfileStackScreen() {
    return (
        <ProfileStack.Navigator screenOptions={stackScreenOptions}>
            <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <ProfileStack.Screen name="Garage" component={GarageScreen} options={{ title: 'Garage' }} />
            <ProfileStack.Screen name="CarDetail" component={CarDetailScreen} options={{ title: 'Car' }} />
        </ProfileStack.Navigator>
    );
}

function SettingsStackScreen({ onLogout }) {
    return (
        <SettingsStack.Navigator screenOptions={stackScreenOptions}>
            <SettingsStack.Screen name="Settings" options={{ title: 'Settings' }}>
                {(props) => <SettingsScreen {...props} onLogout={onLogout} />}
            </SettingsStack.Screen>
        </SettingsStack.Navigator>
    );
}

function TabIcon({ emoji, focused }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>;
}

// onLogout flips RootNavigator back to AuthNavigator — SettingsScreen calls
// it after clearing the stored session.
export default function AppNavigator({ onLogout }) {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.muted,
                tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
            }}
        >
            <Tab.Screen
                name="GarageTab"
                component={GarageStackScreen}
                options={{ title: 'Garage', tabBarIcon: ({ focused }) => <TabIcon emoji="🚗" focused={focused} /> }}
            />
            <Tab.Screen
                name="ShowTab"
                component={ShowStackScreen}
                options={{ title: 'Show', tabBarIcon: ({ focused }) => <TabIcon emoji="🏁" focused={focused} /> }}
            />
            <Tab.Screen
                name="LeaderboardTab"
                component={LeaderboardStackScreen}
                options={{ title: 'Leaderboard', tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} /> }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStackScreen}
                options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
            />
            <Tab.Screen
                name="SettingsTab"
                options={{ title: 'Settings', tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }}
            >
                {() => <SettingsStackScreen onLogout={onLogout} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
}
