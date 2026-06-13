import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { logOut } from '../services/auth';
import { colors } from '../theme/colors';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'home-outline', screen: 'Dashboard' },
  { label: 'Check In', icon: 'qr-code-outline', screen: 'Checkin' },
  { label: 'Attendance', icon: 'calendar-outline', screen: 'Calendar' },
  { label: 'Workouts', icon: 'barbell-outline', screen: null },
  { label: 'Progress', icon: 'bar-chart-outline', screen: null },
  { label: 'Settings', icon: 'settings-outline', screen: null },
];

export default function DrawerContent(props: DrawerContentComponentProps) {
  const user = auth.currentUser;
  const name = user?.displayName ?? user?.email?.split('@')[0] ?? 'Athlete';
  const email = user?.email ?? '';

  return (
    <SafeAreaView style={styles.root}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        {NAV_ITEMS.map(item => (
          <TouchableOpacity
            key={item.label}
            style={styles.item}
            onPress={() => {
              if (item.screen) {
                props.navigation.closeDrawer();
                props.navigation.navigate(item.screen as never);
              }
            }}
          >
            <Ionicons name={item.icon as any} size={20} color={colors.textMuted} style={styles.itemIcon} />
            <Text style={styles.itemLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ flex: 1 }} />
      </DrawerContentScrollView>

      {/* Logout */}
      <View style={styles.divider} />
      <TouchableOpacity style={styles.logoutBtn} onPress={logOut}>
        <Ionicons name="log-out-outline" size={20} color="#E74C3C" style={styles.itemIcon} />
        <Text style={styles.logoutLabel}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  profileHeader: {
    padding: 24,
    paddingTop: 32,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${colors.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: colors.primary, fontSize: 24, fontWeight: '700' },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  email: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  itemIcon: { marginRight: 16 },
  itemLabel: { color: colors.text, fontSize: 15, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  logoutLabel: { color: '#E74C3C', fontSize: 15, fontWeight: '600' },
});
