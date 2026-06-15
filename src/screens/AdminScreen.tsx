import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { getAllUsers, deleteUserProfile, UserProfile } from '../services/users';
const today = () => new Date().toISOString().slice(0, 10);
import { getMemberCheckinHistory } from '../services/attendance';
import { colors } from '../theme/colors';
import { GYM_CHECKIN_CODE } from '../config';

const MEMBERSHIP_COLOR: Record<string, string> = {
  vip: '#FFD700',
  premium: '#9B59B6',
  basic: colors.primary,
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day} ${MONTHS[+m - 1]} ${y}`;
};

export default function AdminScreen() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGymQR, setShowGymQR] = useState(false);
  const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<{ date: string; checkedInAt: any }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getAllUsers();
      const t = today();
      const expired = all.filter(u => u.scheduledDeleteAt && u.scheduledDeleteAt <= t);
      if (expired.length > 0) {
        await Promise.all(expired.map(u => deleteUserProfile(u.uid)));
      }
      const active = all.filter(u => !expired.some(e => e.uid === u.uid));
      setUsers(active);
      const q = search.toLowerCase();
      setFiltered(q ? active.filter(u => u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : active);
    } catch (err: any) {
      (window as any).alert('Failed to load members: ' + err.message);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onSearch = (text: string) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(users.filter(u =>
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    ));
  };

  const openHistory = async (user: UserProfile) => {
    setHistoryUser(user);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const data = await getMemberCheckinHistory(user.uid);
      setHistory(data);
    } catch (err: any) {
      (window as any).alert('Failed to load history: ' + (err.message ?? 'Unknown error'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const activeCount = users.filter(u => u.isActive).length;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Members</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AdminUserDetail', { user: null })}
        >
          <Ionicons name="person-add" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatChip label="Total" value={users.length} color={colors.primary} />
        <StatChip label="Active" value={activeCount} color={colors.success} />
        <StatChip label="Inactive" value={users.length - activeCount} color={colors.textMuted} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={onSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={u => u.uid}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDim} />
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MemberCard
              user={item}
              onEdit={() => navigation.navigate('AdminUserDetail', { user: item })}
              onHistory={() => openHistory(item)}
            />
          )}
        />
      )}

      {/* Check-in History modal */}
      <Modal visible={!!historyUser} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: '80%' }]}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.modalTitle}>{historyUser?.displayName || historyUser?.email}</Text>
              <Text style={styles.historySubtitle}>Last 60 Days Check-in History</Text>
            </View>
            {historyLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                {history.length === 0 ? (
                  <Text style={styles.historyEmpty}>No check-ins in the last 60 days.</Text>
                ) : (
                  history.map((item, i) => {
                    const time = item.checkedInAt ? dayjs(item.checkedInAt.toDate()).format('h:mm A') : '—';
                    return (
                      <View key={item.date} style={[styles.historyRow, i < history.length - 1 && styles.historyRowBorder]}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.historyDate}>{dayjs(item.date).format('DD MMM YYYY')}</Text>
                        <Text style={styles.historyTime}>{time}</Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 16, width: '100%' }]} onPress={() => setHistoryUser(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gym QR code modal */}
      <Modal visible={showGymQR} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Gym Check-In QR Code</Text>
            <Text style={[styles.modalBody, { marginBottom: 20 }]}>
              Print this and display it at the gym entrance. Members scan it to check in.
            </Text>
            <View style={styles.gymQrWrap}>
              <QRCode value={GYM_CHECKIN_CODE} size={200} color="#000" backgroundColor="#fff" ecl="H" />
            </View>
            <Text style={styles.gymQrCode}>{GYM_CHECKIN_CODE}</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGymQR(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statChip, { borderColor: `${color}44` }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MemberCard({ user, onEdit, onHistory }: { user: UserProfile; onEdit: () => void; onHistory: () => void }) {
  const memberColor = MEMBERSHIP_COLOR[user.membershipType] ?? colors.primary;
  const initials = user.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View style={[styles.card, !user.isActive && styles.cardInactive]}>
      <View style={[styles.avatar, { backgroundColor: `${memberColor}22`, borderColor: `${memberColor}55` }]}>
        <Text style={[styles.avatarText, { color: memberColor }]}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.displayName || '—'}</Text>
          {user.role === 'admin' && (
            <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
          )}
          {!user.isActive && (
            <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>INACTIVE</Text></View>
          )}
          {user.scheduledDeleteAt && (
            <View style={styles.deletionBadge}><Text style={styles.deletionBadgeText}>DELETES {fmtDate(user.scheduledDeleteAt)}</Text></View>
          )}
        </View>
        <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
        <View style={styles.membershipRow}>
          <View style={[styles.membershipBadge, { backgroundColor: `${memberColor}22` }]}>
            <Text style={[styles.membershipText, { color: memberColor }]}>{user.membershipType?.toUpperCase()}</Text>
          </View>
          {user.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
        </View>
        {user.activationStartDate ? (
          <Text style={styles.activationDate}>
            {fmtDate(user.activationStartDate)}
            {' → '}
            {user.activationEndDate ? fmtDate(user.activationEndDate) : 'Open-ended'}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtnHistory} onPress={onHistory}>
          <Text style={styles.actionBtnHistoryText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnUpdate} onPress={onEdit}>
          <Text style={styles.actionBtnUpdateText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12,
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },
  qrBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  statChip: {
    flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', backgroundColor: colors.surface,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10,
  },
  cardInactive: { opacity: 0.55 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  adminBadge: { backgroundColor: `${colors.secondary}33`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  adminBadgeText: { color: colors.secondary, fontSize: 9, fontWeight: '800' },
  inactiveBadge: { backgroundColor: '#33333388', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  inactiveBadgeText: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 12 },
  membershipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  membershipBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  membershipText: { fontSize: 10, fontWeight: '700' },
  phone: { color: colors.textMuted, fontSize: 11 },
  activationDate: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  actions: { flexDirection: 'column', gap: 5 },
  actionBtnHistory: {
    height: 26, borderRadius: 6, borderWidth: 1, width: 64,
    borderColor: `${colors.secondary}44`, backgroundColor: `${colors.secondary}11`,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnHistoryText: { color: colors.secondary, fontSize: 9, fontWeight: '700' },
  actionBtnUpdate: {
    height: 26, borderRadius: 6, borderWidth: 1, width: 64,
    borderColor: `${colors.primary}44`, backgroundColor: `${colors.primary}11`,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnUpdateText: { color: colors.primary, fontSize: 9, fontWeight: '700' },
  deletionBadge: { backgroundColor: `${colors.error}22`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  deletionBadgeText: { color: colors.error, fontSize: 9, fontWeight: '800' },
  // Modals
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modal: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 20,
    padding: 24, alignItems: 'center',
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  modalBody: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  gymQrWrap: {
    backgroundColor: '#fff', padding: 20, borderRadius: 16,
    marginBottom: 14, alignItems: 'center',
  },
  gymQrCode: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 20 },
  historyModalHeader: { width: '100%', marginBottom: 16 },
  historySubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  historyEmpty: { color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  historyDate: { flex: 1, color: colors.text, fontSize: 14 },
  historyTime: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
});
