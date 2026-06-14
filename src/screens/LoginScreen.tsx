import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signIn, signUp, resetPassword } from '../services/auth';
import { colors } from '../theme/colors';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState(false);

  const clearError = () => { setError(null); setEmailInUse(false); };

  const handleSubmit = async () => {
    clearError();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (isSignUp && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, name.trim(), dob.trim(), gender);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      if (isSignUp && err.code === 'auth/email-already-in-use') {
        try {
          await signIn(email.trim(), password);
        } catch {
          setEmailInUse(true);
        }
      } else {
        setError(friendlyError(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    clearError();
    if (!email.trim()) {
      setError('Enter your email address above first, then tap Forgot Password.');
      return;
    }
    try {
      await resetPassword(email.trim());
      setError(null);
      setEmailInUse(false);
      if (Platform.OS === 'web') {
        (window as any).alert(`Password reset link sent to ${email.trim()}. Check your inbox.`);
      }
    } catch (err: any) {
      setError(friendlyError(err.code));
    }
  };

  const switchToSignIn = () => {
    setIsSignUp(false);
    setName('');
    setDob('');
    setGender('');
    clearError();
  };

  const friendlyError = (code: string) => {
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
      return 'Invalid email or password.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    return 'Something went wrong. Please try again.';
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoCircle}>
          <Ionicons name="fitness" size={44} color="#fff" />
        </View>
        <Text style={styles.brand}>StarGym</Text>
        <Text style={styles.tagline}>Train Hard. Rise Higher.</Text>

        <View style={styles.card}>
          <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

          {/* Name — sign up only */}
          {isSignUp && (
            <>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  value={name}
                  onChangeText={t => { setName(t); clearError(); }}
                />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Date of Birth (YYYY-MM-DD)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  value={dob}
                  onChangeText={t => { setDob(t); clearError(); }}
                />
              </View>
              <View style={styles.genderRow}>
                {(['Male', 'Female', 'Other'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Email */}
          <View style={[styles.inputWrap, emailInUse && styles.inputError]}>
            <Ionicons name="mail-outline" size={18} color={emailInUse ? colors.error : colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={t => { setEmail(t); clearError(); }}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={t => { setPassword(t); clearError(); }}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Forgot password — sign in only */}
          {!isSignUp && (
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Email already in use banner */}
          {emailInUse && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.errorBannerText}>
                  This email is already registered.
                </Text>
                <View style={styles.errorActions}>
                  <TouchableOpacity style={styles.errorActionBtn} onPress={switchToSignIn}>
                    <Ionicons name="log-in-outline" size={14} color="#000" />
                    <Text style={styles.errorActionBtnText}>Sign In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.errorActionBtn, styles.errorActionBtnSecondary]} onPress={handleForgotPassword}>
                    <Ionicons name="key-outline" size={14} color={colors.error} />
                    <Text style={[styles.errorActionBtnText, { color: colors.error }]}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Generic error */}
          {error && (
            <View style={styles.errorInline}>
              <Ionicons name="warning-outline" size={15} color={colors.error} />
              <Text style={styles.errorInlineText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>{isSignUp ? 'Create Account' : 'Log In'}</Text>
            )}
          </TouchableOpacity>

          {/* Toggle */}
          <TouchableOpacity onPress={() => { setIsSignUp(v => !v); setName(''); setDob(''); setGender(''); clearError(); }} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={styles.toggleLink}>{isSignUp ? 'Log In' : 'Sign Up'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brand: { fontSize: 34, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
  tagline: { fontSize: 13, color: colors.secondary, letterSpacing: 1, marginBottom: 36 },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 22 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  eyeBtn: { padding: 4 },
  btn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  toggleBtn: { marginTop: 18, alignItems: 'center' },
  toggleText: { color: colors.textMuted, fontSize: 14 },
  toggleLink: { color: colors.primary, fontWeight: '700' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  forgotText: { color: colors.textMuted, fontSize: 13 },
  errorBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: `${colors.error}18`,
    borderWidth: 1,
    borderColor: `${colors.error}44`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  errorBannerText: { color: colors.error, fontSize: 13, lineHeight: 18 },
  errorActions: { flexDirection: 'row', gap: 10 },
  errorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  errorActionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: `${colors.error}66`,
  },
  errorActionBtnText: { color: '#000', fontSize: 12, fontWeight: '700' },
  errorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  errorInlineText: { color: colors.error, fontSize: 13, flex: 1 },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  genderBtn: {
    flex: 1, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  genderBtnActive: { backgroundColor: `${colors.primary}22`, borderColor: colors.primary },
  genderBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  genderBtnTextActive: { color: colors.primary },
});
