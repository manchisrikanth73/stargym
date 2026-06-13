import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { auth } from '../services/firebase';
import { isCheckedInToday, getMonthlyCount } from '../services/attendance';
import { getUserProfile } from '../services/users';
import { colors } from '../theme/colors';

const QUOTES = [
  'Every rep counts. Every session matters.',
  "The pain you feel today is the strength of tomorrow.",
  "You don't stop when you're tired. You stop when you're done.",
];

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [checkedIn, setCheckedIn] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = auth.currentUser;
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Athlete';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadStats = useCallback(async () => {
    const uid = user?.uid;
    const now = new Date();
    const [ci, mc, profile] = await Promise.all([
      isCheckedInToday(),
      getMonthlyCount(now.getFullYear(), now.getMonth() + 1),
      uid ? getUserProfile(uid) : Promise.resolve(null),
    ]);
    setCheckedIn(ci);
    setMonthlyCount(mc);
    setIsActive(profile?.isActive ?? true);
  }, [user?.uid]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const monthName = dayjs().format('MMM');

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
        </View>
      </View>

      {/* Pending approval banner */}
      {!isActive && (
        <View style={styles.pendingBanner}>
          <Ionicons name="time-outline" size={20} color={colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingTitle}>Account Pending Approval</Text>
            <Text style={styles.pendingSub}>The gym admin has been notified and will activate your account shortly.</Text>
          </View>
        </View>
      )}

      {/* Greeting */}
      <View style={styles.greetSection}>
        <Text style={styles.greetSub}>{greeting()},</Text>
        <Text style={styles.greetName}>{displayName}</Text>
        <Text style={[styles.greetStatus, checkedIn && { color: colors.secondary }]}>
          {checkedIn ? '✅ You\'re checked in for today!' : 'Ready to crush today\'s workout?'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: `${colors.primary}44` }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.primary }]}>{monthlyCount}</Text>
          <Text style={styles.statLabel}>{monthName} Sessions</Text>
        </View>
        <View style={[styles.statCard, { borderColor: `${colors.secondary}44` }]}>
          <Ionicons name="flame-outline" size={20} color={colors.secondary} />
          <Text style={[styles.statValue, { color: colors.secondary }]}>{checkedIn ? '🔥' : '—'}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      {/* Check-In Card */}
      <TouchableOpacity
        style={[styles.checkinCard, checkedIn && styles.checkinCardDone, !isActive && styles.checkinCardDisabled]}
        onPress={() => {
          if (!isActive) { Alert.alert('Account pending', 'Your account is awaiting admin approval.'); return; }
          checkedIn ? Alert.alert('Already checked in!', 'See you tomorrow 💪') : navigation.navigate('Checkin');
        }}
        activeOpacity={0.85}
      >
        <View style={styles.checkinIconWrap}>
          <Ionicons name={!isActive ? 'lock-closed' : checkedIn ? 'checkmark-circle' : 'qr-code'} size={32} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.checkinTitle}>{!isActive ? 'Account Pending' : checkedIn ? 'Checked In!' : 'Check In Now'}</Text>
          <Text style={styles.checkinSub}>{!isActive ? 'Awaiting admin approval' : checkedIn ? 'Great work today 💪' : 'Tap to show your QR code'}</Text>
        </View>
        {isActive && !checkedIn && <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />}
      </TouchableOpacity>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <ActionButton
          icon="calendar-month"
          label="Attendance"
          color={colors.primary}
          onPress={() => navigation.navigate('Calendar')}
        />
        <ActionButton icon="bar-chart" label="Progress" color="#9B59B6" onPress={() => Alert.alert('Coming soon!')} />
        <ActionButton icon="barbell" label="Workouts" color="#E74C3C" onPress={() => Alert.alert('Coming soon!')} />
      </View>

      {/* Motivation */}
      <View style={styles.motivCard}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.secondary} />
        <Text style={styles.motivText}>{QUOTES[new Date().getDate() % QUOTES.length]}</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function ActionButton({
  icon, label, color, onPress,
}: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: `${color}44`, backgroundColor: `${color}18` }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  greetSection: { paddingHorizontal: 20, marginBottom: 24 },
  greetSub: { color: colors.textMuted, fontSize: 15 },
  greetName: { color: colors.text, fontSize: 28, fontWeight: '900', marginVertical: 2 },
  greetStatus: { color: colors.textMuted, fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 20, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statValue: { fontSize: 28, fontWeight: '900', marginVertical: 6 },
  statLabel: { color: colors.textMuted, fontSize: 12 },
  checkinCard: {
    marginHorizontal: 20,
    marginBottom: 28,
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  checkinCardDone: {
    backgroundColor: `${colors.secondary}22`,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: `${colors.secondary}55`,
  },
  checkinCardDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: `${colors.secondary}18`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${colors.secondary}44`,
  },
  pendingTitle: { color: colors.secondary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  pendingSub: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  checkinIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  checkinSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginHorizontal: 20, marginBottom: 14 },
  actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: { fontSize: 11, fontWeight: '600' },
  motivCard: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: `${colors.secondary}33`,
    gap: 8,
  },
  motivText: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic', lineHeight: 22 },
});
