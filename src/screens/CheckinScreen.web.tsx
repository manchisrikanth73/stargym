import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { checkIn } from '../services/attendance';
import { colors } from '../theme/colors';
import { GYM_CHECKIN_CODE } from '../config';

export default function CheckinScreen() {
  const navigation = useNavigation();
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (code.trim().toUpperCase() !== GYM_CHECKIN_CODE) {
      Alert.alert('Wrong code', 'That is not the StarGym check-in code. Check the code at the gym entrance and try again.');
      return;
    }
    setConfirming(true);
    try {
      const success = await checkIn();
      if (success) setDone(true);
      else Alert.alert('Already checked in', 'You have already checked in today!');
    } catch {
      Alert.alert('Error', 'Check-in failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  if (done) return <SuccessView onBack={() => navigation.goBack()} />;

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Check In</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="barcode-outline" size={72} color={colors.primary} />
        </View>

        <Text style={styles.title}>Scan the Gym Code</Text>
        <Text style={styles.hint}>
          Point your phone camera at the QR code at the gym entrance, then enter the code shown below it.
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="Enter check-in code"
          placeholderTextColor={colors.textMuted}
          value={code}
          onChangeText={t => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.btn, (!code || confirming) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!code || confirming}
        >
          {confirming
            ? <ActivityIndicator color="#000" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#000" />
                <Text style={styles.btnText}>Confirm Check-In</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SuccessView({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.successRoot}>
      <View style={styles.successCircle}>
        <Ionicons name="checkmark" size={60} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Check-In Confirmed!</Text>
      <Text style={styles.successSub}>
        Your attendance for today has been{'\n'}marked on the calendar.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onBack}>
        <Text style={styles.btnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 32 },
  iconWrap: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: `${colors.primary}18`, borderWidth: 1,
    borderColor: `${colors.primary}33`, alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  hint: {
    color: colors.textMuted, fontSize: 14, textAlign: 'center',
    lineHeight: 22, marginBottom: 32,
  },
  codeInput: {
    width: '100%', height: 54, backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 18, color: colors.text, fontSize: 18,
    fontWeight: '700', letterSpacing: 4, textAlign: 'center',
    marginBottom: 16,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54, width: '100%',
    backgroundColor: colors.primary, borderRadius: 14,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  successRoot: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  successCircle: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  successTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 12 },
  successSub: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 48 },
});
