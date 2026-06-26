import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { colors } from '../theme/colors';

export default function PromotionsScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Promotions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard' as never)}>
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.empty}>
        <View style={styles.iconWrap}>
          <Ionicons name="pricetag-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Promotions</Text>
        <Text style={styles.emptySub}>
          Create and manage promotional offers,{'\n'}discount codes, and trial memberships.
        </Text>
        <View style={styles.comingSoonChip}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
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
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 14,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  emptySub: {
    color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22,
  },
  comingSoonChip: {
    marginTop: 4,
    backgroundColor: `${colors.secondary}18`,
    borderWidth: 1, borderColor: `${colors.secondary}44`,
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7,
  },
  comingSoonText: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
});
