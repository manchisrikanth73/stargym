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

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>QR Code</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.qrBox}>
          <QRCode value={qrValue} size={240} color="#000" backgroundColor="#fff" ecl="H" />
        </View>
        <Text style={styles.title}>Gym Check-In QR Code</Text>
        <Text style={styles.sub}>Display at the gym entrance for members to scan</Text>
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
});
