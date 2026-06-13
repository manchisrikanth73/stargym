import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { auth } from '../services/firebase';
import { checkIn } from '../services/attendance';
import { colors } from '../theme/colors';

export default function CheckinScreen() {
  const navigation = useNavigation();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const user = auth.currentUser;
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Athlete';
  const uid = user?.uid ?? 'unknown';
  const today = dayjs().format('YYYY-MM-DD');
  const qrData = `stargym:checkin:${uid}:${today}`;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.94, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const success = await checkIn();
      if (success) {
        setDone(true);
      } else {
        Alert.alert('Already checked in', 'You have already checked in today!');
      }
    } catch {
      Alert.alert('Error', 'Check-in failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  if (done) return <SuccessView onBack={() => navigation.goBack()} />;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Check In</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.dateText}>{dayjs().format('dddd, MMMM D, YYYY')}</Text>
      <Text style={styles.timeText}>{dayjs().format('HH:mm')}</Text>

      {/* QR Code */}
      <Animated.View style={[styles.qrCard, { transform: [{ scale: pulseAnim }] }]}>
        <QRCode
          value={qrData}
          size={210}
          color="#000"
          backgroundColor="#fff"
          ecl="H"
        />
      </Animated.View>

      <Text style={styles.nameText}>{displayName.toUpperCase()}</Text>
      <Text style={styles.hintText}>Show this QR code at the front desk</Text>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={confirming}>
        {confirming ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={22} color="#000" />
            <Text style={styles.confirmText}>Confirm Check-In</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function SuccessView({ onBack }: { onBack: () => void }) {
  return (
    <View style={[styles.root, styles.successContainer]}>
      <View style={styles.successCircle}>
        <Ionicons name="checkmark" size={60} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Check-In Confirmed!</Text>
      <Text style={styles.successSub}>
        Your attendance for today has been{'\n'}marked on the calendar.
      </Text>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { alignItems: 'center', padding: 24, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 48,
    marginBottom: 24,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  dateText: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
  timeText: { color: colors.primary, fontSize: 42, fontWeight: '900', letterSpacing: 4, marginBottom: 32 },
  qrCard: {
    backgroundColor: '#fff',
    padding: 22,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    marginBottom: 28,
  },
  nameText: { color: colors.secondary, fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  hintText: { color: colors.textMuted, fontSize: 13, marginBottom: 36 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    width: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 16,
  },
  confirmText: { color: '#000', fontSize: 16, fontWeight: '700' },
  // Success
  successContainer: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  successTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 12 },
  successSub: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 48 },
  backBtn: {
    width: '100%',
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
