import React, { useEffect, useState } from 'react';
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
import { getUserProfile } from '../services/users';
import { colors } from '../theme/colors';

type NavItem = { label: string; icon: string; screen: string | null; adminOnly?: boolean; memberOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'home-outline', screen: 'Dashboard' },
  { label: 'Check In', icon: 'qr-code-outline', screen: 'Checkin', memberOnly: true },
  { label: 'Attendance', icon: 'calendar-outline', screen: 'Calendar', memberOnly: true },
  { label: 'Members', icon: 'people-outline', screen: 'Admin', adminOnly: true },
  { label: 'Workouts', icon: 'barbell-outline', screen: 'Workouts' },
  { label: 'Progress', icon: 'bar-chart-outline', screen: null },
  { label: 'Settings', icon: 'settings-outline', screen: 'Settings' },
];

export default function DrawerContent(props: DrawerContentComponentProps) {
  const user = auth.currentUser;
  const name = user?.displayName ?? user?.email?.split('@')[0] ?? 'Athlete';
  const email = user?.email ?? '';
  const [isAdmin, setIsAdmin] = useState(false);
  const [membershipType, setMembershipType] = useState<string>('basic');

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then(p => {
        setIsAdmin(p?.role === 'admin');
        setMembershipType(p?.membershipType ?? 'basic');
      });
    }
  }, [user?.uid]);

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (item.memberOnly) return !isAdmin;
    return true;
  });

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
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color={colors.secondary} />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        {visibleItems.map(item => {
          const isBasicLocked = !isAdmin && item.label === 'Workouts' && membershipType === 'basic';
          const disabled = !item.screen || isBasicLocked;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.item, disabled && styles.itemDisabled]}
              onPress={() => {
                if (!disabled) {
                  props.navigation.closeDrawer();
                  props.navigation.navigate(item.screen as never);
                }
              }}
              disabled={disabled}
            >
              <Ionicons
                name={isBasicLocked ? 'lock-closed-outline' : item.icon as any}
                size={20}
                color={disabled ? colors.textDim : (item.adminOnly ? colors.secondary : colors.textMuted)}
                style={styles.itemIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, disabled && { color: colors.textDim }]}>{item.label}</Text>
                {isBasicLocked && (
                  <Text style={styles.premiumHint}>Premium & VIP only</Text>
                )}
              </View>
              {!item.screen && !isBasicLocked && <Text style={styles.comingSoon}>soon</Text>}
            </TouchableOpacity>
          );
        })}

        <View style={{ flex: 1 }} />
      </DrawerContentScrollView>

      {/* Logout */}
      <View style={styles.divider} />
      <TouchableOpacity style={styles.logoutBtn} onPress={logOut}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} style={styles.itemIcon} />
        <Text style={styles.logoutLabel}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  profileHeader: { padding: 24, paddingTop: 32 },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: `${colors.primary}33`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: colors.primary, fontSize: 24, fontWeight: '700' },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  email: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, alignSelf: 'flex-start',
    backgroundColor: `${colors.secondary}22`,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  adminBadgeText: { color: colors.secondary, fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  itemIcon: { marginRight: 16 },
  itemLabel: { color: colors.text, fontSize: 15, fontWeight: '500', flex: 1 },
  itemDisabled: { opacity: 0.5 },
  comingSoon: { color: colors.textDim, fontSize: 10, fontWeight: '600' },
  premiumHint: { color: colors.textDim, fontSize: 10, fontWeight: '600', marginTop: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  logoutLabel: { color: colors.error, fontSize: 15, fontWeight: '600' },
});
