import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import jsQR from 'jsqr';
import { checkIn } from '../services/attendance';
import { colors } from '../theme/colors';
import { GYM_CHECKIN_CODE } from '../config';

export default function CheckinScreen() {
  const navigation = useNavigation();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const detectedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Handle URL-based auto check-in (scanning gym QR with native camera)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('checkin');
    if (code) {
      window.history.replaceState({}, '', window.location.pathname);
      if (code === GYM_CHECKIN_CODE) {
        setDone(true);
        checkIn().catch(() => {});
      } else {
        setError('Invalid QR code.');
      }
      return;
    }

    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          setCameraReady(true);
          scanLoop();
        };
      }
    } catch {
      setError('Camera access denied.\nPlease allow camera permission and reload the page.');
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const scanLoop = () => {
    rafRef.current = requestAnimationFrame(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || detectedRef.current || video.readyState < 2) {
        scanLoop();
        return;
      }
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) { scanLoop(); return; }

      // Downscale to 600px max for fast jsQR
      const scale = Math.min(1, 600 / Math.max(vw, vh));
      canvas.width = Math.floor(vw * scale);
      canvas.height = Math.floor(vh * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, canvas.width, canvas.height);

      if (result) {
        let scannedCode = result.data;
        try {
          const url = new URL(result.data);
          const param = url.searchParams.get('checkin');
          if (param) scannedCode = param;
        } catch { /* not a URL */ }

        if (scannedCode === GYM_CHECKIN_CODE) {
          detectedRef.current = true;
          stopCamera();
          setDone(true);
          checkIn().catch(() => {});
          return;
        }
      }
      scanLoop();
    });
  };

  if (done) return <SuccessView onBack={() => navigation.goBack()} />;

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => { stopCamera(); navigation.goBack(); }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Check In</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Live camera viewfinder */}
      <View style={styles.viewfinder}>
        <video
          ref={videoRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          } as React.CSSProperties}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} style={{ display: 'none' } as React.CSSProperties} />

        {/* Dark overlay with cutout effect */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            {/* Scan frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            {!cameraReady && !error ? (
              <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
            ) : null}
            <Text style={styles.scanHint}>
              {error ? '' : 'Point at the gym QR code'}
            </Text>
          </View>
        </View>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
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

const FRAME = 260;
const CORNER = 24;
const BORDER = 4;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16,
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  heading: { color: '#fff', fontSize: 18, fontWeight: '700' },
  viewfinder: { flex: 1, position: 'relative' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: FRAME },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'flex-start', paddingTop: 24,
  },
  scanFrame: {
    width: FRAME, height: FRAME,
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: colors.primary, borderWidth: BORDER,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanHint: { color: 'rgba(255,255,255,0.8)', fontSize: 15, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: `${colors.error}18`, borderRadius: 10,
    borderWidth: 1, borderColor: `${colors.error}44`,
    padding: 14, margin: 20,
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1, lineHeight: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54, width: '100%',
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
