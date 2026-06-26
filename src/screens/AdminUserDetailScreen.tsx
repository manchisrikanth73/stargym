import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { createUserProfile, updateUserProfile, disableMember, enableMember, UserProfile, MembershipType } from '../services/users';
import { getMembershipPrices } from '../services/gymSettings';
import {
  SubscriptionStatus, PaymentEvent,
  getPaymentStatus, getPaymentHistory,
  createSubscription, cancelSubscription,
  pauseSubscription, resumeSubscription,
} from '../services/payments';
import DateInput from '../components/DateInput';
import { colors } from '../theme/colors';

type RouteParams = {
  AdminUserDetail: { user: UserProfile | null };
};

const MEMBERSHIP_OPTIONS: MembershipType[] = ['basic', 'premium', 'vip'];
const MEMBERSHIP_COLORS: Record<MembershipType, string> = {
  basic: colors.primary,
  premium: '#9B59B6',
  vip: '#FFD700',
};

type PromoFeature = { key: string; label: string; profileField: 'promoWorkoutExpiry' };
const PROMO_FEATURES: PromoFeature[] = [
  { key: 'workout', label: 'Workouts', profileField: 'promoWorkoutExpiry' },
];

export default function AdminUserDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'AdminUserDetail'>>();
  const existing = route.params?.user ?? null;
  const isNew = !existing;

  const [displayName, setDisplayName] = useState(existing?.displayName ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [age, setAge] = useState(existing?.age != null ? String(existing.age) : '');
  const [gender, setGender] = useState(existing?.gender ?? '');
  const [weightKg, setWeightKg] = useState(existing?.weightKg != null ? String(existing.weightKg) : '');
  const [membershipType, setMembershipType] = useState<MembershipType>(existing?.membershipType ?? 'basic');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [activationStartDate, setActivationStartDate] = useState(existing?.activationStartDate ?? '');
  const [activationEndDate, setActivationEndDate]     = useState(existing?.activationEndDate ?? '');
  const [promoDays, setPromoDays] = useState('');
  const [selectedPromo, setSelectedPromo] = useState<string>(PROMO_FEATURES[0].key);
  const [promoDropdownOpen, setPromoDropdownOpen] = useState(false);
  const [promoExpiries, setPromoExpiries] = useState<Record<string, string | null>>({
    workout: existing?.promoWorkoutExpiry ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [memberPrice, setMemberPrice] = useState(0);
  const [payStatus, setPayStatus] = useState<SubscriptionStatus | null>(null);
  const [payHistory, setPayHistory] = useState<PaymentEvent[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [payActionLoading, setPayActionLoading] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setPayLoading(true);
    Promise.all([
      getPaymentStatus(existing.uid),
      getPaymentHistory(existing.uid),
      getMembershipPrices(),
    ]).then(([status, history, prices]) => {
      setPayStatus(status);
      setPayHistory(history);
      setMemberPrice(prices[membershipType] ?? 0);
    }).catch(() => {}).finally(() => setPayLoading(false));
  }, [existing?.uid]);

  const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

  const validate = () => {
    const warn = (msg: string) => Platform.OS === 'web' ? (window as any).alert(msg) : Alert.alert('Required', msg);
    if (!displayName.trim()) { warn("Please enter the member's name."); return false; }
    if (isNew && !email.trim()) { warn("Please enter the member's email."); return false; }
    if (!activationStartDate.trim()) { warn('Activation start date is required.'); return false; }
    return true;
  };

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      (window as any).alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const isPendingDeletion = !!existing?.scheduledDeleteAt;

  const handleDisable = async () => {
    const name = displayName.trim() || 'this member';
    const confirmed = Platform.OS === 'web'
      ? (window as any).confirm(`Disable ${name}?\n\nThey will be automatically removed after 60 days.`)
      : true;
    if (!confirmed) return;
    setDisabling(true);
    try {
      await disableMember(existing!.uid);
      navigation.goBack();
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to disable member.');
    } finally {
      setDisabling(false);
    }
  };

  const handleEnable = async () => {
    setDisabling(true);
    try {
      await enableMember(existing!.uid);
      navigation.goBack();
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to enable member.');
    } finally {
      setDisabling(false);
    }
  };

  const handleGrantPromo = async () => {
    const days = parseInt(promoDays.trim(), 10);
    if (!days || days < 1) { notify('Invalid', 'Enter a number of days (minimum 1).'); return; }
    const feature = PROMO_FEATURES.find(f => f.key === selectedPromo)!;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    const expiryStr = expiry.toISOString().slice(0, 10);
    try {
      await updateUserProfile(existing!.uid, { [feature.profileField]: expiryStr });
      setPromoExpiries(prev => ({ ...prev, [selectedPromo]: expiryStr }));
      setPromoDays('');
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to grant promo access.');
    }
  };

  const handleRevokePromo = async (key: string) => {
    const feature = PROMO_FEATURES.find(f => f.key === key)!;
    try {
      await updateUserProfile(existing!.uid, { [feature.profileField]: null });
      setPromoExpiries(prev => ({ ...prev, [key]: null }));
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to revoke promo access.');
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const endDate = activationEndDate.trim() || null;
      const today = new Date().toISOString().slice(0, 10);
      const resolvedActive = endDate
        ? endDate >= today
        : isActive;
      const dates = {
        activationStartDate: activationStartDate.trim() || null,
        activationEndDate: endDate,
      };
      const parsedAge = age.trim() ? parseInt(age.trim(), 10) : null;
      const parsedWeightKg = weightKg.trim() ? parseFloat(weightKg.trim()) : null;
      const personalData = {
        age: parsedAge,
        gender: gender || null,
        weightKg: parsedWeightKg,
      };
      if (isNew) {
        const placeholderId = `manual_${Date.now()}`;
        await createUserProfile(placeholderId, email.trim(), displayName.trim(), parsedAge, gender, parsedWeightKg);
        await updateUserProfile(placeholderId, { phone, membershipType, isActive: resolvedActive, ...dates });
      } else {
        await updateUserProfile(existing!.uid, { displayName: displayName.trim(), email: email.trim(), phone, membershipType, isActive: resolvedActive, ...dates, ...personalData });
      }
      navigation.goBack();
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const payStatusColor = (s: string | null | undefined) => {
    const map: Record<string, string> = {
      active: colors.success, pending: colors.secondary, paused: '#9B59B6',
      cancelled: colors.textDim, halted: colors.error, completed: colors.textDim,
    };
    return map[s ?? ''] ?? colors.textDim;
  };

  const handleSetupAutoPay = async () => {
    setPayActionLoading(true);
    try {
      const { shortUrl } = await createSubscription(existing!.uid, membershipType, memberPrice);
      if (typeof window !== 'undefined') window.open(shortUrl, '_blank');
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to create subscription.');
    } finally {
      setPayActionLoading(false);
    }
  };

  const handlePauseSubscription = async () => {
    setPayActionLoading(true);
    try {
      await pauseSubscription(existing!.uid);
      setPayStatus(prev => prev ? { ...prev, mandateStatus: 'paused' } : prev);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to pause subscription.');
    } finally {
      setPayActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setPayActionLoading(true);
    try {
      await resumeSubscription(existing!.uid);
      setPayStatus(prev => prev ? { ...prev, mandateStatus: 'active' } : prev);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to resume subscription.');
    } finally {
      setPayActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = Platform.OS === 'web'
      ? (window as any).confirm('Cancel this subscription? The member will not be billed again.')
      : true;
    if (!confirmed) return;
    setPayActionLoading(true);
    try {
      await cancelSubscription(existing!.uid);
      setPayStatus(prev => prev ? { ...prev, mandateStatus: 'cancelled' } : prev);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to cancel subscription.');
    } finally {
      setPayActionLoading(false);
    }
  };

  const canSetup = !payStatus?.mandateStatus
    || payStatus.mandateStatus === 'cancelled'
    || payStatus.mandateStatus === 'completed';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>{isNew ? 'Add Member' : 'Edit Member'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Avatar preview */}
      <View style={styles.avatarPreview}>
        <View style={[styles.avatar, { backgroundColor: `${MEMBERSHIP_COLORS[membershipType]}33` }]}>
          <Text style={[styles.avatarText, { color: MEMBERSHIP_COLORS[membershipType] }]}>
            {displayName ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'}
          </Text>
        </View>
        <Text style={styles.avatarName}>{displayName || 'New Member'}</Text>
      </View>

      {/* Fields */}
      <View style={styles.section}>
        <Label>Full Name</Label>
        <Field icon="person-outline" placeholder="e.g. John Doe" value={displayName} onChangeText={setDisplayName} />

        <Label>Email</Label>
        <Field
          icon="mail-outline"
          placeholder="member@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Label>Phone</Label>
        <Field icon="call-outline" placeholder="+1 234 567 8900" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Label>Age</Label>
        <Field icon="person-outline" placeholder="e.g. 25" value={age} onChangeText={t => setAge(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />

        <Label>Gender</Label>
        <View style={styles.optionRow}>
          {GENDER_OPTIONS.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.optionBtn, gender === g && { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}
              onPress={() => setGender(gender === g ? '' : g)}
            >
              <Text style={[styles.optionText, gender === g && { color: colors.primary }]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Label>Weight (kg)</Label>
        <Field icon="barbell-outline" placeholder="e.g. 75" value={weightKg} onChangeText={t => setWeightKg(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
      </View>

      {/* Membership type */}
      <View style={styles.section}>
        <Label>Membership</Label>
        <View style={styles.optionRow}>
          {MEMBERSHIP_OPTIONS.map(opt => {
            const color = MEMBERSHIP_COLORS[opt];
            const selected = membershipType === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.optionBtn, selected && { backgroundColor: `${color}22`, borderColor: color }]}
                onPress={() => setMembershipType(opt)}
              >
                <Text style={[styles.optionText, selected && { color }]}>{opt.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Activation Dates */}
      <View style={styles.section}>
        <DateInput
          label="Activation Start Date"
          value={activationStartDate}
          onChange={setActivationStartDate}
          required
        />
        <DateInput
          label="Activation End Date (blank = open-ended)"
          value={activationEndDate}
          onChange={setActivationEndDate}
        />
      </View>

      {/* Promo Access — existing members only */}
      {!isNew && (
        <View style={styles.section}>
          <Label>Promo Access</Label>
          <View style={styles.promoGrantRow}>
            {/* Feature dropdown */}
            <View style={styles.promoDropdownWrap}>
              <TouchableOpacity
                style={styles.promoDropdown}
                onPress={() => setPromoDropdownOpen(o => !o)}
                activeOpacity={0.8}
              >
                <Text style={styles.promoDropdownText}>
                  {PROMO_FEATURES.find(f => f.key === selectedPromo)?.label}
                </Text>
                <Ionicons name={promoDropdownOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
              </TouchableOpacity>
              {promoDropdownOpen && (
                <View style={styles.promoDropdownMenu}>
                  {PROMO_FEATURES.map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={styles.promoDropdownItem}
                      onPress={() => { setSelectedPromo(f.key); setPromoDropdownOpen(false); }}
                    >
                      <Text style={[styles.promoDropdownItemText, selectedPromo === f.key && { color: colors.primary }]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {/* Days input */}
            <View style={styles.promoDaysWrap}>
              <TextInput
                style={styles.promoDaysInput}
                placeholder="Days"
                placeholderTextColor={colors.textMuted}
                value={promoDays}
                onChangeText={t => setPromoDays(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />
            </View>
            {/* Grant button */}
            <TouchableOpacity style={styles.promoGrantBtn} onPress={handleGrantPromo}>
              <Ionicons name="gift-outline" size={15} color="#000" />
              <Text style={styles.promoGrantBtnText}>Grant</Text>
            </TouchableOpacity>
          </View>

          {/* Active promo list */}
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            return PROMO_FEATURES.filter(f => promoExpiries[f.key]).map(f => {
              const expiry = promoExpiries[f.key]!;
              const active = expiry >= today;
              return (
                <View key={f.key} style={[styles.promoActiveRow, { marginTop: 10 }]}>
                  <Ionicons name="gift-outline" size={14} color={active ? colors.secondary : colors.textDim} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoActiveFeature}>{f.label}</Text>
                    <Text style={[styles.promoActiveLabel, !active && { color: colors.textDim }]}>
                      {active ? `Active · expires ${expiry}` : `Expired ${expiry}`}
                    </Text>
                  </View>
                  {active && (
                    <TouchableOpacity style={styles.promoRevokeBtn} onPress={() => handleRevokePromo(f.key)}>
                      <Ionicons name="close-circle-outline" size={15} color={colors.error} />
                      <Text style={styles.promoRevokeBtnText}>Revoke</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            });
          })()}
        </View>
      )}

      {/* Payment */}
      {!isNew && (
        <View style={styles.section}>
          <Label>Payment</Label>
          {payLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <View style={styles.payStatusRow}>
                <View style={[styles.statusChip, { backgroundColor: `${payStatusColor(payStatus?.mandateStatus)}22` }]}>
                  <View style={[styles.statusDot, { backgroundColor: payStatusColor(payStatus?.mandateStatus) }]} />
                  <Text style={[styles.statusChipText, { color: payStatusColor(payStatus?.mandateStatus) }]}>
                    {payStatus?.mandateStatus ? payStatus.mandateStatus.toUpperCase() : 'NOT SET UP'}
                  </Text>
                </View>
                {payStatus?.amount != null && (
                  <Text style={styles.payAmount}>₹{payStatus.amount.toLocaleString('en-IN')}/mo</Text>
                )}
              </View>

              {!!payStatus?.nextBillingDate && (
                <Text style={styles.payMeta}>Next billing: {payStatus.nextBillingDate}</Text>
              )}
              {!!payStatus?.graceUntil && (
                <Text style={[styles.payMeta, { color: colors.error }]}>Grace period until: {payStatus.graceUntil}</Text>
              )}
              {(payStatus?.failedPaymentCount ?? 0) > 0 && (
                <Text style={[styles.payMeta, { color: colors.error }]}>
                  Failed payments: {payStatus!.failedPaymentCount}
                </Text>
              )}

              <View style={styles.payActions}>
                {canSetup && (
                  <TouchableOpacity
                    style={[styles.payBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={handleSetupAutoPay}
                    disabled={payActionLoading || memberPrice <= 0}
                  >
                    {payActionLoading
                      ? <ActivityIndicator color="#000" size="small" />
                      : <>
                          <Ionicons name="card-outline" size={15} color="#000" />
                          <Text style={styles.payBtnDark}>Setup AutoPay</Text>
                        </>
                    }
                  </TouchableOpacity>
                )}
                {payStatus?.mandateStatus === 'active' && (
                  <TouchableOpacity
                    style={[styles.payBtn, { borderColor: '#9B59B644', backgroundColor: '#9B59B611' }]}
                    onPress={handlePauseSubscription}
                    disabled={payActionLoading}
                  >
                    <Ionicons name="pause-circle-outline" size={15} color="#9B59B6" />
                    <Text style={[styles.payBtnLabel, { color: '#9B59B6' }]}>Pause</Text>
                  </TouchableOpacity>
                )}
                {payStatus?.mandateStatus === 'paused' && (
                  <TouchableOpacity
                    style={[styles.payBtn, { borderColor: `${colors.success}44`, backgroundColor: `${colors.success}11` }]}
                    onPress={handleResumeSubscription}
                    disabled={payActionLoading}
                  >
                    <Ionicons name="play-circle-outline" size={15} color={colors.success} />
                    <Text style={[styles.payBtnLabel, { color: colors.success }]}>Resume</Text>
                  </TouchableOpacity>
                )}
                {(payStatus?.mandateStatus === 'active' || payStatus?.mandateStatus === 'paused') && (
                  <TouchableOpacity
                    style={[styles.payBtn, { borderColor: `${colors.error}44`, backgroundColor: `${colors.error}11` }]}
                    onPress={handleCancelSubscription}
                    disabled={payActionLoading}
                  >
                    <Ionicons name="close-circle-outline" size={15} color={colors.error} />
                    <Text style={[styles.payBtnLabel, { color: colors.error }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>

              {payHistory.length > 0 && (
                <View style={styles.payHistory}>
                  <Text style={styles.payHistoryHeading}>Recent Payments</Text>
                  {payHistory.slice(0, 5).map(e => {
                    const isSuccess = e.status === 'captured' || e.eventType === 'subscription.charged';
                    const isFailed = e.status === 'failed';
                    return (
                      <View key={e.id} style={styles.payHistoryRow}>
                        <Ionicons
                          name={isSuccess ? 'checkmark-circle' : isFailed ? 'close-circle' : 'time'}
                          size={14}
                          color={isSuccess ? colors.success : isFailed ? colors.error : colors.textDim}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.payHistoryEvent}>
                            {e.eventType.replace('subscription.', '').replace('payment.', '')}
                          </Text>
                          {!!e.createdAt && (
                            <Text style={styles.payHistoryDate}>{e.createdAt.slice(0, 10)}</Text>
                          )}
                        </View>
                        {e.amount != null && (
                          <Text style={styles.payHistoryAmount}>₹{e.amount.toLocaleString('en-IN')}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Active toggle */}
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Active Member</Text>
            <Text style={styles.toggleSub}>
              {activationEndDate
                ? activationEndDate >= new Date().toISOString().slice(0, 10)
                  ? 'Auto-activated — end date is in the future'
                  : 'Auto-deactivated — end date has passed'
                : 'Inactive members can\'t check in'}
            </Text>
          </View>
          <Switch
            value={activationEndDate
              ? activationEndDate >= new Date().toISOString().slice(0, 10)
              : isActive}
            onValueChange={activationEndDate ? undefined : setIsActive}
            disabled={!!activationEndDate}
            trackColor={{ true: colors.primary, false: '#333' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
            <Text style={styles.saveBtnText}>{isNew ? 'Add Member' : 'Save Changes'}</Text>
          </>
        )}
      </TouchableOpacity>

      {!isNew && (
        isPendingDeletion ? (
          <TouchableOpacity style={styles.enableBtn} onPress={handleEnable} disabled={disabling}>
            {disabling ? (
              <ActivityIndicator color={colors.success} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <Text style={styles.enableBtnText}>Enable Member</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.disableBtn} onPress={handleDisable} disabled={disabling}>
            {disabling ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <>
                <Ionicons name="ban-outline" size={18} color={colors.error} />
                <Text style={styles.disableBtnText}>Disable Member</Text>
              </>
            )}
          </TouchableOpacity>
        )
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Field({
  icon, placeholder, value, onChangeText, keyboardType, editable = true, autoCapitalize,
}: {
  icon: string; placeholder: string; value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any; editable?: boolean; autoCapitalize?: any;
}) {
  return (
    <View style={[styles.inputWrap, !editable && { opacity: 0.5 }]}>
      <Ionicons name={icon as any} size={17} color={colors.textMuted} style={{ marginRight: 10 }} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    marginBottom: 24,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: '800' },
  avatarPreview: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 26, fontWeight: '900' },
  avatarName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  toggleSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    backgroundColor: colors.secondary,
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 20,
    alignSelf: 'flex-end',
  },
  saveBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
  disableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${colors.error}55`,
    backgroundColor: `${colors.error}11`,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  disableBtnText: { color: colors.error, fontSize: 12, fontWeight: '700' },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${colors.success}55`,
    backgroundColor: `${colors.success}11`,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  enableBtnText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  promoGrantRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoDropdownWrap: { flex: 1, position: 'relative' as any, zIndex: 10 },
  promoDropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg, paddingHorizontal: 12,
  },
  promoDropdownText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  promoDropdownMenu: {
    position: 'absolute' as any, top: 44, left: 0, right: 0,
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  promoDropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
  promoDropdownItemText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  promoDaysWrap: {
    width: 72, height: 42, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 12,
  },
  promoDaysInput: { color: colors.text, fontSize: 14 },
  promoGrantBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, height: 42, borderRadius: 10, paddingHorizontal: 14,
    backgroundColor: colors.secondary,
  },
  promoGrantBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
  payStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  payAmount: { color: colors.text, fontSize: 15, fontWeight: '700' },
  payMeta: { color: colors.textMuted, fontSize: 12, marginBottom: 3 },
  payActions: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 8, flexWrap: 'wrap' as const },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  payBtnDark: { color: '#000', fontSize: 13, fontWeight: '800' },
  payBtnLabel: { fontSize: 13, fontWeight: '700' },
  payHistory: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginTop: 4 },
  payHistoryHeading: {
    color: colors.textDim, fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  payHistoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  payHistoryEvent: { color: colors.text, fontSize: 12, fontWeight: '600' },
  payHistoryDate: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  payHistoryAmount: { color: colors.secondary, fontSize: 13, fontWeight: '700' },

  promoActiveRow: { flexDirection: 'row', alignItems: 'center' },
  promoActiveFeature: { color: colors.text, fontSize: 13, fontWeight: '700' },
  promoActiveLabel: { color: colors.secondary, fontSize: 11, fontWeight: '600', marginTop: 1 },
  promoRevokeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: `${colors.error}44`,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  promoRevokeBtnText: { color: colors.error, fontSize: 12, fontWeight: '700' },
});
