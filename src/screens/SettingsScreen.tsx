import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, updateUserProfile } from '../services/users';
import { colors } from '../theme/colors';

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

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile(user.uid);
      const parts = (profile?.displayName ?? user.displayName ?? '').split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' '));
      setEmail(profile?.email ?? user.email ?? '');
      setPhone(profile?.phone ?? '');
      setIsAdmin(profile?.role === 'admin');
      setLoading(false);
    })();
  }, []);

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
            <Field
              label="First Name"
              value={firstName}
              onChange={setFirstName}
              placeholder="First name"
            />
            <View style={styles.fieldDivider} />
            <Field
              label="Last Name"
              value={lastName}
              onChange={setLastName}
              placeholder="Last name"
            />
            {isAdmin && (
              <>
                <View style={styles.fieldDivider} />
                <Field
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.fieldDivider} />
                <Field
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
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
  fieldLabel: {
    color: colors.textMuted, fontSize: 13, fontWeight: '600', width: 80,
  },
  fieldInput: {
    flex: 1, color: colors.text, fontSize: 15,
  },
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
});
