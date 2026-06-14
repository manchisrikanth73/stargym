import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import jsQR from 'jsqr';
import { checkIn } from '../services/attendance';
import { colors } from '../theme/colors';
import { GYM_CHECKIN_CODE } from '../config';

export default function CheckinScreen() {
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('checkin');
    if (!code) return;
    window.history.replaceState({}, '', window.location.pathname);
    if (code !== GYM_CHECKIN_CODE) { setError('Invalid QR code.'); return; }
    setScanning(true);
    checkIn()
      .then(success => { if (success) setDone(true); else setError('You have already checked in today!'); })
      .catch(() => setError('Check-in failed. Please try again.'))
      .finally(() => setScanning(false));
  }, []);

  const openCamera = () => {
    setError('');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    (input as any).capture = 'environment';
    input.onchange = async (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (!file) return;
      setScanning(true);
      try {
        await processImage(file);
      } catch {
        setError('Could not read the image. Please try again.');
      } finally {
        setScanning(false);
      }
    };
    input.click();
  };

  const processImage = (file: File): Promise<void> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);

          if (!result) {
            setError('No QR code detected. Make sure the QR code fills the frame clearly, then try again.');
            resolve();
            return;
          }

          // QR may encode the full URL (?checkin=CODE) or just the code string
          let scannedCode = result.data;
          try {
            const url = new URL(result.data);
            const param = url.searchParams.get('checkin');
            if (param) scannedCode = param;
          } catch { /* not a URL, use data as-is */ }

          if (scannedCode !== GYM_CHECKIN_CODE) {
            setError('Invalid QR code. Please scan the StarGym check-in code at the gym entrance.');
            resolve();
            return;
          }

          checkIn()
            .then(success => {
              if (success) setDone(true);
              else setError('You have already checked in today!');
              resolve();
            })
            .catch(reject);
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });

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
          {scanning
            ? <ActivityIndicator size="large" color={colors.primary} />
            : <Ionicons name="scan-outline" size={80} color={colors.primary} />
          }
        </View>

        <Text style={styles.title}>Scan Gym QR Code</Text>
        <Text style={styles.hint}>
          Tap the button below to open your camera.{'\n'}
          Point it at the QR code at the gym entrance.
        </Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, scanning && styles.btnDisabled]}
          onPress={openCamera}
          disabled={scanning}
        >
          <Ionicons name="camera-outline" size={22} color="#000" />
          <Text style={styles.btnText}>{scanning ? 'Processing…' : 'Open Camera'}</Text>
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
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 40 },
  iconWrap: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: `${colors.primary}18`, borderWidth: 1,
    borderColor: `${colors.primary}33`, alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  hint: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: `${colors.error}18`, borderRadius: 10,
    borderWidth: 1, borderColor: `${colors.error}44`,
    padding: 12, marginBottom: 20, width: '100%',
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1, lineHeight: 18 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54, width: '100%',
    backgroundColor: colors.primary, borderRadius: 14,
  },
  btnDisabled: { opacity: 0.5 },
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
