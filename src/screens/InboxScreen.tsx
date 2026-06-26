import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { getReferrals, markReferralRead, ReferralRecord } from '../services/referrals';
import { colors } from '../theme/colors';
import dayjs from 'dayjs';

export default function InboxScreen() {
  const navigation = useNavigation<any>();
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const data = await getReferrals();
          setReferrals(data);
        } catch {
          // silently ignore
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const handleMarkRead = async (id: string) => {
    try {
      await markReferralRead(id);
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, read: true } : r));
    } catch {
      // silently ignore
    }
  };

  const unreadCount = referrals.filter(r => !r.read).length;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.heading}>Inbox</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : referrals.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="mail-open-outline" size={52} color={colors.textDim} />
          <Text style={styles.emptyText}>No referrals yet</Text>
          <Text style={styles.emptySub}>Member referrals will appear here</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {referrals.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.card, !r.read && styles.cardUnread]}
              onPress={() => !r.read && handleMarkRead(r.id)}
              activeOpacity={r.read ? 1 : 0.75}
            >
              {!r.read && <View style={styles.unreadDot} />}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>REFERRED PERSON</Text>
                <Text style={styles.personName}>{r.refereeName}</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.detailText}>{r.refereeEmail}</Text>
                </View>
                {!!r.refereePhone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.detailText}>{r.refereePhone}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>REFERRED BY</Text>
                <Text style={styles.referrerName}>{r.referrerName}</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.detailText}>{r.referrerEmail}</Text>
                </View>
              </View>

              <Text style={styles.timestamp}>
                {dayjs(r.createdAt).format('DD MMM YYYY · hh:mm A')}
              </Text>

              {r.read && (
                <View style={styles.readChip}>
                  <Ionicons name="checkmark-done" size={12} color={colors.textDim} />
                  <Text style={styles.readChipText}>Read</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },
  headerBadge: {
    backgroundColor: colors.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  headerBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },

  list: { padding: 16 },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 16, marginBottom: 12, position: 'relative',
  },
  cardUnread: {
    borderColor: `${colors.primary}44`,
    backgroundColor: `${colors.primary}08`,
  },
  unreadDot: {
    position: 'absolute', top: 16, right: 16,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },

  section: { marginBottom: 12 },
  sectionLabel: {
    color: colors.textDim, fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  personName: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  referrerName: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  detailText: { color: colors.textMuted, fontSize: 13 },

  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },

  timestamp: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  readChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  readChipText: { color: colors.textDim, fontSize: 11, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.textDim, fontSize: 13 },
});
