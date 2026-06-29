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
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { auth } from '../services/firebase';
import { isCheckedInToday, getMonthlyCount, subscribeRecentCheckins } from '../services/attendance';
import { getUserProfile, updateUserProfile, UserProfile } from '../services/users';
import { getTodayLog } from '../services/workouts';
import { getTrainerMembers } from '../services/trainers';
import { EXERCISES } from '../data/exercises';
import { calcExerciseCalories } from '../utils/calories';
import { colors } from '../theme/colors';
import MemberTabBar from '../components/MemberTabBar';

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
  const [isTrainer, setIsTrainer] = useState(false);
  const [trainerMembers, setTrainerMembers] = useState<UserProfile[]>([]);
  const [showAllCheckins, setShowAllCheckins] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState<{ name: string; email: string; time: string; checkedInAt: string }[]>([]);
  const [activationStartDate, setActivationStartDate] = useState<string | null>(null);
  const [activationEndDate, setActivationEndDate] = useState<string | null>(null);
  const [membershipType, setMembershipType] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);

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
    const [ci, mc, profile, workoutLog] = await Promise.all([
      isCheckedInToday().catch(() => false),
      getMonthlyCount(now.getFullYear(), now.getMonth() + 1).catch(() => 0),
      uid ? getUserProfile(uid).catch(() => null) : Promise.resolve(null),
      getTodayLog().catch(() => null),
    ]);
    setCheckedIn(ci);
    setMonthlyCount(mc);
    if (workoutLog && workoutLog.exercises.length > 0) {
      const bodyWeight = profile?.weightKg ?? 70;
      const kcal = Math.round(workoutLog.exercises.reduce((acc, ex) => {
        const exDef = EXERCISES.find(e => e.name === ex.name);
        const tracking = exDef?.tracking ?? 'weighted';
        const sets = ex.sets.map(s => ({
          reps: s.reps,
          weight: s.weight,
          duration: tracking === 'duration' ? s.reps : 0,
        }));
        return acc + calcExerciseCalories(ex.name, tracking, sets, bodyWeight);
      }, 0));
      setTodayCalories(kcal);
    } else {
      setTodayCalories(0);
    }
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
    setIsAdmin(profile?.role === 'admin');
    const trainer = profile?.role === 'trainer';
    setIsTrainer(trainer);
    if (trainer && uid) {
      getTrainerMembers(uid).then(setTrainerMembers).catch(() => setTrainerMembers([]));
    }
  }, [user?.uid]);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  useEffect(() => {
    if (!isAdmin) return;
    return subscribeRecentCheckins(records => {
      setRecentCheckins(records.map(r => {
        const d = dayjs(r.checkedInAt);
        const time = d.isSame(dayjs(), 'day')
          ? `Today ${d.format('h:mm A')}`
          : `Yesterday ${d.format('h:mm A')}`;
        return { name: r.displayName || 'Unknown', email: r.email, time, checkedInAt: r.checkedInAt };
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

  const crowdBuckets = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const slotDate = new Date(now.getTime() - (7 - i) * 3600000);
      slotDate.setMinutes(0, 0, 0);
      const slotEnd = new Date(slotDate.getTime() + 3600000);
      const count = recentCheckins.filter(r => {
        const t = new Date(r.checkedInAt);
        return t >= slotDate && t < slotEnd;
      }).length;
      const h = slotDate.getHours();
      const label = h === 0 ? '12A' : h === 12 ? '12P' : h < 12 ? `${h}A` : `${h - 12}P`;
      return { label, count, isCurrent: i === 7 };
    });
  }, [recentCheckins]);

  const monthName = dayjs().format('MMM');

  const fmtDate = (d: string | null): string => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${MONTHS[+m - 1]} ${y}`;
  };

  return (
    <View style={styles.root}>
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        {(isAdmin || isTrainer) ? (
          <>
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
              <Ionicons name="menu" size={28} color={colors.text} />
            </TouchableOpacity>
            {isAdmin ? (
              <TouchableOpacity onPress={() => navigation.navigate('QRCode' as never)}>
                <Ionicons name="qr-code-outline" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Settings' as never)}>
            <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Expired / pending banner */}
      {!isAdmin && !isTrainer && isExpired && (
        <View style={[styles.pendingBanner, styles.expiredBanner]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pendingTitle, { color: colors.error }]}>Membership Expired</Text>
            <Text style={styles.pendingSub}>Your membership has expired. Please contact the gym admin to renew.</Text>
          </View>
        </View>
      )}
      {!isAdmin && !isTrainer && !isExpired && !isActive && (
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

      {/* Stats — members see session stats */}
      {!isAdmin && !isTrainer && (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderColor: `${colors.primary}44` }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{monthlyCount}</Text>
              <Text style={styles.statLabel}>{monthName} Sessions</Text>
            </View>
            <View style={[styles.statCard, { borderColor: '#FF6B3544' }]}>
              <Ionicons name="flame-outline" size={20} color="#FF6B35" />
              <Text style={[styles.statValue, { color: '#FF6B35' }]}>
                {todayCalories > 0 ? todayCalories : '—'}
              </Text>
              <Text style={styles.statLabel}>KCAL Today</Text>
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

      {/* Crowd Meter — admin only */}
      {isAdmin && (() => {
        const maxCount = Math.max(...crowdBuckets.map(b => b.count), 1);
        const BAR_H = 72;
        return (
          <View style={styles.crowdCard}>
            <View style={styles.crowdHeader}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={styles.crowdTitle}>Crowd Meter</Text>
              <Text style={styles.crowdPeriod}>Last 8 hours</Text>
            </View>
            <View style={styles.barChart}>
              {crowdBuckets.map((b, i) => (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barCount}>{b.count > 0 ? b.count : ''}</Text>
                  <View style={[styles.barTrack, { height: BAR_H }]}>
                    <View style={[
                      styles.barFill,
                      {
                        height: Math.max((b.count / maxCount) * BAR_H, b.count > 0 ? 4 : 0),
                        backgroundColor: b.isCurrent ? colors.primary : `${colors.primary}66`,
                      },
                    ]} />
                  </View>
                  <Text style={[styles.barLabel, b.isCurrent && { color: colors.primary, fontWeight: '700' }]}>
                    {b.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

      {/* Check-In Card — members only */}
      {!isAdmin && !isTrainer && (
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


      {/* Trainer: assigned members */}
      {isTrainer && (
        <>
          <Text style={styles.sectionTitle}>My Members</Text>
          {trainerMembers.length === 0 ? (
            <View style={styles.emptyCheckins}>
              <Ionicons name="people-outline" size={28} color={colors.textDim} />
              <Text style={styles.emptyCheckinsText}>No members assigned yet</Text>
            </View>
          ) : (
            <View style={styles.checkinList}>
              {trainerMembers.map((m, i) => {
                const mColor = m.membershipType === 'vip' ? colors.primary : m.membershipType === 'premium' ? colors.secondary : colors.textMuted;
                const initials = m.displayName ? m.displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
                return (
                  <TouchableOpacity
                    key={m.uid}
                    style={[styles.checkinRow, i < trainerMembers.length - 1 && styles.checkinRowBorder]}
                    onPress={() => navigation.navigate('TrainerMemberWorkout', { memberUid: m.uid, memberName: m.displayName })}
                  >
                    <View style={[styles.checkinAvatar, { backgroundColor: `${mColor}33` }]}>
                      <Text style={[styles.checkinAvatarText, { color: mColor }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.checkinName}>{m.displayName}</Text>
                      <Text style={styles.checkinEmail}>{m.memberId || m.email}</Text>
                    </View>
                    <View style={[styles.planChip, { backgroundColor: `${mColor}22` }]}>
                      <Text style={[styles.planChipText, { color: mColor }]}>{m.membershipType?.toUpperCase()}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textDim} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Admin: recent check-ins / Member: motivation */}
      {isAdmin ? (
        <>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { marginHorizontal: 0, marginBottom: 0 }]}>Recent Check-ins (Last 24h)</Text>
            {recentCheckins.length > 5 && (
              <TouchableOpacity onPress={() => setShowAllCheckins(true)}>
                <Text style={styles.moreLink}>more</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentCheckins.length === 0 ? (
            <View style={styles.emptyCheckins}>
              <Ionicons name="time-outline" size={28} color={colors.textDim} />
              <Text style={styles.emptyCheckinsText}>No check-ins in the last 24 hours</Text>
            </View>
          ) : (
            <View style={styles.checkinList}>
              {recentCheckins.slice(0, 5).map((item, i) => (
                <View key={i} style={[styles.checkinRow, i < Math.min(recentCheckins.length, 5) - 1 && styles.checkinRowBorder]}>
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

          {/* All check-ins modal */}
          <Modal visible={showAllCheckins} transparent animationType="fade">
            <View style={styles.overlay}>
              <View style={styles.allCheckinsModal}>
                <View style={styles.allCheckinsHeader}>
                  <Text style={styles.allCheckinsTitle}>All Check-ins (Last 24h)</Text>
                  <TouchableOpacity onPress={() => setShowAllCheckins(false)}>
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.allCheckinsScroll} showsVerticalScrollIndicator={false}>
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
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      ) : !isTrainer ? (
        <View style={styles.motivCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.secondary} />
          <Text style={styles.motivText}>{QUOTES[new Date().getDate() % QUOTES.length]}</Text>
        </View>
      ) : null}

      <View style={{ height: 32 }} />

    </ScrollView>
    {!isAdmin && !isTrainer && <MemberTabBar />}
    </View>
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
  crowdCard: {
    marginHorizontal: 20, marginBottom: 20, padding: 18,
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: `${colors.primary}22`,
  },
  crowdHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  crowdTitle: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  crowdPeriod: { color: colors.textDim, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barCount: { color: colors.primary, fontSize: 10, fontWeight: '700', height: 14 },
  barTrack: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { color: colors.textDim, fontSize: 9, fontWeight: '600' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
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
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 14,
  },
  moreLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  allCheckinsModal: {
    width: '100%', maxHeight: '75%', backgroundColor: colors.surface,
    borderRadius: 20, padding: 20,
  },
  allCheckinsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  allCheckinsTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  allCheckinsScroll: { flexGrow: 0 },
  planChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  planChipText: { fontSize: 10, fontWeight: '700' },
});
