import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform, Switch, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { logOut } from '../services/auth';
import { getUserProfile, updateUserProfile } from '../services/users';
import { uploadProfilePhoto } from '../services/storage';
import { submitReferral } from '../services/referrals';
import {
  getMembershipPrices, setMembershipPrices, MembershipPrices,
  getWorkoutAccess, setWorkoutAccess, WorkoutAccess,
} from '../services/gymSettings';
import { colors } from '../theme/colors';
import dayjs from 'dayjs';

const MEMBERSHIP_OPTIONS: { key: keyof MembershipPrices; label: string; color: string }[] = [
  { key: 'basic',   label: 'Basic',   color: colors.primary },
  { key: 'premium', label: 'Premium', color: '#9B59B6' },
  { key: 'vip',     label: 'VIP',     color: '#FFD700' },
];

type SubSection = 'personal' | 'membership' | 'billing' | null;

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser!;

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [age, setAge]             = useState('');
  const [gender, setGender]       = useState('');
  const [weightKg, setWeightKg]   = useState('');
  const [membershipType, setMembershipType]             = useState('');
  const [photoURL, setPhotoURL]                         = useState<string | null>(null);
  const [uploading, setUploading]                       = useState(false);
  const [isActive, setIsActive]                         = useState(false);

  const [referModal, setReferModal]       = useState(false);
  const [refereeName, setRefereeName]     = useState('');
  const [refereeEmail, setRefereeEmail]   = useState('');
  const [refereePhone, setRefereePhone]   = useState('');
  const [referSubmitting, setReferSubmitting] = useState(false);
  const [referSuccess, setReferSuccess]   = useState(false);
  const [activationStartDate, setActivationStartDate]   = useState<string | null>(null);
  const [activationEndDate, setActivationEndDate]       = useState<string | null>(null);
  const [joinedAt, setJoinedAt]                         = useState<string | null>(null);
  const [original, setOriginal] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);

  const [prices, setPrices]         = useState<MembershipPrices>({ basic: 0, premium: 0, vip: 0 });
  const [pricesDraft, setPricesDraft] = useState<MembershipPrices>({ basic: 0, premium: 0, vip: 0 });
  const [editingPrices, setEditingPrices] = useState(false);
  const [savingPrices, setSavingPrices]   = useState(false);

  const [workoutAccess, setWorkoutAccessState] = useState<WorkoutAccess>({ basic: false, premium: true, vip: true });
  const [savingAccess, setSavingAccess]         = useState(false);

  const [infoExpanded, setInfoExpanded]         = useState(true);
  const [activeSubSection, setActiveSubSection] = useState<SubSection>(null);

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
      setPhotoURL(profile?.photoURL ?? user.photoURL ?? null);
      setIsActive(profile?.isActive ?? false);
      setActivationStartDate(profile?.activationStartDate ?? null);
      setActivationEndDate(profile?.activationEndDate ?? null);
      setJoinedAt(profile?.joinedAt ?? null);
      setOriginal({ firstName: fn, lastName: ln, email: em, phone: ph });

      const admin = profile?.role === 'admin';
      setIsAdmin(admin);

      const p = await getMembershipPrices();
      setPrices(p);
      setPricesDraft(p);
      if (admin) {
        const wa = await getWorkoutAccess();
        setWorkoutAccessState(wa);
      }
      setLoading(false);
    })();
  }, []);

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web') (window as any).alert(`${title}\n\n${msg}`);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) { notify('Missing field', 'First name is required.'); return; }
    setSaving(true); setSuccess(false);
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
      setOriginal({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() });
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

  const handleToggleAccess = async (key: keyof WorkoutAccess, value: boolean) => {
    const updated = { ...workoutAccess, [key]: value };
    setWorkoutAccessState(updated);
    setSavingAccess(true);
    try {
      await setWorkoutAccess(updated);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to save.');
      setWorkoutAccessState(workoutAccess);
    } finally {
      setSavingAccess(false);
    }
  };

  const handlePickPhoto = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadProfilePhoto(user.uid, file);
        await updateProfile(user, { photoURL: url });
        await updateUserProfile(user.uid, { photoURL: url });
        setPhotoURL(url);
      } catch (err: any) {
        notify('Upload failed', err.message ?? 'Could not upload photo.');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSubmitReferral = async () => {
    if (!refereeName.trim() || !refereeEmail.trim()) {
      notify('Missing fields', 'Name and email are required.');
      return;
    }
    setReferSubmitting(true);
    try {
      await submitReferral({
        referrerName: [firstName, lastName].filter(Boolean).join(' ') || user.email || '',
        referrerEmail: email || user.email || '',
        refereeName: refereeName.trim(),
        refereeEmail: refereeEmail.trim(),
        refereePhone: refereePhone.trim(),
      });
      setReferSuccess(true);
      setRefereeName(''); setRefereeEmail(''); setRefereePhone('');
      setTimeout(() => { setReferSuccess(false); setReferModal(false); }, 2000);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to submit referral.');
    } finally {
      setReferSubmitting(false);
    }
  };

  const toggleSub = (section: Exclude<SubSection, null>) =>
    setActiveSubSection(prev => prev === section ? null : section);

  const memberTypeCap = membershipType
    ? membershipType.charAt(0).toUpperCase() + membershipType.slice(1)
    : '';
  const heroBadgeLabel = isAdmin ? 'Admin' : memberTypeCap ? `${memberTypeCap} Member` : 'Member';
  const memberPlanPrice = membershipType ? prices[membershipType as keyof MembershipPrices] : null;

  return (
    <View style={styles.root}>

      {/* ── Hero ── */}
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
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickPhoto} activeOpacity={0.8}>
              <View style={styles.avatarRing}>
                {photoURL ? (
                  <Image source={{ uri: photoURL }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {firstName ? firstName[0].toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.cameraOverlay}>
                {uploading
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Ionicons name="camera" size={12} color="#000" />
                }
              </View>
            </TouchableOpacity>
            <Text style={styles.heroName}>
              {[firstName, lastName].filter(Boolean).join(' ') || 'Your Name'}
            </Text>
            <View style={[styles.heroBadge, isAdmin && styles.heroBadgeAdmin]}>
              <Text style={[styles.heroBadgeText, isAdmin && styles.heroBadgeTextAdmin]}>
                {heroBadgeLabel}
              </Text>
            </View>
          </>
        )}
      </View>

      {!loading && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* ── My Information accordion ── */}
          <View style={styles.menuCard}>

            {/* Accordion header */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => { setInfoExpanded(e => !e); if (infoExpanded) setActiveSubSection(null); }}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.primary }]}>My Information</Text>
              <Ionicons name={infoExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
            </TouchableOpacity>

            {infoExpanded && (
              <>
                {/* ── My Personal Info ── */}
                <View style={styles.menuSubDivider} />
                <TouchableOpacity style={styles.subRow} onPress={() => toggleSub('personal')}>
                  <Text style={styles.subLabel}>My Personal Info</Text>
                  <Ionicons
                    name={activeSubSection === 'personal' ? 'chevron-down' : 'chevron-forward'}
                    size={16} color={colors.textMuted}
                  />
                </TouchableOpacity>
                {activeSubSection === 'personal' && (
                  <View style={styles.subContent}>
                    <View style={styles.subFormCard}>
                      <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" />
                      <View style={styles.fieldDivider} />
                      <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Last name" />
                      {isAdmin ? (
                        <>
                          <View style={styles.fieldDivider} />
                          <Field label="Email" value={email} onChange={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
                          <View style={styles.fieldDivider} />
                          <Field label="Phone" value={phone} onChange={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
                        </>
                      ) : (
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
                    {success && (
                      <View style={styles.successBox}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                        <Text style={styles.successText}>Saved successfully.</Text>
                      </View>
                    )}
                    <View style={styles.subActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => { setFirstName(original.firstName); setLastName(original.lastName); setEmail(original.email); setPhone(original.phone); }}
                        disabled={saving}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSaveProfile} disabled={saving}
                      >
                        {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ── My Membership ── */}
                <View style={styles.menuSubDivider} />
                <TouchableOpacity style={styles.subRow} onPress={() => toggleSub('membership')}>
                  <Text style={styles.subLabel}>My Membership</Text>
                  <Ionicons
                    name={activeSubSection === 'membership' ? 'chevron-down' : 'chevron-forward'}
                    size={16} color={colors.textMuted}
                  />
                </TouchableOpacity>
                {activeSubSection === 'membership' && (
                  <View style={styles.subContent}>
                    {isAdmin ? (
                      <>
                        <View style={styles.subFormCard}>
                          <View style={[styles.gridRow, styles.gridHeaderRow]}>
                            <Text style={[styles.colHeader, styles.col1]}>Plan</Text>
                            <View style={[styles.col2, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                              <Text style={styles.colHeader}>Price</Text>
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
                                <View style={[styles.col1, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
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
                        {editingPrices && (
                          <View style={styles.subActions}>
                            <TouchableOpacity
                              style={styles.cancelBtn}
                              onPress={() => { setPricesDraft(prices); setEditingPrices(false); }}
                              disabled={savingPrices}
                            >
                              <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.saveBtn, savingPrices && styles.saveBtnDisabled]}
                              onPress={handleSavePrices} disabled={savingPrices}
                            >
                              {savingPrices ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveBtnText}>Save Prices</Text>}
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.subFormCard}>
                        <InfoRow label="Plan" value={memberTypeCap || '—'} />
                        <View style={styles.fieldDivider} />
                        <InfoRow label="Status" value={isActive ? 'Active' : 'Inactive'} valueColor={isActive ? colors.success : colors.error} />
                        <View style={styles.fieldDivider} />
                        <InfoRow label="Start" value={activationStartDate ? dayjs(activationStartDate).format('DD MMM YYYY') : '—'} />
                        <View style={styles.fieldDivider} />
                        <InfoRow label="Expiry" value={activationEndDate ? dayjs(activationEndDate).format('DD MMM YYYY') : '—'} />
                        {joinedAt && (
                          <>
                            <View style={styles.fieldDivider} />
                            <InfoRow label="Joined" value={dayjs(joinedAt).format('DD MMM YYYY')} />
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* ── My Billing Info ── */}
                <View style={styles.menuSubDivider} />
                <TouchableOpacity style={styles.subRow} onPress={() => toggleSub('billing')}>
                  <Text style={styles.subLabel}>My Billing Info</Text>
                  <Ionicons
                    name={activeSubSection === 'billing' ? 'chevron-down' : 'chevron-forward'}
                    size={16} color={colors.textMuted}
                  />
                </TouchableOpacity>
                {activeSubSection === 'billing' && (
                  <View style={styles.subContent}>
                    <View style={styles.subFormCard}>
                      {isAdmin ? (
                        <>
                          <InfoRow label="Role" value="Administrator" />
                          <View style={styles.fieldDivider} />
                          <InfoRow label="Billing" value="N/A" />
                        </>
                      ) : (
                        <>
                          <InfoRow label="Plan" value={memberTypeCap || '—'} />
                          <View style={styles.fieldDivider} />
                          <InfoRow
                            label="Monthly fee"
                            value={memberPlanPrice != null && memberPlanPrice > 0 ? `$${memberPlanPrice}` : '—'}
                            valueColor={colors.secondary}
                          />
                          <View style={styles.fieldDivider} />
                          <InfoRow
                            label="Next renewal"
                            value={activationEndDate ? dayjs(activationEndDate).format('DD MMM YYYY') : '—'}
                          />
                        </>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* ── Other rows ── */}
          <View style={[styles.menuCard, { marginTop: 12 }]}>

            <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('MemberInbox' as never)}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="mail-outline" size={22} color={colors.textMuted} />
              </View>
              <Text style={styles.menuLabel}>Inbox</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuRow} onPress={() => setReferModal(true)}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="gift-outline" size={22} color={colors.textMuted} />
              </View>
              <Text style={styles.menuLabel}>Refer a Friend</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuRow} onPress={() => notify('Legal', 'Coming soon.')}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="document-text-outline" size={22} color={colors.textMuted} />
              </View>
              <Text style={styles.menuLabel}>Legal</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuRow} onPress={logOut}>
              <View style={[styles.menuIconWrap, { backgroundColor: `${colors.error}15` }]}>
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.error }]}>Log Out</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.error} style={{ opacity: 0.4 }} />
            </TouchableOpacity>

          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Refer a Friend Modal */}
      <Modal visible={referModal} transparent animationType="slide" onRequestClose={() => setReferModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReferModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refer a Friend</Text>
              <TouchableOpacity onPress={() => setReferModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Know someone who'd love to join? Enter their details below.</Text>

            <View style={styles.modalForm}>
              <TextInput
                style={styles.modalInput}
                placeholder="Full Name"
                placeholderTextColor={colors.textDim}
                value={refereeName}
                onChangeText={setRefereeName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Email Address"
                placeholderTextColor={colors.textDim}
                value={refereeEmail}
                onChangeText={setRefereeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number"
                placeholderTextColor={colors.textDim}
                value={refereePhone}
                onChangeText={setRefereePhone}
                keyboardType="phone-pad"
              />
            </View>

            {referSuccess && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                <Text style={styles.successText}>Referral submitted successfully!</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, referSubmitting && styles.saveBtnDisabled]}
              onPress={handleSubmitReferral}
              disabled={referSubmitting}
            >
              {referSubmitting
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.saveBtnText}>Submit Referral</Text>
              }
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize, editable = true,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; autoCapitalize?: any; editable?: boolean;
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

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
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
    width: '100%', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 20,
  },
  heroNavBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 76, height: 76, borderRadius: 38 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: colors.primary, fontSize: 28, fontWeight: '800' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  heroName: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  heroBadge: {
    backgroundColor: `${colors.primary}20`, borderRadius: 20,
    borderWidth: 1, borderColor: `${colors.primary}40`,
    paddingHorizontal: 16, paddingVertical: 5,
  },
  heroBadgeAdmin: { backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}40` },
  heroBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  heroBadgeTextAdmin: { color: colors.secondary },

  /* Body */
  body: { padding: 16, paddingTop: 20 },

  /* Menu card */
  menuCard: {
    backgroundColor: colors.surface, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 66 },
  menuSubDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  /* Sub-rows (inside accordion) */
  subRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 66, paddingRight: 16, paddingVertical: 14,
  },
  subLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },

  /* Sub-content (expanded form area) */
  subContent: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  subFormCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden', marginBottom: 12,
  },
  subActions: { flexDirection: 'row', gap: 10, marginTop: 4 },

  /* Form field rows */
  field: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  fieldLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', width: 82 },
  fieldInput: { flex: 1, color: colors.text, fontSize: 15 },
  fieldValue: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  fieldDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 14 },

  /* Membership pricing grid */
  colHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  gridRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  gridHeaderRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingVertical: 9 },
  col1: { flex: 2 },
  col2: { flex: 2 },
  col3: { flex: 1 },
  planName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  membershipDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  membershipDotText: { fontSize: 12, fontWeight: '800' },
  priceValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  editLink: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 8, height: 34, gap: 2, width: 80,
  },
  currencySymbol: { color: colors.textMuted, fontSize: 14 },
  priceInput: { color: colors.text, fontSize: 14, width: 52 },

  /* Success */
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${colors.success}18`,
    borderWidth: 1, borderColor: `${colors.success}33`,
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
  successText: { color: colors.success, fontSize: 13 },

  /* Save / Cancel buttons */
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
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },

  /* Refer a Friend Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  modalSub: { color: colors.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 19 },
  modalForm: { gap: 12, marginBottom: 20 },
  modalInput: {
    backgroundColor: colors.bg, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 14,
    color: colors.text, fontSize: 15,
  },
});
