import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getTrainerMembers } from '../services/trainers';
import { UserProfile } from '../services/users';
import { auth } from '../services/firebase';

const MEMBERSHIP_COLOR: Record<string, string> = {
  basic: colors.textMuted,
  premium: colors.secondary,
  vip: colors.primary,
};

export default function TrainerMembersScreen() {
  const navigation = useNavigation<any>();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        setLoading(true);
        try {
          const data = await getTrainerMembers(uid);
          setMembers(data);
        } catch (err: any) {
          (window as any).alert('Failed to load members: ' + err.message);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>My Members</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : members.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={52} color={colors.textDim} />
          <Text style={styles.emptyText}>No members assigned</Text>
          <Text style={styles.emptySub}>Ask your admin to assign members to you.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {members.map(m => {
            const mColor = MEMBERSHIP_COLOR[m.membershipType] ?? colors.primary;
            const initials = m.displayName
              ? m.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
              : '?';
            return (
              <View key={m.uid} style={styles.card}>
                <View style={[styles.avatar, { backgroundColor: `${mColor}22`, borderColor: `${mColor}55` }]}>
                  <Text style={[styles.avatarText, { color: mColor }]}>{initials}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{m.displayName}</Text>
                  <Text style={styles.email}>{m.email}</Text>
                  {m.memberId && <Text style={styles.memberId}>{m.memberId}</Text>}
                  <View style={styles.badgeRow}>
                    <View style={[styles.planChip, { backgroundColor: `${mColor}22` }]}>
                      <Text style={[styles.planChipText, { color: mColor }]}>{m.membershipType?.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusChip, m.isActive ? styles.statusActive : styles.statusInactive]}>
                      <Text style={styles.statusText}>{m.isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.workoutBtn}
                  onPress={() => navigation.navigate('TrainerMemberWorkout', { memberUid: m.uid, memberName: m.displayName })}
                >
                  <Ionicons name="barbell-outline" size={16} color={colors.primary} />
                  <Text style={styles.workoutBtnText}>Workout</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14,
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },

  list: { padding: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 14, marginBottom: 10, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', fontSize: 14 },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  email: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  memberId: { color: colors.textDim, fontSize: 11, fontWeight: '600', marginTop: 1 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  planChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  planChipText: { fontSize: 10, fontWeight: '700' },
  statusChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusActive: { backgroundColor: `${colors.success}22` },
  statusInactive: { backgroundColor: `${colors.error}22` },
  statusText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  workoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}55`,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  workoutBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
