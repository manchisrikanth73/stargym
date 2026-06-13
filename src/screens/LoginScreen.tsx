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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signIn, signUp, resetPassword } from '../services/auth';
import { colors } from '../theme/colors';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (isSignUp && !name.trim()) {
      Alert.alert('Missing name', 'Please enter your full name.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      Alert.alert('Error', friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter email', 'Type your email address above first, then tap Forgot Password.');
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert('Email sent', `A password reset link has been sent to ${email.trim()}. Check your inbox and sign in with the new password.`);
    } catch (err: any) {
      Alert.alert('Error', friendlyError(err.code));
    }
  };

  const friendlyError = (code: string) => {
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
      return 'Invalid email or password.';
    if (code === 'auth/email-already-in-use')
      return 'This email is already registered. Log in with your previous password, or tap "Forgot Password?" to reset it.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email.';
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
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
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
              onChangeText={setPassword}
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

          {/* Submit */}
          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>{isSignUp ? 'Create Account' : 'Log In'}</Text>
            )}
          </TouchableOpacity>

          {/* Toggle */}
          <TouchableOpacity onPress={() => { setIsSignUp(v => !v); setName(''); }} style={styles.toggleBtn}>
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
});
