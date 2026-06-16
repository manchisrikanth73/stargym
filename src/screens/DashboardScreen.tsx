import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { auth } from '../services/firebase';
import { isCheckedInToday, getMonthlyCount, subscribeRecentCheckins } from '../services/attendance';
import { getUserProfile, getAllUsers, updateUserProfile } from '../services/users';
import { colors } from '../theme/colors';
import { GYM_CHECKIN_CODE } from '../config';

const MEMBERSHIP_COLOR: Record<string, string> = {
  basic: colors.primary,
  premium: '#9B59B6',
  vip: '#FFD700',
};

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberActive, setMemberActive] = useState(0);
  const [memberInactive, setMemberInactive] = useState(0);
  const [showGymQR, setShowGymQR] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState<{ name: string; email: string; time: string }[]>([]);
  const [activationStartDate, setActivationStartDate] = useState<string | null>(null);
  const [activationEndDate, setActivationEndDate] = useState<string | null>(null);
  const [membershipType, setMembershipType] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

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
    const endDate = profile?.activationEndDate ?? null;
    const today = dayjs().format('YYYY-MM-DD');
    const expired = !!endDate && endDate < today;
    if (expired) {
      setIsExpired(true);
      setIsActive(false);
      if (profile?.isActive && uid) {
        updateUserProfile(uid, { isActive: false }).catch(() => {});
      }
    } else {
      setIsExpired(false);
      setIsActive(profile?.isActive ?? true);
    }
    setActivationStartDate(profile?.activationStartDate ?? null);
    setActivationEndDate(endDate);
    setMembershipType(profile?.membershipType ?? null);
    const admin = profile?.role === 'admin';
    setIsAdmin(admin);
    if (admin) {
      const all = await getAllUsers();
      setMemberTotal(all.length);
      setMemberActive(all.filter(u => u.isActive).length);
      setMemberInactive(all.filter(u => !u.isActive).length);
    }
  }, [user?.uid]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (!isAdmin) return;
    return subscribeRecentCheckins(records => {
      setRecentCheckins(records.map(r => {
        const d = dayjs(r.checkedInAt.toDate());
        const time = d.isSame(dayjs(), 'day')
          ? `Today ${d.format('h:mm A')}`
          : `Yesterday ${d.format('h:mm A')}`;
        return { name: r.displayName || 'Unknown', email: r.email, time };
      }));
    });
  }, [isAdmin]);

  // When app is opened via gym QR code URL (?checkin=...), go straight to check-in
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('checkin');
    if (code) navigation.navigate('Checkin' as never);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const monthName = dayjs().format('MMM');

  const fmtDate = (d: string | null): string => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${MONTHS[+m - 1]} ${y}`;
  };

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

      {/* Expired / pending banner */}
      {!isAdmin && isExpired && (
        <View style={[styles.pendingBanner, styles.expiredBanner]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pendingTitle, { color: colors.error }]}>Membership Expired</Text>
            <Text style={styles.pendingSub}>Your membership has expired. Please contact the gym admin to renew.</Text>
          </View>
        </View>
      )}
      {!isAdmin && !isExpired && !isActive && (
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

      {/* Stats — admin sees member overview, members see session stats */}
      {isAdmin ? (
        <>
          <Text style={styles.sectionTitle}>Member Overview</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderColor: `${colors.primary}44` }]}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{memberTotal}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, { borderColor: `${colors.success}44` }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.success }]}>{memberActive}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[styles.statCard, { borderColor: `${colors.textMuted}44` }]}>
              <Ionicons name="pause-circle-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.statValue, { color: colors.textMuted }]}>{memberInactive}</Text>
              <Text style={styles.statLabel}>Inactive</Text>
            </View>
          </View>
        </>
      ) : (
        <>
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

          {activationStartDate && (
            <View style={styles.membershipCard}>
              <View style={styles.membershipCardHeader}>
                <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
                <Text style={styles.membershipCardLabel}>Membership</Text>
                {membershipType && (
                  <View style={[styles.membershipTypeBadge, { backgroundColor: `${MEMBERSHIP_COLOR[membershipType] ?? colors.primary}22` }]}>
                    <Text style={[styles.membershipTypeText, { color: MEMBERSHIP_COLOR[membershipType] ?? colors.primary }]}>
                      {membershipType.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.membershipDates}>
                <View style={styles.membershipDateCol}>
                  <Text style={styles.membershipDateLabel}>Start</Text>
                  <Text style={styles.membershipDateValue}>{fmtDate(activationStartDate)}</Text>
                </View>
                <View style={styles.membershipDateDivider} />
                <View style={styles.membershipDateCol}>
                  <Text style={styles.membershipDateLabel}>End</Text>
                  <Text style={styles.membershipDateValue}>
                    {activationEndDate ? fmtDate(activationEndDate) : 'Open-ended'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}

      {/* Gym QR Card — admin only */}
      {isAdmin && (
        <TouchableOpacity style={styles.gymQrCard} onPress={() => setShowGymQR(true)} activeOpacity={0.8}>
          <View style={styles.gymQrIcon}>
            <Ionicons name="qr-code-outline" size={28} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gymQrTitle}>Gym Check-In QR Code</Text>
            <Text style={styles.gymQrSub}>Tap to view and print for the entrance</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Check-In Card — members only */}
      {!isAdmin && (
        <TouchableOpacity
          style={[styles.checkinCard, checkedIn && styles.checkinCardDone, !isActive && styles.checkinCardDisabled]}
          onPress={() => {
            if (isExpired) { Alert.alert('Membership Expired', 'Please contact the gym admin to renew your membership.'); return; }
            if (!isActive) { Alert.alert('Account pending', 'Your account is awaiting admin approval.'); return; }
            checkedIn ? Alert.alert('Already checked in!', 'See you tomorrow 💪') : navigation.navigate('Checkin');
          }}
          activeOpacity={0.85}
        >
          <View style={styles.checkinIconWrap}>
            <Ionicons name={!isActive ? 'lock-closed' : checkedIn ? 'checkmark-circle' : 'qr-code'} size={32} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkinTitle}>
              {isExpired ? 'Membership Expired' : !isActive ? 'Account Pending' : checkedIn ? 'Checked In!' : 'Check In Now'}
            </Text>
            <Text style={styles.checkinSub}>
              {isExpired ? 'Contact admin to renew' : !isActive ? 'Awaiting admin approval' : checkedIn ? 'Great work today 💪' : 'Tap to scan gym QR code'}
            </Text>
          </View>
          {isActive && !checkedIn && <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />}
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        {isAdmin ? (
          <ActionButton
            icon="people-outline"
            label="Members"
            color={colors.primary}
            onPress={() => navigation.navigate('Admin')}
          />
        ) : (
          <ActionButton
            icon="calendar-month"
            label="Attendance"
            color={colors.primary}
            onPress={() => navigation.navigate('Calendar')}
          />
        )}
        {isAdmin
          ? <ActionButton icon="settings-outline" label="Settings" color="#9B59B6" onPress={() => navigation.navigate('Settings')} />
          : <ActionButton icon="bar-chart" label="Progress" color="#9B59B6" onPress={() => navigation.navigate('Progress' as never)} />
        }
        <ActionButton icon="barbell" label="Workouts" color="#E74C3C" onPress={() => Alert.alert('Coming soon!')} />
      </View>

      {/* Admin: recent check-ins / Member: motivation */}
      {isAdmin ? (
        <>
          <Text style={styles.sectionTitle}>Recent Check-ins (Last 24h)</Text>
          {recentCheckins.length === 0 ? (
            <View style={styles.emptyCheckins}>
              <Ionicons name="time-outline" size={28} color={colors.textDim} />
              <Text style={styles.emptyCheckinsText}>No check-ins in the last 24 hours</Text>
            </View>
          ) : (
            <View style={styles.checkinList}>
              {recentCheckins.map((item, i) => (
                <View key={i} style={[styles.checkinRow, i < recentCheckins.length - 1 && styles.checkinRowBorder]}>
                  <View style={styles.checkinAvatar}>
                    <Text style={styles.checkinAvatarText}>{item.name[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkinName}>{item.name}</Text>
                    <Text style={styles.checkinEmail}>{item.email}</Text>
                  </View>
                  <Text style={styles.checkinTime}>{item.time}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.motivCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.secondary} />
          <Text style={styles.motivText}>{QUOTES[new Date().getDate() % QUOTES.length]}</Text>
        </View>
      )}

      <View style={{ height: 32 }} />

      {/* Gym QR Modal */}
      <Modal visible={showGymQR} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.qrModal}>
            <Text style={styles.qrModalTitle}>Gym Check-In QR Code</Text>
            <Text style={styles.qrModalSub}>Print and display at the gym entrance</Text>
            <View style={styles.qrBox}>
              <QRCode
                value={typeof window !== 'undefined'
                  ? `${window.location.origin}/?checkin=${GYM_CHECKIN_CODE}`
                  : GYM_CHECKIN_CODE}
                size={200} color="#000" backgroundColor="#fff" ecl="H"
              />
            </View>
            <Text style={styles.qrCodeText}>Scan with phone camera to check in</Text>
            <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setShowGymQR(false)}>
              <Text style={styles.qrCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  expiredBanner: {
    backgroundColor: `${colors.error}18`,
    borderColor: `${colors.error}44`,
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
  membershipCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  membershipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  membershipCardLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  membershipTypeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  membershipTypeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  membershipDates: { flexDirection: 'row', alignItems: 'center' },
  membershipDateCol: { flex: 1 },
  membershipDateLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  membershipDateValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  membershipDateDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  gymQrCard: {
    marginHorizontal: 20, marginBottom: 20, padding: 18,
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: `${colors.secondary}33`,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  gymQrIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: `${colors.secondary}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  gymQrTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  gymQrSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  qrModal: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: 20, padding: 24, alignItems: 'center',
  },
  qrModalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  qrModalSub: { color: colors.textMuted, fontSize: 13, marginBottom: 24 },
  qrBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 14 },
  qrCodeText: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 24 },
  qrCloseBtn: {
    width: '100%', height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qrCloseBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  checkinList: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  checkinRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  checkinRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  checkinAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${colors.primary}33`,
    alignItems: 'center', justifyContent: 'center',
  },
  checkinAvatarText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  checkinName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  checkinEmail: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  checkinTime: { color: colors.secondary, fontSize: 12, fontWeight: '600' },
  emptyCheckins: {
    marginHorizontal: 20, marginBottom: 24, padding: 28,
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', gap: 10,
  },
  emptyCheckinsText: { color: colors.textDim, fontSize: 13 },
});
