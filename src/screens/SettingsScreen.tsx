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
  const [age, setAge]             = useState('');
  const [gender, setGender]       = useState('');
  const [original, setOriginal] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const [prices, setPrices] = useState<MembershipPrices>({ basic: 0, premium: 0, vip: 0 });
  const [pricesDraft, setPricesDraft] = useState<MembershipPrices>({ basic: 0, premium: 0, vip: 0 });
  const [editingPrices, setEditingPrices] = useState(false);

  const [workoutAccess, setWorkoutAccessState] = useState<WorkoutAccess>({ basic: false, premium: true, vip: true });
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile(user.uid);
      const parts = (profile?.displayName ?? user.displayName ?? '').split(' ');
      const fn = parts[0] ?? '';
      const ln = parts.slice(1).join(' ');
      const em = profile?.email ?? user.email ?? '';
      const ph = profile?.phone ?? '';
      setFirstName(fn); setLastName(ln); setEmail(em); setPhone(ph);
      setAge(profile?.age != null ? String(profile.age) : '');
      setGender(profile?.gender ?? '');
      setOriginal({ firstName: fn, lastName: ln, email: em, phone: ph });
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
      if (isAdmin && editingPrices) {
        await setMembershipPrices(pricesDraft);
        setPrices(pricesDraft);
        setEditingPrices(false);
      }
      setOriginal({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Settings</Text>
        <TouchableOpacity style={styles.backDashBtn} onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}>
          <Ionicons name="home-outline" size={14} color={colors.textMuted} />
          <Text style={styles.backDashText}>Dashboard</Text>
        </TouchableOpacity>
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
            {!isAdmin && (
              <>
                <View style={styles.fieldDivider} />
                <Field label="Age" value={age || '—'} onChange={() => {}} editable={false} />
                <View style={styles.fieldDivider} />
                <Field label="Gender" value={gender || '—'} onChange={() => {}} editable={false} />
              </>
            )}
          </View>

          {/* Membership Config — admin only */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Membership</Text>
              <View style={styles.card}>
                {/* Column header row */}
                <View style={[styles.gridRow, styles.gridHeaderRow]}>
                  <Text style={[styles.colHeader, styles.col1]}>Plan Type</Text>
                  <View style={[styles.col2, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    <Text style={styles.colHeader}>Plan Price</Text>
                  </View>
                  <View style={[styles.col3, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}>
                    <Text style={styles.colHeader}>Workout</Text>
                    {savingAccess && <ActivityIndicator size="small" color={colors.primary} />}
                  </View>
                </View>

                {MEMBERSHIP_OPTIONS.map(({ key, label, color }, i) => (
                  <React.Fragment key={key}>
                    {i > 0 && <View style={styles.fieldDivider} />}
                    <View style={styles.gridRow}>
                      {/* Col 1 – Plan Type */}
                      <View style={[styles.col1, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                        <View style={[styles.membershipDot, { backgroundColor: `${color}22` }]}>
                          <Text style={[styles.membershipDotText, { color }]}>{label[0]}</Text>
                        </View>
                        <Text style={styles.planName}>{label}</Text>
                      </View>

                      {/* Col 2 – Plan Price + Edit */}
                      <View style={[styles.col2, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
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
                          <>
                            <Text style={styles.priceValue}>
                              {prices[key] > 0 ? `$${prices[key]}` : '—'}
                            </Text>
                            <TouchableOpacity onPress={() => setEditingPrices(true)}>
                              <Text style={styles.editLink}>Edit</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      {/* Col 3 – Workout toggle */}
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
            </>
          )}

          {/* Success banner */}
          {success && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text style={styles.successText}>All changes applied successfully.</Text>
            </View>
          )}

          {/* Bottom action buttons */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setFirstName(original.firstName);
                setLastName(original.lastName);
                setEmail(original.email);
                setPhone(original.phone);
                if (isAdmin && editingPrices) {
                  setPricesDraft(prices);
                  setEditingPrices(false);
                }
              }}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
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
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize, editable = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  editable?: boolean;
}) {
  return (
    <View style={[styles.field, !editable && { opacity: 0.6 }]}>
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
        editable={editable}
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
  backDashBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  backDashText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
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
  bottomActions: {
    flexDirection: 'row', gap: 12, marginTop: 28,
  },
  cancelBtn: {
    flex: 1, height: 52, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  saveBtn: {
    flex: 2, height: 52, backgroundColor: colors.primary,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  priceHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  colHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  priceColLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 },
  workoutColHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 72, justifyContent: 'flex-end' },
  priceHeaderLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  editLink: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  priceActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  cancelLink: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  saveLink: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
  gridRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  gridHeaderRow: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
  },
  col1: { flex: 2 },
  col2: { flex: 2 },
  col3: { flex: 1 },
  planName: { color: colors.text, fontSize: 14, fontWeight: '600' },
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
    paddingHorizontal: 8, height: 34, gap: 2,
    width: 80,
  },
  currencySymbol: { color: colors.textMuted, fontSize: 14 },
  priceInput: { color: colors.text, fontSize: 14, width: 52 },
  priceFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 20,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
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
