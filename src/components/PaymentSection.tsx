import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MembershipType } from '../services/users';
import { getMembershipPrices } from '../services/gymSettings';
import {
  SubscriptionStatus, PaymentEvent,
  getPaymentStatus, getPaymentHistory,
  createSubscription, cancelSubscription,
  pauseSubscription, resumeSubscription,
} from '../services/payments';
import { notify } from '../utils/notify';
import { colors } from '../theme/colors';

interface Props {
  uid: string;
  membershipType: MembershipType;
}

const STATUS_COLORS: Record<string, string> = {
  active:    colors.success,
  pending:   colors.secondary,
  paused:    '#9B59B6',
  cancelled: colors.textDim,
  halted:    colors.error,
  completed: colors.textDim,
};

function getStatusColor(status: string | null | undefined) {
  return STATUS_COLORS[status ?? ''] ?? colors.textDim;
}

export default function PaymentSection({ uid, membershipType }: Props) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [history, setHistory] = useState<PaymentEvent[]>([]);
  const [memberPrice, setMemberPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPaymentStatus(uid),
      getPaymentHistory(uid),
      getMembershipPrices(),
    ]).then(([s, h, prices]) => {
      setStatus(s);
      setHistory(h);
      setMemberPrice(prices[membershipType] ?? 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [uid]);

  const canSetupAutoPay = !status?.mandateStatus
    || status.mandateStatus === 'cancelled'
    || status.mandateStatus === 'completed';

  const handleSetupAutoPay = async () => {
    setActionLoading(true);
    try {
      const { shortUrl } = await createSubscription(uid, membershipType, memberPrice);
      if (typeof window !== 'undefined') window.open(shortUrl, '_blank');
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to create subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await pauseSubscription(uid);
      setStatus(prev => prev ? { ...prev, mandateStatus: 'paused' } : prev);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to pause subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await resumeSubscription(uid);
      setStatus(prev => prev ? { ...prev, mandateStatus: 'active' } : prev);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to resume subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = Platform.OS === 'web'
      ? (window as any).confirm('Cancel this subscription? The member will not be billed again.')
      : true;
    if (!confirmed) return;
    setActionLoading(true);
    try {
      await cancelSubscription(uid);
      setStatus(prev => prev ? { ...prev, mandateStatus: 'cancelled' } : prev);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />;
  }

  const color = getStatusColor(status?.mandateStatus);

  return (
    <View>
      <View style={styles.statusRow}>
        <View style={[styles.statusChip, { backgroundColor: `${color}22` }]}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>
            {status?.mandateStatus ? status.mandateStatus.toUpperCase() : 'NOT SET UP'}
          </Text>
        </View>
        {status?.amount != null && (
          <Text style={styles.amount}>₹{status.amount.toLocaleString('en-IN')}/mo</Text>
        )}
      </View>

      {!!status?.nextBillingDate && (
        <Text style={styles.meta}>Next billing: {status.nextBillingDate}</Text>
      )}
      {!!status?.graceUntil && (
        <Text style={[styles.meta, { color: colors.error }]}>Grace period until: {status.graceUntil}</Text>
      )}
      {(status?.failedPaymentCount ?? 0) > 0 && (
        <Text style={[styles.meta, { color: colors.error }]}>
          Failed payments: {status!.failedPaymentCount}
        </Text>
      )}

      <View style={styles.actions}>
        {canSetupAutoPay && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={handleSetupAutoPay}
            disabled={actionLoading || memberPrice <= 0}
          >
            {actionLoading
              ? <ActivityIndicator color="#000" size="small" />
              : <>
                  <Ionicons name="card-outline" size={15} color="#000" />
                  <Text style={styles.btnDark}>Setup AutoPay</Text>
                </>
            }
          </TouchableOpacity>
        )}
        {status?.mandateStatus === 'active' && (
          <TouchableOpacity
            style={[styles.btn, { borderColor: '#9B59B644', backgroundColor: '#9B59B611' }]}
            onPress={handlePause}
            disabled={actionLoading}
          >
            <Ionicons name="pause-circle-outline" size={15} color="#9B59B6" />
            <Text style={[styles.btnLabel, { color: '#9B59B6' }]}>Pause</Text>
          </TouchableOpacity>
        )}
        {status?.mandateStatus === 'paused' && (
          <TouchableOpacity
            style={[styles.btn, { borderColor: `${colors.success}44`, backgroundColor: `${colors.success}11` }]}
            onPress={handleResume}
            disabled={actionLoading}
          >
            <Ionicons name="play-circle-outline" size={15} color={colors.success} />
            <Text style={[styles.btnLabel, { color: colors.success }]}>Resume</Text>
          </TouchableOpacity>
        )}
        {(status?.mandateStatus === 'active' || status?.mandateStatus === 'paused') && (
          <TouchableOpacity
            style={[styles.btn, { borderColor: `${colors.error}44`, backgroundColor: `${colors.error}11` }]}
            onPress={handleCancel}
            disabled={actionLoading}
          >
            <Ionicons name="close-circle-outline" size={15} color={colors.error} />
            <Text style={[styles.btnLabel, { color: colors.error }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.historyHeading}>Recent Payments</Text>
          {history.slice(0, 5).map(e => {
            const isSuccess = e.status === 'captured' || e.eventType === 'subscription.charged';
            const isFailed = e.status === 'failed';
            return (
              <View key={e.id} style={styles.historyRow}>
                <Ionicons
                  name={isSuccess ? 'checkmark-circle' : isFailed ? 'close-circle' : 'time'}
                  size={14}
                  color={isSuccess ? colors.success : isFailed ? colors.error : colors.textDim}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyEvent}>
                    {e.eventType.replace('subscription.', '').replace('payment.', '')}
                  </Text>
                  {!!e.createdAt && (
                    <Text style={styles.historyDate}>{e.createdAt.slice(0, 10)}</Text>
                  )}
                </View>
                {e.amount != null && (
                  <Text style={styles.historyAmount}>₹{e.amount.toLocaleString('en-IN')}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  amount: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: 3 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 8, flexWrap: 'wrap' as const },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  btnDark: { color: '#000', fontSize: 13, fontWeight: '800' },
  btnLabel: { fontSize: 13, fontWeight: '700' },
  history: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginTop: 4 },
  historyHeading: {
    color: colors.textDim, fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  historyEvent: { color: colors.text, fontSize: 12, fontWeight: '600' },
  historyDate: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  historyAmount: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
});
