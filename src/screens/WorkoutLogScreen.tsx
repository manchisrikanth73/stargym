import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { MUSCLE_COLORS, MuscleGroup, ExerciseTracking, EXERCISES } from '../data/exercises';
import {
  logWorkout, getTodayLog, getPreviousExercise,
  LoggedExercise, WorkoutSet,
} from '../services/workouts';

type WorkoutParam = { id: string; title: string; color: string };
type SetEntry = { reps: string; weight: string; duration: string; completed: boolean };
type ExerciseEntry = {
  id: string;
  name: string;
  muscle: MuscleGroup;
  tracking: ExerciseTracking;
  workoutTypeId: string;
  sets: SetEntry[];
  previous: string;
};

function emptySet(): SetEntry {
  return { reps: '', weight: '', duration: '', completed: false };
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resolveTracking(name: string): ExerciseTracking {
  return EXERCISES.find(e => e.name === name)?.tracking ?? 'weighted';
}

export default function WorkoutLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const workoutType: WorkoutParam | undefined = route.params?.workoutType;

  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getTodayLog()
      .then(log => {
        if (log && log.exercises.length > 0) {
          const entries: ExerciseEntry[] = log.exercises.map(e => ({
            id: e.id,
            name: e.name,
            muscle: ((e as any).muscle ?? 'Chest') as MuscleGroup,
            tracking: resolveTracking(e.name),
            workoutTypeId: e.workoutType,
            sets: e.sets.map(s => ({
              reps: String(s.reps),
              weight: s.weight != null ? String(s.weight) : '',
              duration: String(s.reps),
              completed: true,
            })),
            previous: '',
          }));
          setExercises(entries);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const added: { name: string; muscle: MuscleGroup; tracking: ExerciseTracking }[] | undefined =
      route.params?.addedExercises;
    if (!added || added.length === 0) return;

    navigation.setParams({ addedExercises: undefined });

    setExercises(prev => {
      const currentNames = new Set(prev.map(e => e.name));
      const fresh = added.filter(a => !currentNames.has(a.name)).map(a => ({
        id: `${Date.now()}_${a.name}`,
        name: a.name,
        muscle: a.muscle,
        tracking: a.tracking,
        workoutTypeId: workoutType?.id ?? a.muscle.toLowerCase(),
        sets: [emptySet()],
        previous: '',
      }));
      return [...prev, ...fresh];
    });

    added.forEach(async ({ name, tracking }) => {
      if (tracking === 'duration') return;
      try {
        const prev = await getPreviousExercise(name);
        if (!prev) return;
        const { weight, reps, unit: u } = prev.bestSet;
        const label = weight != null ? `${weight} ${u} × ${reps}` : `${reps} reps`;
        setExercises(curr =>
          curr.map(e => e.name === name ? { ...e, previous: label } : e)
        );
      } catch {}
    });
  }, [route.params?.addedExercises]);

  const addSet = (exId: string) => {
    setExercises(prev =>
      prev.map(e => e.id === exId ? { ...e, sets: [...e.sets, emptySet()] } : e)
    );
  };

  const removeSet = (exId: string, idx: number) => {
    setExercises(prev =>
      prev.map(e => {
        if (e.id !== exId) return e;
        const sets = e.sets.filter((_, i) => i !== idx);
        return sets.length === 0 ? e : { ...e, sets };
      })
    );
  };

  const updateSet = (exId: string, idx: number, field: keyof SetEntry, value: string) => {
    setExercises(prev =>
      prev.map(e => {
        if (e.id !== exId) return e;
        return { ...e, sets: e.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s) };
      })
    );
  };

  const toggleComplete = (exId: string, idx: number) => {
    setExercises(prev =>
      prev.map(e => {
        if (e.id !== exId) return e;
        return { ...e, sets: e.sets.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s) };
      })
    );
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const toggleUnit = () => setUnit(prev => prev === 'kg' ? 'lbs' : 'kg');

  const totalSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0
  );
  const totalVolume = exercises.reduce((acc, ex) => {
    if (ex.tracking !== 'weighted') return acc;
    return acc + ex.sets.filter(s => s.completed).reduce((a, s) => {
      return a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
    }, 0);
  }, 0);

  const handleFinish = async () => {
    setError('');
    const completedExercises = exercises
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.completed) }))
      .filter(ex => ex.sets.length > 0);

    if (completedExercises.length === 0) {
      setError('Complete at least one set to finish.');
      return;
    }

    for (const ex of completedExercises) {
      for (const s of ex.sets) {
        if (ex.tracking === 'duration') {
          if (!parseFloat(s.duration) || parseFloat(s.duration) <= 0) {
            setError(`Enter duration for all completed sets in "${ex.name}".`);
            return;
          }
        } else {
          if (!parseInt(s.reps, 10) || parseInt(s.reps, 10) <= 0) {
            setError(`Enter reps for all completed sets in "${ex.name}".`);
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const payload: LoggedExercise[] = completedExercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        workoutType: ex.workoutTypeId,
        sets: ex.sets.map(s => ({
          reps: ex.tracking === 'duration' ? parseFloat(s.duration) : parseInt(s.reps, 10),
          weight: ex.tracking === 'weighted' && s.weight.trim() !== '' ? parseFloat(s.weight) : null,
          unit,
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
        <Text style={styles.heading} numberOfLines={1}>
          {workoutType?.title ?? 'Log Workout'}
        </Text>
        <View style={styles.timerWrap}>
          <Ionicons name="timer-outline" size={14} color={colors.textMuted} />
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.finishBtn, saving && { opacity: 0.6 }]}
          onPress={handleFinish}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={colors.bg} />
            : <Text style={styles.finishBtnText}>Finish</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Stats card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {totalVolume > 0 ? `${totalVolume.toFixed(0)}` : '—'}
          </Text>
          <Text style={styles.statLabel}>Volume ({unit})</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalSets}</Text>
          <Text style={styles.statLabel}>Sets Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <TouchableOpacity onPress={toggleUnit}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {unit.toUpperCase()}
            </Text>
          </TouchableOpacity>
          <Text style={styles.statLabel}>Unit (tap)</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {exercises.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={44} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Exercise" below to start</Text>
          </View>
        )}

        {exercises.map(ex => {
          const muscleColor = MUSCLE_COLORS[ex.muscle] ?? colors.primary;
          const isWeighted  = ex.tracking === 'weighted';
          const isDuration  = ex.tracking === 'duration';

          return (
            <View key={ex.id} style={styles.exCard}>
              <View style={styles.exHeader}>
                <View style={[styles.musclePill, { backgroundColor: `${muscleColor}22`, borderColor: `${muscleColor}44` }]}>
                  <Text style={[styles.musclePillText, { color: muscleColor }]}>{ex.muscle}</Text>
                </View>
                <Text style={styles.exName}>{ex.name}</Text>
                <TouchableOpacity onPress={() => removeExercise(ex.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color={colors.textDim} />
                </TouchableOpacity>
              </View>

              {/* Column headers */}
              {isDuration ? (
                <View style={styles.colHeaders}>
                  <View style={styles.colSet} />
                  <Text style={[styles.colLabel, { flex: 1, textAlign: 'center' }]}>MIN</Text>
                  <View style={styles.colCheck} />
                </View>
              ) : (
                <View style={styles.colHeaders}>
                  <Text style={[styles.colLabel, styles.colSet]}>SET</Text>
                  <Text style={[styles.colLabel, styles.colPrev]}>PREVIOUS</Text>
                  {isWeighted && (
                    <Text style={[styles.colLabel, styles.colInput, { textAlign: 'center' }]}>
                      {unit.toUpperCase()}
                    </Text>
                  )}
                  <Text style={[styles.colLabel, styles.colInput, { textAlign: 'center' }]}>REPS</Text>
                  <View style={styles.colCheck} />
                </View>
              )}

              {/* Set rows */}
              {ex.sets.map((s, idx) => {
                const done = s.completed;
                return (
                  <View key={idx} style={[styles.setRow, done && styles.setRowDone]}>
                    {isDuration ? (
                      <>
                        <Text style={[styles.setNum, done && { color: colors.success }]}>{idx + 1}</Text>
                        <TextInput
                          style={[styles.setInput, { flex: 1 }, done && styles.setInputDone]}
                          value={s.duration}
                          onChangeText={v => updateSet(ex.id, idx, 'duration', v.replace(/[^0-9.]/g, ''))}
                          placeholder="—"
                          placeholderTextColor={colors.textDim}
                          keyboardType="decimal-pad"
                          maxLength={5}
                        />
                      </>
                    ) : (
                      <>
                        <Text style={[styles.setNum, done && { color: colors.success }]}>{idx + 1}</Text>
                        <Text style={[styles.prevText, styles.colPrev]} numberOfLines={1}>
                          {idx === 0 && ex.previous ? ex.previous : '—'}
                        </Text>
                        {isWeighted && (
                          <TextInput
                            style={[styles.setInput, styles.colInput, done && styles.setInputDone]}
                            value={s.weight}
                            onChangeText={v => updateSet(ex.id, idx, 'weight', v.replace(/[^0-9.]/g, ''))}
                            placeholder="—"
                            placeholderTextColor={colors.textDim}
                            keyboardType="decimal-pad"
                            maxLength={6}
                          />
                        )}
                        <TextInput
                          style={[styles.setInput, styles.colInput, done && styles.setInputDone]}
                          value={s.reps}
                          onChangeText={v => updateSet(ex.id, idx, 'reps', v.replace(/[^0-9]/g, ''))}
                          placeholder="—"
                          placeholderTextColor={colors.textDim}
                          keyboardType="numeric"
                          maxLength={4}
                        />
                      </>
                    )}
                    <TouchableOpacity
                      style={[styles.checkBtn, done && styles.checkBtnDone]}
                      onPress={() => toggleComplete(ex.id, idx)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={done ? colors.bg : 'rgba(255,255,255,0.2)'}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}

              <View style={styles.exFooter}>
                <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={styles.addSetText}>Add Set</Text>
                </TouchableOpacity>
                {ex.sets.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeSetBtn}
                    onPress={() => removeSet(ex.id, ex.sets.length - 1)}
                  >
                    <Text style={styles.removeSetText}>Remove Last</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => navigation.navigate('ExerciseLibrary', {
            workoutTypeId: workoutType?.id,
            workoutTitle: workoutType?.title,
            alreadySelected: exercises.map(e => e.name),
          })}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {error !== '' && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, gap: 8,
  },
  backBtn: { padding: 4 },
  heading: { color: colors.text, fontSize: 17, fontWeight: '800', flex: 1 },
  timerWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  timerText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  finishBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    minWidth: 60, alignItems: 'center',
  },
  finishBtnText: { color: colors.bg, fontSize: 13, fontWeight: '800' },

  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },

  scroll: { paddingHorizontal: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  emptySubtext: { color: colors.textDim, fontSize: 13 },

  exCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: 14, marginBottom: 12,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  musclePill: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  musclePillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  exName: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },

  colHeaders: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 6, gap: 4,
  },
  colLabel: {
    color: colors.textDim, fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  colSet:   { width: 28, textAlign: 'center' },
  colPrev:  { flex: 1.6 },
  colInput: { flex: 1 },
  colCheck: { width: 36 },

  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6,
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 2,
  },
  setRowDone: { backgroundColor: 'rgba(46, 204, 113, 0.08)' },
  setNum: { color: colors.textDim, fontSize: 12, fontWeight: '700', width: 28, textAlign: 'center' },
  prevText: { color: colors.textDim, fontSize: 12 },
  setInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    color: colors.text, fontSize: 14, fontWeight: '600',
    paddingHorizontal: 6, paddingVertical: 7, textAlign: 'center',
  },
  setInputDone: {
    borderColor: 'rgba(46, 204, 113, 0.35)',
    backgroundColor: 'rgba(46, 204, 113, 0.06)',
  },
  checkBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 2,
  },
  checkBtnDone: { backgroundColor: colors.success, borderColor: colors.success },

  exFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}33`,
  },
  addSetText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  removeSetBtn: { paddingVertical: 6 },
  removeSetText: { color: colors.textDim, fontSize: 12 },

  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: `${colors.primary}44`, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 14, marginTop: 4,
  },
  addExerciseText: { color: colors.primary, fontSize: 15, fontWeight: '700' },

  errorBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: `${colors.error}18`,
  },
  errorText: { color: colors.error, fontSize: 13, fontWeight: '600', flex: 1 },
});
