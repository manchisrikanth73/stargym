import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { colors } from '../theme/colors';

export default function TrainersScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Trainers</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard' as never)}>
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Ionicons name="barbell-outline" size={56} color={colors.textDim} />
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.sub}>Trainer profiles and scheduling will appear here.</Text>
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
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  title: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
