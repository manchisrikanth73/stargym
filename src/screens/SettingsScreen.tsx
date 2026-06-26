import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { logOut } from '../services/auth';
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
  const [weightKg, setWeightKg]   = useState('');
  const [membershipType, setMembershipType] = useState('');
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
      setWeightKg(profile?.weightKg != null ? String(profile.weightKg) : '');
      setMembershipType(profile?.membershipType ?? '');
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
      const update: Record<string, any> = { displayName };
      if (isAdmin) {
        update.email = email.trim();
        update.phone = phone.trim();
      } else {
        update.weightKg = weightKg.trim() ? parseFloat(weightKg.trim()) : null;
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

  const badgeLabel = isAdmin
    ? 'Admin'
    : membershipType
      ? `${membershipType.charAt(0).toUpperCase()}${membershipType.slice(1)} Member`
      : 'Member';

  return (
    <View style={styles.root}>
      {/* Hero Header */}
      <View style={styles.hero}>
        <View style={styles.heroNav}>
          {isAdmin ? (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.heroNavBtn}>
              <Ionicons name="menu" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroNavBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.heroTitle}>My Account</Text>
          <View style={styles.heroNavBtn} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : (
          <>
            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {firstName ? firstName[0].toUpperCase() : '?'}
                </Text>
              </View>
            </View>
            <Text style={styles.heroName}>
              {[firstName, lastName].filter(Boolean).join(' ') || 'Your Name'}
            </Text>
            <View style={[styles.heroBadge, isAdmin && styles.heroBadgeAdmin]}>
              <Text style={[styles.heroBadgeText, isAdmin && styles.heroBadgeTextAdmin]}>
                {badgeLabel}
              </Text>
            </View>
          </>
        )}
      </View>

      {!loading && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

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
                <View style={styles.fieldDivider} />
                <Field label="Weight (kg)" value={weightKg} onChange={t => setWeightKg(t.replace(/[^0-9.]/g, ''))} placeholder="e.g. 75" keyboardType="decimal-pad" autoCapitalize="none" />
              </>
            )}
          </View>

          {/* Membership Config — admin only */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Membership</Text>
              <View style={styles.card}>
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
                      <View style={[styles.col1, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                        <View style={[styles.membershipDot, { backgroundColor: `${color}22` }]}>
                          <Text style={[styles.membershipDotText, { color }]}>{label[0]}</Text>
                        </View>
                        <Text style={styles.planName}>{label}</Text>
                      </View>

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

          {/* Save / Cancel */}
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

          {/* Logout row */}
          <TouchableOpacity style={styles.logoutRow} onPress={logOut}>
            <View style={styles.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>Log Out</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.error} style={{ opacity: 0.6 }} />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
    <View style={[styles.field, !editable && { opacity: 0.5 }]}>
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

  /* Hero */
  hero: {
    backgroundColor: colors.surface,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: `${colors.primary}22`,
  },
  heroNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 20,
  },
  heroNavBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: colors.primary, fontSize: 28, fontWeight: '800' },
  heroName: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  heroBadge: {
    backgroundColor: `${colors.primary}20`,
    borderRadius: 20, borderWidth: 1, borderColor: `${colors.primary}40`,
    paddingHorizontal: 16, paddingVertical: 5,
  },
  heroBadgeAdmin: {
    backgroundColor: `${colors.secondary}20`,
    borderColor: `${colors.secondary}40`,
  },
  heroBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  heroBadgeTextAdmin: { color: colors.secondary },

  /* Body */
  body: { padding: 20, paddingTop: 24 },
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

  /* Membership grid */
  colHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  membershipDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  membershipDotText: { fontSize: 13, fontWeight: '800' },
  priceValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  editLink: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 8, height: 34, gap: 2,
    width: 80,
  },
  currencySymbol: { color: colors.textMuted, fontSize: 14 },
  priceInput: { color: colors.text, fontSize: 14, width: 52 },

  /* Success */
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${colors.success}18`,
    borderWidth: 1, borderColor: `${colors.success}33`,
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  successText: { color: colors.success, fontSize: 13 },

  /* Actions */
  bottomActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
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

  /* Logout row */
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1,
    borderColor: `${colors.error}33`,
    paddingHorizontal: 16, paddingVertical: 16,
    marginTop: 24,
  },
  logoutIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: `${colors.error}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { flex: 1, color: colors.error, fontSize: 15, fontWeight: '700' },
});
