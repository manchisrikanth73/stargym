import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function DateInput({
  label, value, onChange, required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="calendar-outline" size={17} color={colors.textMuted} style={{ marginRight: 10 }} />
        <input
          type="date"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: value ? '#fff' : 'rgba(255,255,255,0.35)',
            fontSize: 15,
            outline: 'none',
            colorScheme: 'dark',
            width: '100%',
            cursor: 'pointer',
          } as React.CSSProperties}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: {
    color: colors.textMuted, fontSize: 12, fontWeight: '600',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, height: 48,
  },
});
