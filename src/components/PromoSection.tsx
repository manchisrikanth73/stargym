import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateUserProfile } from '../services/users';
import { notify } from '../utils/notify';
import { colors } from '../theme/colors';

type PromoFeature = { key: string; label: string; profileField: 'promoWorkoutExpiry' };

const PROMO_FEATURES: PromoFeature[] = [
  { key: 'workout', label: 'Workouts', profileField: 'promoWorkoutExpiry' },
];

interface Props {
  uid: string;
  initialExpiries: Record<string, string | null>;
}

export default function PromoSection({ uid, initialExpiries }: Props) {
  const [promoDays, setPromoDays] = useState('');
  const [selectedPromo, setSelectedPromo] = useState(PROMO_FEATURES[0].key);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expiries, setExpiries] = useState<Record<string, string | null>>(initialExpiries);

  const today = new Date().toISOString().slice(0, 10);

  const handleGrant = async () => {
    const days = parseInt(promoDays.trim(), 10);
    if (!days || days < 1) { notify('Invalid', 'Enter a number of days (minimum 1).'); return; }
    const feature = PROMO_FEATURES.find(f => f.key === selectedPromo)!;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    const expiryStr = expiry.toISOString().slice(0, 10);
    try {
      await updateUserProfile(uid, { [feature.profileField]: expiryStr });
      setExpiries(prev => ({ ...prev, [selectedPromo]: expiryStr }));
      setPromoDays('');
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to grant promo access.');
    }
  };

  const handleRevoke = async (key: string) => {
    const feature = PROMO_FEATURES.find(f => f.key === key)!;
    try {
      await updateUserProfile(uid, { [feature.profileField]: null });
      setExpiries(prev => ({ ...prev, [key]: null }));
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to revoke promo access.');
    }
  };

  return (
    <View>
      <View style={styles.grantRow}>
        <View style={styles.dropdownWrap}>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setDropdownOpen(o => !o)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>
              {PROMO_FEATURES.find(f => f.key === selectedPromo)?.label}
            </Text>
            <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
          </TouchableOpacity>
          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {PROMO_FEATURES.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={styles.dropdownItem}
                  onPress={() => { setSelectedPromo(f.key); setDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, selectedPromo === f.key && { color: colors.primary }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.daysWrap}>
          <TextInput
            style={styles.daysInput}
            placeholder="Days"
            placeholderTextColor={colors.textMuted}
            value={promoDays}
            onChangeText={t => setPromoDays(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity style={styles.grantBtn} onPress={handleGrant}>
          <Ionicons name="gift-outline" size={15} color="#000" />
          <Text style={styles.grantBtnText}>Grant</Text>
        </TouchableOpacity>
      </View>

      {PROMO_FEATURES.filter(f => expiries[f.key]).map(f => {
        const expiry = expiries[f.key]!;
        const active = expiry >= today;
        return (
          <View key={f.key} style={[styles.activeRow, { marginTop: 10 }]}>
            <Ionicons
              name="gift-outline"
              size={14}
              color={active ? colors.secondary : colors.textDim}
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.featureName}>{f.label}</Text>
              <Text style={[styles.expiryLabel, !active && { color: colors.textDim }]}>
                {active ? `Active · expires ${expiry}` : `Expired ${expiry}`}
              </Text>
            </View>
            {active && (
              <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(f.key)}>
                <Ionicons name="close-circle-outline" size={15} color={colors.error} />
                <Text style={styles.revokeBtnText}>Revoke</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grantRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdownWrap: { flex: 1, position: 'relative' as any, zIndex: 10 },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg, paddingHorizontal: 12,
  },
  dropdownText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  dropdownMenu: {
    position: 'absolute' as any, top: 44, left: 0, right: 0,
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  daysWrap: {
    width: 72, height: 42, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 12,
  },
  daysInput: { color: colors.text, fontSize: 14 },
  grantBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, height: 42, borderRadius: 10, paddingHorizontal: 14,
    backgroundColor: colors.secondary,
  },
  grantBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
  activeRow: { flexDirection: 'row', alignItems: 'center' },
  featureName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  expiryLabel: { color: colors.secondary, fontSize: 11, fontWeight: '600', marginTop: 1 },
  revokeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: `${colors.error}44`,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  revokeBtnText: { color: colors.error, fontSize: 12, fontWeight: '700' },
});
