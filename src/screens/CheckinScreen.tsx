import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { checkIn } from '../services/attendance';
import { colors } from '../theme/colors';
import { GYM_CHECKIN_CODE } from '../config';

export default function CheckinScreen() {
  const navigation = useNavigation();
  const [scanned, setScanned] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleConfirm = async () => {
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

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || confirming) return;
    setScanned(true);
    if (data === GYM_CHECKIN_CODE) {
      await handleConfirm();
    } else {
      Alert.alert('Invalid code', 'This is not the StarGym check-in code. Try again.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  if (done) return <SuccessView onBack={() => navigation.goBack()} />;

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
        <Text style={styles.permText}>Camera access needed to scan the check-in code</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Scan to Check In</Text>
        <View style={{ width: 24 }} />
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanHint}>Point at the gym entrance QR code</Text>
          {confirming && <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 20 }} />}
        </View>
      </CameraView>

      {scanned && !confirming && (
        <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
          <Ionicons name="refresh-outline" size={18} color="#000" />
          <Text style={styles.rescanText}>Tap to scan again</Text>
        </TouchableOpacity>
      )}
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

const CORNER = 28;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerRow: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heading: { color: '#fff', fontSize: 18, fontWeight: '700' },
  camera: { flex: 1 },
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 240, height: 240, position: 'relative',
    marginBottom: 28,
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: colors.primary, borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanHint: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  rescanBtn: {
    position: 'absolute', bottom: 48, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14,
  },
  rescanText: { color: '#000', fontWeight: '700', fontSize: 15 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginVertical: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54, paddingHorizontal: 32,
    backgroundColor: colors.primary, borderRadius: 14,
  },
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
