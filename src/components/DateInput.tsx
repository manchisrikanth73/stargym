import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
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
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
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
  input: { flex: 1, color: colors.text, fontSize: 15 },
});
