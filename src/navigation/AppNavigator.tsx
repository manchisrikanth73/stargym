import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import CheckinScreen from '../screens/CheckinScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AdminScreen from '../screens/AdminScreen';
import AdminUserDetailScreen from '../screens/AdminUserDetailScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import WorkoutLogScreen from '../screens/WorkoutLogScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProgressScreen from '../screens/ProgressScreen';
import InboxScreen from '../screens/InboxScreen';
import BillingScreen from '../screens/BillingScreen';
import PromotionsScreen from '../screens/PromotionsScreen';
import QRCodeScreen from '../screens/QRCodeScreen';
import LegalScreen from '../screens/LegalScreen';
import LegalViewScreen from '../screens/LegalViewScreen';
import MemberInboxScreen from '../screens/MemberInboxScreen';
import TrainersScreen from '../screens/TrainersScreen';
import TrainerMembersScreen from '../screens/TrainerMembersScreen';
import TrainerPlansScreen from '../screens/TrainerPlansScreen';
import TrainerMemberWorkoutScreen from '../screens/TrainerMemberWorkoutScreen';
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
        swipeEnabled: false,
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Checkin" component={CheckinScreen} />
      <Drawer.Screen name="Calendar" component={CalendarScreen} />
      <Drawer.Screen name="Admin" component={AdminScreen} />
      <Drawer.Screen name="Workouts" component={WorkoutsScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Progress" component={ProgressScreen} />
      <Drawer.Screen name="Inbox" component={InboxScreen} />
      <Drawer.Screen name="Billing" component={BillingScreen} />
      <Drawer.Screen name="Promotions" component={PromotionsScreen} />
      <Drawer.Screen name="QRCode" component={QRCodeScreen} />
      <Drawer.Screen name="Legal" component={LegalScreen} />
      <Drawer.Screen name="Trainers" component={TrainersScreen} />
      <Drawer.Screen name="TrainerMembers" component={TrainerMembersScreen} />
      <Drawer.Screen name="TrainerPlans" component={TrainerPlansScreen} />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={DrawerNav} />
      <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />
      <Stack.Screen name="WorkoutLog" component={WorkoutLogScreen} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <Stack.Screen name="MemberInbox" component={MemberInboxScreen} />
      <Stack.Screen name="LegalView" component={LegalViewScreen} />
      <Stack.Screen name="TrainerMemberWorkout" component={TrainerMemberWorkoutScreen} />
    </Stack.Navigator>
  );
}
