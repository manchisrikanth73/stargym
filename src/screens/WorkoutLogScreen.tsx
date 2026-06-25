import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { logWorkout, getTodayLog, LoggedExercise, WorkoutSet } from '../services/workouts';

type WorkoutParam = {
  id: string;
  title: string;
  color: string;
  examples: string[];
};

type SetState = { reps: string; weight: string; unit: 'kg' | 'lbs' };
type ExerciseState = { id: string; name: string; sets: SetState[] };

function emptySet(unit: 'kg' | 'lbs'): SetState {
  return { reps: '', weight: '', unit };
}

export default function WorkoutLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const workoutType: WorkoutParam = route.params?.workoutType;

  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const unitRef = useRef<'kg' | 'lbs'>('kg');

  useFocusEffect(useCallback(() => {
    getTodayLog()
      .then(log => {
        if (log && log.exercises.length > 0) {
          const existing = log.exercises
            .filter(e => e.workoutType === workoutType.id)
            .map(e => ({
              id: e.id,
              name: e.name,
              sets: e.sets.map(s => ({
                reps: String(s.reps),
                weight: s.weight != null ? String(s.weight) : '',
                unit: s.unit ?? unitRef.current,
              })),
            }));
          if (existing.length > 0) setExercises(existing);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []));

  const toggleUnit = () => {
    const next: 'kg' | 'lbs' = unit === 'kg' ? 'lbs' : 'kg';
    setUnit(next);
    unitRef.current = next;
    setExercises(prev =>
      prev.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s, unit: next })),
      }))
    );
  };

  const addExercise = (name: string) => {
    if (exercises.find(e => e.name === name)) return;
    setExercises(prev => [
      ...prev,
      { id: `${Date.now()}`, name, sets: [emptySet(unit)] },
    ]);
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const addSet = (exId: string) => {
    setExercises(prev =>
      prev.map(e => e.id === exId ? { ...e, sets: [...e.sets, emptySet(unit)] } : e)
    );
  };

  const removeSet = (exId: string, setIdx: number) => {
    setExercises(prev =>
      prev.map(e => {
        if (e.id !== exId) return e;
        const sets = e.sets.filter((_, i) => i !== setIdx);
        return sets.length === 0 ? e : { ...e, sets };
      })
    );
  };

  const updateSet = (exId: string, setIdx: number, field: 'reps' | 'weight', value: string) => {
    setExercises(prev =>
      prev.map(e => {
        if (e.id !== exId) return e;
        const sets = e.sets.map((s, i) =>
          i === setIdx ? { ...s, [field]: value } : s
        );
        return { ...e, sets };
      })
    );
  };

  const handleSave = async () => {
    setError('');
    if (exercises.length === 0) {
      setError('Select at least one exercise.');
      return;
    }
    for (const ex of exercises) {
      for (const s of ex.sets) {
        const r = parseInt(s.reps, 10);
        if (!r || r <= 0) {
          setError(`Enter reps for every set in "${ex.name}".`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const payload: LoggedExercise[] = exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        workoutType: workoutType.id,
        sets: ex.sets.map(s => ({
          reps: parseInt(s.reps, 10),
          weight: s.weight.trim() !== '' ? parseFloat(s.weight) : null,
          unit: s.unit,
        })) as WorkoutSet[],
      }));
      await logWorkout(payload);
      navigation.goBack();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedNames = new Set(exercises.map(e => e.name));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Log Workout</Text>
          <Text style={[styles.subheading, { color: workoutType.color }]}>{workoutType.title}</Text>
        </View>
        <TouchableOpacity onPress={toggleUnit} style={styles.unitToggle}>
          <Text style={styles.unitToggleText}>{unit}</Text>
          <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Exercise picker */}
        <Text style={styles.sectionLabel}>Select Exercises</Text>
        <View style={styles.exercisePicker}>
          {workoutType.examples.map(ex => {
            const selected = selectedNames.has(ex);
            return (
              <TouchableOpacity
                key={ex}
                style={[styles.exerciseChip, selected && styles.exerciseChipSelected, { borderColor: selected ? workoutType.color : 'rgba(255,255,255,0.12)' }]}
                onPress={() => selected ? removeExercise(exercises.find(e => e.name === ex)!.id) : addExercise(ex)}
              >
                {selected && (
                  <Ionicons name="checkmark-circle" size={14} color={workoutType.color} />
                )}
                <Text style={[styles.exerciseChipText, selected && { color: workoutType.color }]}>{ex}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logged exercises */}
        {exercises.map(ex => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseCardHeader}>
              <View style={[styles.exDot, { backgroundColor: workoutType.color }]} />
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Column labels */}
            <View style={styles.setLabels}>
              <Text style={[styles.setLabel, { width: 32 }]}>Set</Text>
              <Text style={[styles.setLabel, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.setLabel, { flex: 1.4 }]}>Weight ({unit})</Text>
              <View style={{ width: 28 }} />
            </View>

            {ex.sets.map((s, idx) => (
              <View key={idx} style={styles.setRow}>
                <Text style={styles.setNum}>{idx + 1}</Text>
                <TextInput
                  style={[styles.setInput, { flex: 1 }]}
                  value={s.reps}
                  onChangeText={v => updateSet(ex.id, idx, 'reps', v.replace(/[^0-9]/g, ''))}
                  placeholder=""
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TextInput
                  style={[styles.setInput, { flex: 1.4 }]}
                  value={s.weight}
                  onChangeText={v => updateSet(ex.id, idx, 'weight', v.replace(/[^0-9.]/g, ''))}
                  placeholder="—"
                  placeholderTextColor={colors.textDim}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
                <TouchableOpacity onPress={() => removeSet(ex.id, idx)} style={{ width: 28, alignItems: 'center' }}>
                  <Ionicons name="remove-circle-outline" size={18} color={ex.sets.length > 1 ? colors.error : colors.textDim} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity onPress={() => addSet(ex.id)} style={styles.addSetBtn}>
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.addSetText}>Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={styles.footer}>
        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={colors.bg} />
            : <Text style={styles.saveBtnText}>Save Workout</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14, gap: 10,
  },
  backBtn: { padding: 4 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '800' },
  subheading: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  unitToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.primary}18`,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: `${colors.primary}33`,
  },
  unitToggleText: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },

  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  exercisePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  exerciseChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  exerciseChipSelected: { backgroundColor: 'rgba(255,255,255,0.05)' },
  exerciseChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },

  exerciseCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 14, marginBottom: 12,
  },
  exerciseCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  exDot: { width: 8, height: 8, borderRadius: 4 },
  exerciseName: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },

  setLabels: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  setLabel: { color: colors.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  setNum: { color: colors.textDim, fontSize: 12, fontWeight: '700', width: 32, textAlign: 'center' },
  setInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    color: colors.text, fontSize: 15, fontWeight: '600',
    paddingHorizontal: 10, paddingVertical: 8, textAlign: 'center',
  },

  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}33`,
  },
  addSetText: { color: colors.primary, fontSize: 12, fontWeight: '600' },

  footer: {
    paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: colors.bg,
  },
  errorText: { color: colors.error, fontSize: 13, textAlign: 'center', marginBottom: 8 },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.bg, fontSize: 16, fontWeight: '800' },
});
