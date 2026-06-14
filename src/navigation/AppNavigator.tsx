import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import CheckinScreen from '../screens/CheckinScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AdminScreen from '../screens/AdminScreen';
import AdminUserDetailScreen from '../screens/AdminUserDetailScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import DrawerContent from './DrawerContent';
import { colors } from '../theme/colors';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function DrawerNav() {
  return (
    <Drawer.Navigator
      drawerContent={props => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.bg, width: 280 },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Checkin" component={CheckinScreen} />
      <Drawer.Screen name="Calendar" component={CalendarScreen} />
      <Drawer.Screen name="Admin" component={AdminScreen} />
      <Drawer.Screen name="Workouts" component={WorkoutsScreen} />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={DrawerNav} />
      <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />
    </Stack.Navigator>
  );
}
