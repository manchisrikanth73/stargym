import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { logWorkout, getTodayLog, getWorkoutHistory, LoggedExercise, WorkoutSet, WorkoutLog } from '../services/workouts';
import dayjs from 'dayjs';

const WORKOUT_TYPES = ['strength', 'cardio', 'hiit', 'functional', 'flexibility', 'core', 'circuit', 'athletic'];

type EditingSet = { reps: string; weight: string; unit: 'kg' | 'lbs' };

interface NewExercise {
  name: string;
  workoutType: string;
  sets: EditingSet[];
}

const emptyExercise = (): NewExercise => ({
  name: '',
  workoutType: 'strength',
  sets: [{ reps: '', weight: '', unit: 'kg' }],
});

export default function TrainerMemberWorkoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { memberUid, memberName } = route.params as { memberUid: string; memberName: string };

  const [todayLog, setTodayLog] = useState<WorkoutLog | null>(null);
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [exercise, setExercise] = useState<NewExercise>(emptyExercise());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [todayData, histData] = await Promise.all([
        getTodayLog(memberUid),
        getWorkoutHistory(7, memberUid),
      ]);
      setTodayLog(todayData);
      setHistory(histData);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addSet = () => {
    setExercise(prev => ({ ...prev, sets: [...prev.sets, { reps: '', weight: '', unit: 'kg' }] }));
  };

  const updateSet = (i: number, field: keyof EditingSet, value: string) => {
    setExercise(prev => {
      const sets = [...prev.sets];
      sets[i] = { ...sets[i], [field]: value };
      return { ...prev, sets };
    });
  };

  const removeSet = (i: number) => {
    setExercise(prev => ({ ...prev, sets: prev.sets.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!exercise.name.trim()) {
      (window as any).alert('Exercise name is required.');
      return;
    }
    const validSets = exercise.sets.filter(s => s.reps.trim());
    if (validSets.length === 0) {
      (window as any).alert('At least one set with reps is required.');
      return;
    }
    const payload: LoggedExercise = {
      id: `${exercise.workoutType}_${Date.now()}`,
      name: exercise.name.trim(),
      workoutType: exercise.workoutType,
      sets: validSets.map(s => ({
        reps: parseInt(s.reps, 10) || 0,
        weight: s.weight.trim() ? parseFloat(s.weight) : null,
        unit: s.unit,
      } as WorkoutSet)),
    };
    setSaving(true);
    try {
      await logWorkout([payload], memberUid);
      setAddModal(false);
      setExercise(emptyExercise());
      await load();
    } catch (err: any) {
      (window as any).alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const todayExercises = todayLog?.exercises ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.heading}>{memberName}</Text>
          <Text style={styles.headingSub}>Workout Log</Text>
        </View>
        <TouchableOpacity style={styles.addExBtn} onPress={() => setAddModal(true)}>
          <Ionicons name="add" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Today's log */}
          <Text style={styles.sectionTitle}>Today</Text>
          {todayExercises.length === 0 ? (
            <View style={styles.emptyToday}>
              <Text style={styles.emptyTodayText}>No exercises logged today</Text>
              <TouchableOpacity style={styles.addFirstBtn} onPress={() => setAddModal(true)}>
                <Text style={styles.addFirstBtnText}>+ Add Exercise</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayExercises.map((ex, i) => (
              <View key={i} style={styles.exerciseCard}>
                <View style={styles.exHeader}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <View style={styles.typeChip}>
                    <Text style={styles.typeChipText}>{ex.workoutType}</Text>
                  </View>
                </View>
                {ex.sets.map((s, si) => (
                  <View key={si} style={styles.setRow}>
                    <Text style={styles.setLabel}>Set {si + 1}</Text>
                    <Text style={styles.setVal}>{s.reps} reps</Text>
                    {s.weight != null && <Text style={styles.setVal}>{s.weight}{s.unit}</Text>}
                  </View>
                ))}
              </View>
            ))
          )}

          {/* History */}
          {history.filter(h => h.date !== dayjs().format('YYYY-MM-DD')).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent History</Text>
              {history
                .filter(h => h.date !== dayjs().format('YYYY-MM-DD'))
                .map(log => (
                  <View key={log.date} style={styles.historyCard}>
                    <Text style={styles.historyDate}>{dayjs(log.date).format('ddd, DD MMM')}</Text>
                    {log.exercises.map((ex, i) => (
                      <Text key={i} style={styles.historyEx}>
                        {ex.name} — {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
                      </Text>
                    ))}
                  </View>
                ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add Exercise Modal */}
      <Modal visible={addModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => { setAddModal(false); setExercise(emptyExercise()); }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Exercise name"
              placeholderTextColor={colors.textDim}
              value={exercise.name}
              onChangeText={v => setExercise(prev => ({ ...prev, name: v }))}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {WORKOUT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, exercise.workoutType === t && styles.typeBtnActive]}
                  onPress={() => setExercise(prev => ({ ...prev, workoutType: t }))}
                >
                  <Text style={[styles.typeBtnText, exercise.workoutType === t && styles.typeBtnTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.setsLabel}>Sets</Text>
            {exercise.sets.map((s, i) => (
              <View key={i} style={styles.setInputRow}>
                <TextInput
                  style={[styles.setInput, styles.setInputSmall]}
                  placeholder="Reps"
                  placeholderTextColor={colors.textDim}
                  value={s.reps}
                  onChangeText={v => updateSet(i, 'reps', v)}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.setInput, styles.setInputSmall]}
                  placeholder="Weight"
                  placeholderTextColor={colors.textDim}
                  value={s.weight}
                  onChangeText={v => updateSet(i, 'weight', v)}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.unitBtn, s.unit === 'kg' && styles.unitBtnActive]}
                  onPress={() => updateSet(i, 'unit', s.unit === 'kg' ? 'lbs' : 'kg')}
                >
                  <Text style={styles.unitBtnText}>{s.unit}</Text>
                </TouchableOpacity>
                {exercise.sets.length > 1 && (
                  <TouchableOpacity onPress={() => removeSet(i)}>
                    <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addSetBtnText}>Add Set</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Exercise</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14, gap: 12,
  },
  headerCenter: { flex: 1 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '800' },
  headingSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  addExBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  content: { padding: 16 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  emptyToday: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyTodayText: { color: colors.textDim, fontSize: 14 },
  addFirstBtn: {
    borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}55`,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addFirstBtnText: { color: colors.primary, fontWeight: '700' },

  exerciseCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 14, marginBottom: 8,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  exName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  typeChip: { backgroundColor: `${colors.primary}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeChipText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  setRow: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  setLabel: { color: colors.textDim, fontSize: 12, width: 36 },
  setVal: { color: colors.text, fontSize: 13, fontWeight: '600' },

  historyCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 12, marginBottom: 8,
  },
  historyDate: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  historyEx: { color: colors.text, fontSize: 13, paddingVertical: 2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  input: {
    backgroundColor: colors.bg, borderRadius: 10, padding: 12,
    color: colors.text, fontSize: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  typeRow: { marginBottom: 14 },
  typeBtn: {
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 6,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  typeBtnTextActive: { color: '#000' },
  setsLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  setInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  setInput: {
    backgroundColor: colors.bg, borderRadius: 8, padding: 10,
    color: colors.text, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', flex: 1,
  },
  setInputSmall: { flex: 1 },
  unitBtn: {
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10, paddingVertical: 10,
  },
  unitBtnActive: { borderColor: colors.primary },
  unitBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16,
  },
  addSetBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
