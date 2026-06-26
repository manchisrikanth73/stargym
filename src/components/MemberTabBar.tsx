import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';

const TABS = [
  { name: 'Dashboard', label: 'Home', icon: 'home', outline: 'home-outline' },
  { name: 'Workouts', label: 'Workouts', icon: 'barbell', outline: 'barbell-outline' },
  { name: 'Progress', label: 'Progress', icon: 'bar-chart', outline: 'bar-chart-outline' },
];

export default function MemberTabBar() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  return (
    <View style={styles.bar}>
      {TABS.map(tab => {
        const active = route.name === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => { if (!active) navigation.navigate(tab.name as never); }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={(active ? tab.icon : tab.outline) as any}
              size={24}
              color={active ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
    paddingBottom: 16,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  labelActive: { color: colors.primary },
});
