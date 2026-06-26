import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getMemberNotifications, markNotificationRead, MemberNotification } from '../services/referrals';
import { colors } from '../theme/colors';
import dayjs from 'dayjs';

export default function MemberInboxScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const data = await getMemberNotifications();
          setNotifications(data);
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
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {
      // silently ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.heading}>Inbox</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="mail-open-outline" size={52} color={colors.textDim} />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySub}>Referral confirmations will appear here</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map(n => (
            <TouchableOpacity
              key={n.id}
              style={[styles.card, !n.read && styles.cardUnread]}
              onPress={() => !n.read && handleMarkRead(n.id)}
              activeOpacity={n.read ? 1 : 0.75}
            >
              {!n.read && <View style={styles.unreadDot} />}

              <View style={styles.iconRow}>
                <View style={styles.iconWrap}>
                  <Ionicons name="gift" size={20} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>
                  You successfully referred {n.refereeName}!
                </Text>
              </View>

              <Text style={styles.cardSub}>
                Your referral has been sent to the gym. Below are the details you submitted.
              </Text>

              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.detailText}>{n.refereeName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.detailText}>{n.refereeEmail}</Text>
                </View>
                {!!n.refereePhone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.detailText}>{n.refereePhone}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.timestamp}>
                {dayjs(n.createdAt).format('DD MMM YYYY · hh:mm A')}
              </Text>

              {n.read && (
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
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },
  headerBadge: {
    backgroundColor: colors.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  headerBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },

  list: { padding: 16 },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 16, marginBottom: 12, position: 'relative',
  },
  cardUnread: {
    borderColor: `${colors.secondary}44`,
    backgroundColor: `${colors.secondary}08`,
  },
  unreadDot: {
    position: 'absolute', top: 16, right: 16,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.secondary,
  },

  iconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.secondary}18`,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20, paddingTop: 8 },
  cardSub: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },

  detailsBox: {
    backgroundColor: colors.bg, borderRadius: 10,
    padding: 12, gap: 8, marginBottom: 10,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: colors.text, fontSize: 14 },

  timestamp: { color: colors.textDim, fontSize: 11 },
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
