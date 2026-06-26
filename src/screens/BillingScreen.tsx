import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import {
  getMembershipPrices, setMembershipPrices, MembershipPrices,
  getWorkoutAccess, setWorkoutAccess, WorkoutAccess,
} from '../services/gymSettings';
import { colors } from '../theme/colors';

const PLANS: { key: keyof MembershipPrices; label: string; color: string }[] = [
  { key: 'basic',   label: 'Basic',   color: colors.primary },
  { key: 'premium', label: 'Premium', color: '#9B59B6' },
  { key: 'vip',     label: 'VIP',     color: '#FFD700' },
];

export default function BillingScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading]               = useState(true);
  const [prices, setPrices]                 = useState<MembershipPrices>({ basic: 0, premium: 0, vip: 0 });
  const [draft, setDraft]                   = useState<MembershipPrices>({ basic: 0, premium: 0, vip: 0 });
  const [editing, setEditing]               = useState(false);
  const [savingPrices, setSavingPrices]     = useState(false);
  const [workoutAccess, setWorkoutAccess_]  = useState<WorkoutAccess>({ basic: false, premium: true, vip: true });
  const [savingAccess, setSavingAccess]     = useState(false);
  const [saveSuccess, setSaveSuccess]       = useState(false);

  const notify = (msg: string) => {
    if (typeof window !== 'undefined') (window as any).alert(msg);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([getMembershipPrices(), getWorkoutAccess()])
        .then(([p, wa]) => {
          setPrices(p); setDraft(p); setWorkoutAccess_(wa);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const handleSavePrices = async () => {
    setSavingPrices(true);
    try {
      await setMembershipPrices(draft);
      setPrices(draft);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      notify(err.message ?? 'Failed to save prices.');
    } finally {
      setSavingPrices(false);
    }
  };

  const handleToggleAccess = async (key: keyof WorkoutAccess, value: boolean) => {
    const updated = { ...workoutAccess, [key]: value };
    setWorkoutAccess_(updated);
    setSavingAccess(true);
    try {
      await setWorkoutAccess(updated);
    } catch (err: any) {
      notify(err.message ?? 'Failed to save.');
      setWorkoutAccess_(workoutAccess);
    } finally {
      setSavingAccess(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Membership Plans</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>

          {/* Membership Plans */}
          <Text style={styles.sectionTitle}>Membership Plans</Text>
          <View style={styles.card}>
            {/* Column headers */}
            <View style={[styles.gridRow, styles.gridHeaderRow]}>
              <Text style={[styles.colHeader, styles.col1]}>Plan</Text>
              <View style={[styles.col2, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <Text style={styles.colHeader}>Monthly Price</Text>
              </View>
              <View style={[styles.col3, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}>
                <Text style={styles.colHeader}>Workouts</Text>
                {savingAccess && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
            </View>

            {PLANS.map(({ key, label, color }, i) => (
              <React.Fragment key={key}>
                {i > 0 && <View style={styles.rowDivider} />}
                <View style={styles.gridRow}>
                  <View style={[styles.col1, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <View style={[styles.planDot, { backgroundColor: `${color}22` }]}>
                      <Text style={[styles.planDotText, { color }]}>{label[0]}</Text>
                    </View>
                    <Text style={styles.planName}>{label}</Text>
                  </View>

                  <View style={[styles.col2, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    {editing ? (
                      <View style={styles.priceInputWrap}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={draft[key] === 0 ? '' : String(draft[key])}
                          onChangeText={v => {
                            const n = parseFloat(v);
                            setDraft(p => ({ ...p, [key]: isNaN(n) ? 0 : n }));
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={colors.textDim}
                        />
                      </View>
                    ) : (
                      <>
                        <Text style={styles.priceValue}>
                          {prices[key] > 0 ? `₹${prices[key]}` : '—'}
                        </Text>
                        <TouchableOpacity onPress={() => setEditing(true)}>
                          <Text style={styles.editLink}>Edit</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  <View style={[styles.col3, { alignItems: 'center' }]}>
                    <Switch
                      value={workoutAccess[key]}
                      onValueChange={v => handleToggleAccess(key, v)}
                      trackColor={{ true: color, false: '#333' }}
                      thumbColor="#fff"
                      disabled={savingAccess}
                    />
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>

          {saveSuccess && (
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={styles.successText}>Prices saved.</Text>
            </View>
          )}

          {editing && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setDraft(prices); setEditing(false); }}
                disabled={savingPrices}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, savingPrices && { opacity: 0.5 }]}
                onPress={handleSavePrices}
                disabled={savingPrices}
              >
                {savingPrices
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.saveBtnText}>Save Prices</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
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
  body: { padding: 16 },

  sectionTitle: {
    color: colors.textDim, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden', marginBottom: 14,
  },
  gridRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  gridHeaderRow: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  colHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  col1: { flex: 2 },
  col2: { flex: 2 },
  col3: { flex: 1 },

  planDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  planDotText: { fontSize: 13, fontWeight: '800' },
  planName: { color: colors.text, fontSize: 14, fontWeight: '600' },

  priceValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  editLink: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 8, height: 36, gap: 2, width: 90,
  },
  currencySymbol: { color: colors.textMuted, fontSize: 14 },
  priceInput: { color: colors.text, fontSize: 14, width: 58 },

  successRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${colors.success}18`,
    borderWidth: 1, borderColor: `${colors.success}33`,
    borderRadius: 10, padding: 10, marginBottom: 12,
  },
  successText: { color: colors.success, fontSize: 13 },

  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 2, height: 46, backgroundColor: colors.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
});
