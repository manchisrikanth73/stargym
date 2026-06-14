import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, updateUserProfile } from '../services/users';
import {
  getMembershipPrices, setMembershipPrices, MembershipPrices,
  getWorkoutAccess, setWorkoutAccess, WorkoutAccess,
} from '../services/gymSettings';
import { colors } from '../theme/colors';

const MEMBERSHIP_OPTIONS: { key: keyof MembershipPrices; label: string; color: string }[] = [
  { key: 'basic',   label: 'Basic',   color: colors.primary },
  { key: 'premium', label: 'Premium', color: '#9B59B6' },
  { key: 'vip',     label: 'VIP',     color: '#FFD700' },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser!;

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');

  const [prices, setPrices] = useState<MembershipPrices>({ basic: 0, premium: 0, vip: 0 });
  const [pricesDraft, setPricesDraft] = useState<MembershipPrices>({ basic: 0, premium: 0, vip: 0 });
  const [editingPrices, setEditingPrices] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);

  const [workoutAccess, setWorkoutAccessState] = useState<WorkoutAccess>({ basic: false, premium: true, vip: true });
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile(user.uid);
      const parts = (profile?.displayName ?? user.displayName ?? '').split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' '));
      setEmail(profile?.email ?? user.email ?? '');
      setPhone(profile?.phone ?? '');
      const admin = profile?.role === 'admin';
      setIsAdmin(admin);
      if (admin) {
        const [p, wa] = await Promise.all([getMembershipPrices(), getWorkoutAccess()]);
        setPrices(p);
        setPricesDraft(p);
        setWorkoutAccessState(wa);
      }
      setLoading(false);
    })();
  }, []);

  const handleToggleAccess = async (key: keyof WorkoutAccess, value: boolean) => {
    const updated = { ...workoutAccess, [key]: value };
    setWorkoutAccessState(updated);
    setSavingAccess(true);
    try {
      await setWorkoutAccess(updated);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to save access setting.');
      setWorkoutAccessState(workoutAccess);
    } finally {
      setSavingAccess(false);
    }
  };

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web') (window as any).alert(`${title}\n\n${msg}`);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      notify('Missing field', 'First name is required.');
      return;
    }
    setSaving(true);
    setSuccess(false);
    try {
      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      await updateProfile(user, { displayName });
      const update: Record<string, string> = { displayName };
      if (isAdmin) {
        update.email = email.trim();
        update.phone = phone.trim();
      }
      await updateUserProfile(user.uid, update);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrices = async () => {
    setSavingPrices(true);
    try {
      await setMembershipPrices(pricesDraft);
      setPrices(pricesDraft);
      setEditingPrices(false);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to save prices.');
    } finally {
      setSavingPrices(false);
    }
  };

  const handleCancelPrices = () => {
    setPricesDraft(prices);
    setEditingPrices(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {firstName ? firstName[0].toUpperCase() : '?'}
              </Text>
            </View>
            <Text style={styles.avatarName}>
              {[firstName, lastName].filter(Boolean).join(' ') || 'Your Name'}
            </Text>
            <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
              <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>
                {isAdmin ? 'Admin' : 'Member'}
              </Text>
            </View>
          </View>

          {/* Profile section */}
          <Text style={styles.sectionLabel}>Profile</Text>
          <View style={styles.card}>
            <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" />
            <View style={styles.fieldDivider} />
            <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Last name" />
            {isAdmin && (
              <>
                <View style={styles.fieldDivider} />
                <Field label="Email" value={email} onChange={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
                <View style={styles.fieldDivider} />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
              </>
            )}
          </View>

          {success && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text style={styles.successText}>Profile updated successfully.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>

          {/* Membership Prices — admin only */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Membership Prices</Text>
              <View style={styles.card}>
                <View style={styles.priceHeader}>
                  <Text style={styles.priceHeaderLabel}>Per Month</Text>
                  {!editingPrices ? (
                    <TouchableOpacity onPress={() => setEditingPrices(true)}>
                      <Text style={styles.editLink}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.priceActions}>
                      <TouchableOpacity onPress={handleCancelPrices} disabled={savingPrices}>
                        <Text style={styles.cancelLink}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleSavePrices} disabled={savingPrices}>
                        {savingPrices
                          ? <ActivityIndicator size="small" color={colors.secondary} />
                          : <Text style={styles.saveLink}>Save</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {MEMBERSHIP_OPTIONS.map(({ key, label, color }, i) => (
                  <React.Fragment key={key}>
                    {i > 0 && <View style={styles.fieldDivider} />}
                    <View style={styles.priceRow}>
                      <View style={[styles.membershipDot, { backgroundColor: `${color}22` }]}>
                        <Text style={[styles.membershipDotText, { color }]}>{label[0]}</Text>
                      </View>
                      <Text style={styles.priceLabel}>{label}</Text>
                      {editingPrices ? (
                        <View style={styles.priceInputWrap}>
                          <Text style={styles.currencySymbol}>$</Text>
                          <TextInput
                            style={styles.priceInput}
                            value={pricesDraft[key] === 0 ? '' : String(pricesDraft[key])}
                            onChangeText={v => {
                              const n = parseFloat(v);
                              setPricesDraft(p => ({ ...p, [key]: isNaN(n) ? 0 : n }));
                            }}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={colors.textDim}
                          />
                        </View>
                      ) : (
                        <Text style={styles.priceValue}>
                          {prices[key] > 0 ? `$${prices[key]}` : '—'}
                        </Text>
                      )}
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </>
          )}

          {/* Workout Access — admin only */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 4 }]}>Workout Access</Text>
              <View style={styles.card}>
                <View style={styles.accessHeader}>
                  <Ionicons name="barbell-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.priceHeaderLabel}>Allow access by plan</Text>
                  {savingAccess && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
                {MEMBERSHIP_OPTIONS.map(({ key, label, color }, i) => (
                  <React.Fragment key={key}>
                    {i > 0 && <View style={styles.fieldDivider} />}
                    <View style={styles.accessRow}>
                      <View style={[styles.membershipDot, { backgroundColor: `${color}22` }]}>
                        <Text style={[styles.membershipDotText, { color }]}>{label[0]}</Text>
                      </View>
                      <Text style={styles.priceLabel}>{label}</Text>
                      <Switch
                        value={workoutAccess[key]}
                        onValueChange={v => handleToggleAccess(key, v)}
                        trackColor={{ true: color, false: '#333' }}
                        thumbColor="#fff"
                        disabled={savingAccess}
                      />
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </>
          )}

        </ScrollView>
      )}
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        returnKeyType="done"
      />
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
  body: { padding: 20, paddingTop: 8 },
  avatarWrap: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.primary}33`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: colors.primary, fontSize: 28, fontWeight: '800' },
  avatarName: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  roleBadge: {
    backgroundColor: `${colors.primary}22`, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  roleBadgeAdmin: { backgroundColor: `${colors.secondary}22` },
  roleText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  roleTextAdmin: { color: colors.secondary },
  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginLeft: 2,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden', marginBottom: 20,
  },
  field: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  fieldLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', width: 80 },
  fieldInput: { flex: 1, color: colors.text, fontSize: 15 },
  fieldDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 16 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${colors.success}18`,
    borderWidth: 1, borderColor: `${colors.success}33`,
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  successText: { color: colors.success, fontSize: 13 },
  saveBtn: {
    height: 52, backgroundColor: colors.primary,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  priceHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  priceHeaderLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  editLink: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  priceActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  cancelLink: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  saveLink: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
  priceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  membershipDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  membershipDotText: { fontSize: 13, fontWeight: '800' },
  priceLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  priceValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 10, height: 38, gap: 2,
  },
  currencySymbol: { color: colors.textMuted, fontSize: 15 },
  priceInput: { color: colors.text, fontSize: 15, minWidth: 60 },
  accessHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  accessRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
});
