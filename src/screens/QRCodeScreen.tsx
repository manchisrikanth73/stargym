import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { GYM_CHECKIN_CODE } from '../config';

export default function QRCodeScreen() {
  const navigation = useNavigation<any>();

  const qrValue = Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/?checkin=${GYM_CHECKIN_CODE}`
    : GYM_CHECKIN_CODE;

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    const container = document.getElementById('qr-svg-container');
    const svg = container?.querySelector('svg');
    if (!svg) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Gym Check-In QR Code</title>
  <style>
    body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
    h2 { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #000; }
    p { font-size: 14px; color: #555; margin: 0 0 28px; text-align: center; }
    svg { display: block; }
  </style>
</head>
<body>
  <h2>Gym Check-In QR Code</h2>
  <p>Scan at the entrance to check in</p>
  ${svg.outerHTML}
  <script>window.onload = function() { window.print(); window.close(); };<\/script>
</body>
</html>`);
    w.document.close();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>QR Code</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard' as never)}>
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View nativeID="qr-svg-container" style={styles.qrBox}>
          <QRCode value={qrValue} size={240} color="#000" backgroundColor="#fff" ecl="H" />
        </View>
        <Text style={styles.title}>Gym Check-In QR Code</Text>
        <Text style={styles.sub}>Display at the gym entrance for members to scan</Text>

        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
            <Ionicons name="print-outline" size={18} color="#000" />
            <Text style={styles.printBtnText}>Print</Text>
          </TouchableOpacity>
        )}
      </View>
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
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16,
  },
  qrBox: {
    backgroundColor: '#fff', padding: 24, borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  printBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.secondary, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  printBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
});
