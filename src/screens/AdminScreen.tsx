import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { getAllUsers, deleteUserProfile, UserProfile } from '../services/users';
import { colors } from '../theme/colors';

const MEMBERSHIP_COLOR: Record<string, string> = {
  vip: '#FFD700',
  premium: '#9B59B6',
  basic: colors.primary,
};

export default function AdminScreen() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const all = await getAllUsers();
    setUsers(all);
    setFiltered(all);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

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

  const confirmDelete = (user: UserProfile) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${user.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteUserProfile(user.uid);
            await load();
          },
        },
      ]
    );
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
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}
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

function MemberCard({
  user, onEdit, onDelete,
}: {
  user: UserProfile; onEdit: () => void; onDelete: () => void;
}) {
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
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
          {!user.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
        <View style={styles.membershipRow}>
          <View style={[styles.membershipBadge, { backgroundColor: `${memberColor}22` }]}>
            <Text style={[styles.membershipText, { color: memberColor }]}>
              {user.membershipType?.toUpperCase()}
            </Text>
          </View>
          {user.phone ? (
            <Text style={styles.phone}>{user.phone}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
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
    paddingTop: 54,
    paddingBottom: 12,
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  statChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  cardInactive: { opacity: 0.55 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
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
  actions: { gap: 8 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
