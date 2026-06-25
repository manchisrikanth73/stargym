import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { MUSCLE_COLORS, MuscleGroup, ExerciseTracking, EXERCISES } from '../data/exercises';
import {
  logWorkout, getTodayLog, getPreviousExercise,
  LoggedExercise, WorkoutSet,
} from '../services/workouts';
import { getUserProfile } from '../services/users';
import { auth } from '../services/firebase';
import { calcExerciseCalories } from '../utils/calories';

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

export default function WorkoutLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [workoutType, setWorkoutType] = useState<WorkoutParam | undefined>(
    () => route.params?.workoutType as WorkoutParam | undefined
  );
  const routeWT = route.params?.workoutType as WorkoutParam | undefined;
  useEffect(() => {
    if (routeWT?.id) setWorkoutType(routeWT);
  }, [routeWT?.id]);

  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [loading, setLoading] = useState(true);
  const [userWeightKg, setUserWeightKg] = useState(70);
  const [picker, setPicker] = useState<{
    exId: string; idx: number; field: 'weight' | 'reps' | 'duration'; options: number[]; current: string;
  } | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      getUserProfile(uid).then(p => {
        if (p?.weightKg != null) setUserWeightKg(p.weightKg);
      }).catch(() => {});
    }
    getTodayLog()
      .then(log => {
        if (!log || log.exercises.length === 0) return;
        const wtId = (route.params?.workoutType as WorkoutParam | undefined)?.id;
        const relevant = wtId
          ? log.exercises.filter(e => {
              if (e.workoutType === wtId) return true;
              const exDef = EXERCISES.find(ex => ex.name === e.name);
              return exDef?.sections.includes(wtId as any) ?? false;
            })
          : log.exercises;
        if (relevant.length === 0) return;
        const entries: ExerciseEntry[] = relevant.map(e => {
          const exData = EXERCISES.find(ex => ex.name === e.name);
          return {
            id: e.id,
            name: e.name,
            muscle: exData?.muscle ?? 'Cardio' as MuscleGroup,
            tracking: exData?.tracking ?? 'weighted',
            workoutTypeId: wtId ?? e.workoutType,
            sets: e.sets.map(s => ({
              reps: String(s.reps),
              weight: s.weight != null ? String(s.weight) : '',
              duration: String(s.reps),
              completed: true,
            })),
            previous: '',
          };
        });
        setExercises(entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    const added = route.params?.addedExercises as
      { name: string; muscle: MuscleGroup; tracking: ExerciseTracking }[] | undefined;
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
  }, [loading, route.params?.addedExercises]);

  useEffect(() => {
    if (loading) return;
    const swapped = route.params?.swappedExercise as
      { name: string; muscle: MuscleGroup; tracking: ExerciseTracking } | undefined;
    const targetId = route.params?.swapTargetId as string | undefined;
    if (!swapped || !targetId) return;

    navigation.setParams({ swappedExercise: undefined, swapTargetId: undefined });

    setExercises(prev =>
      prev.map(e => e.id !== targetId ? e : {
        ...e,
        name: swapped.name,
        muscle: swapped.muscle,
        tracking: swapped.tracking,
        previous: '',
      })
    );

    if (swapped.tracking !== 'duration') {
      getPreviousExercise(swapped.name).then(prev => {
        if (!prev) return;
        const { weight, reps, unit: u } = prev.bestSet;
        const label = weight != null ? `${weight} ${u} × ${reps}` : `${reps} reps`;
        setExercises(curr =>
          curr.map(e => e.name === swapped.name ? { ...e, previous: label } : e)
        );
      }).catch(() => {});
    }
  }, [loading, route.params?.swappedExercise]);

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
    const updated = exercises.map(e => {
      if (e.id !== exId) return e;
      return { ...e, sets: e.sets.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s) };
    });
    setExercises(updated);

    const completedExercises = updated
      .map(e => ({ ...e, sets: e.sets.filter(s => s.completed) }))
      .filter(e => e.sets.length > 0);

    if (completedExercises.length > 0) {
      const payload: LoggedExercise[] = completedExercises.map(e => ({
        id: e.id,
        name: e.name,
        workoutType: e.workoutTypeId,
        sets: e.sets.map(s => ({
          reps: e.tracking === 'duration' ? parseFloat(s.duration) : parseInt(s.reps, 10),
          weight: e.tracking === 'weighted' && s.weight.trim() !== '' ? parseFloat(s.weight) : null,
          unit,
        })) as WorkoutSet[],
      }));
      logWorkout(payload).catch(() => {});
    }
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const toggleUnit = () => setUnit(prev => prev === 'kg' ? 'lbs' : 'kg');

  const KG_OPTS = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 130, 140, 150, 160, 180, 200];
  const LBS_OPTS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 175, 200, 225, 250, 275, 300];
  const REPS_OPTS = Array.from({ length: 30 }, (_, i) => i + 1);
  const MIN_OPTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120];

  const openPicker = (exId: string, idx: number, field: 'weight' | 'reps' | 'duration', current: string) => {
    let options: number[];
    if (field === 'weight') options = unit === 'kg' ? KG_OPTS : LBS_OPTS;
    else if (field === 'reps') options = REPS_OPTS;
    else options = MIN_OPTS;
    setPicker({ exId, idx, field, options, current });
  };

  const commitPicker = (val: number) => {
    if (!picker) return;
    updateSet(picker.exId, picker.idx, picker.field, val === 0 ? '' : String(val));
    setPicker(null);
  };

  const totalSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0
  );
  const totalVolume = exercises.reduce((acc, ex) => {
    if (ex.tracking !== 'weighted') return acc;
    return acc + ex.sets.filter(s => s.completed).reduce((a, s) => {
      return a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
    }, 0);
  }, 0);
  const totalCalories = Math.round(exercises.reduce((acc, ex) => {
    const completedSets = ex.sets
      .filter(s => s.completed)
      .map(s => ({
        reps: parseInt(s.reps) || 0,
        weight: ex.tracking === 'weighted' && s.weight ? parseFloat(s.weight) : null,
        duration: ex.tracking === 'duration' ? parseFloat(s.duration) || 0 : 0,
      }));
    return acc + calcExerciseCalories(ex.name, ex.tracking, completedSets, userWeightKg);
  }, 0));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>
          {workoutType?.title ?? 'Log Workout'}
        </Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {totalVolume > 0 ? `${totalVolume.toFixed(0)}` : '—'}
          </Text>
          <Text style={styles.statLabel}>Vol ({unit})</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalSets}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF6B35' }]}>
            {totalCalories > 0 ? totalCalories : '—'}
          </Text>
          <Text style={styles.statLabel}>KCAL</Text>
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
                <TouchableOpacity
                  onPress={() => navigation.navigate('ExerciseLibrary', {
                    workoutTypeId: workoutType?.id,
                    workoutTitle: workoutType?.title,
                    workoutTypePassthrough: workoutType,
                    alreadySelected: exercises.filter(e => e.id !== ex.id).map(e => e.name),
                    swapMode: true,
                    swapTargetId: ex.id,
                  })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginRight: 4 }}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeExercise(ex.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color={colors.textDim} />
                </TouchableOpacity>
              </View>

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

              {ex.sets.map((s, idx) => {
                const done = s.completed;
                return (
                  <View key={idx} style={[styles.setRow, done && styles.setRowDone]}>
                    {isDuration ? (
                      <>
                        <Text style={[styles.setNum, done && { color: colors.success }]}>{idx + 1}</Text>
                        <TouchableOpacity
                          style={[styles.setCell, { flex: 1 }, done && styles.setCellDone]}
                          onPress={() => openPicker(ex.id, idx, 'duration', s.duration)}
                        >
                          <Text style={[styles.setCellText, !s.duration && { color: colors.textDim }]}>
                            {s.duration ? `${s.duration} min` : '—'}
                          </Text>
                          <Ionicons name="chevron-down" size={10} color={colors.textDim} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.setNum, done && { color: colors.success }]}>{idx + 1}</Text>
                        <Text style={[styles.prevText, styles.colPrev]} numberOfLines={1}>
                          {idx === 0 && ex.previous ? ex.previous : '—'}
                        </Text>
                        {isWeighted && (
                          <TouchableOpacity
                            style={[styles.setCell, styles.colInput, done && styles.setCellDone]}
                            onPress={() => openPicker(ex.id, idx, 'weight', s.weight)}
                          >
                            <Text style={[styles.setCellText, !s.weight && { color: colors.textDim }]}>
                              {s.weight || '—'}
                            </Text>
                            <Ionicons name="chevron-down" size={10} color={colors.textDim} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.setCell, styles.colInput, done && styles.setCellDone]}
                          onPress={() => openPicker(ex.id, idx, 'reps', s.reps)}
                        >
                          <Text style={[styles.setCellText, !s.reps && { color: colors.textDim }]}>
                            {s.reps || '—'}
                          </Text>
                          <Ionicons name="chevron-down" size={10} color={colors.textDim} />
                        </TouchableOpacity>
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
            workoutTypePassthrough: workoutType,
            alreadySelected: exercises.map(e => e.name),
          })}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {picker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setPicker(null)}>
          <View style={styles.pickerOverlay}>
            <TouchableOpacity style={styles.pickerBackdrop} onPress={() => setPicker(null)} activeOpacity={1} />
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  {picker.field === 'weight'
                    ? `Weight (${unit})`
                    : picker.field === 'reps' ? 'Reps' : 'Duration (min)'}
                </Text>
                <TouchableOpacity onPress={() => setPicker(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={picker.options}
                keyExtractor={item => String(item)}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => {
                  const isSelected = picker.current === String(item) ||
                    (picker.field === 'weight' && parseFloat(picker.current) === item) ||
                    (picker.field !== 'weight' && parseInt(picker.current, 10) === item);
                  return (
                    <TouchableOpacity
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => commitPicker(item)}
                    >
                      <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                        {item === 0 ? '—' : picker.field === 'duration' ? `${item} min` : item}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
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

  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
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
  colSet:   { width: 22, textAlign: 'center' },
  colPrev:  { flex: 1 },
  colInput: { width: 60 },
  colCheck: { width: 32 },

  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6,
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 2,
  },
  setRowDone: { backgroundColor: 'rgba(46, 204, 113, 0.08)' },
  setNum: { color: colors.textDim, fontSize: 12, fontWeight: '700', width: 22, textAlign: 'center' },
  prevText: { color: colors.textDim, fontSize: 11 },
  setCell: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 4, paddingVertical: 7,
  },
  setCellDone: {
    borderColor: 'rgba(46, 204, 113, 0.35)',
    backgroundColor: 'rgba(46, 204, 113, 0.06)',
  },
  setCellText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  checkBtn: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
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

  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  pickerSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4,
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 4,
  },
  pickerTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  pickerItemSelected: { backgroundColor: `${colors.primary}11`, borderRadius: 8 },
  pickerItemText: { color: colors.textMuted, fontSize: 16 },
  pickerItemTextSelected: { color: colors.primary, fontWeight: '700' },
});
