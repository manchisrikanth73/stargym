import React, { useState } from 'react';
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
import { createUserProfile, updateUserProfile, UserProfile, MembershipType } from '../services/users';
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

export default function AdminUserDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'AdminUserDetail'>>();
  const existing = route.params?.user ?? null;
  const isNew = !existing;

  const [displayName, setDisplayName] = useState(existing?.displayName ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [membershipType, setMembershipType] = useState<MembershipType>(existing?.membershipType ?? 'basic');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [activationStartDate, setActivationStartDate] = useState(existing?.activationStartDate ?? '');
  const [activationEndDate, setActivationEndDate]     = useState(existing?.activationEndDate ?? '');
  const [saving, setSaving] = useState(false);

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
      if (isNew) {
        const placeholderId = `manual_${Date.now()}`;
        await createUserProfile(placeholderId, email.trim(), displayName.trim());
        await updateUserProfile(placeholderId, { phone, membershipType, isActive: resolvedActive, ...dates });
      } else {
        await updateUserProfile(existing!.uid, { displayName: displayName.trim(), email: email.trim(), phone, membershipType, isActive: resolvedActive, ...dates });
      }
      navigation.goBack();
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
    gap: 10,
    height: 54,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    marginTop: 8,
  },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
