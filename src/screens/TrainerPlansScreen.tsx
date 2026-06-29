import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getPlan, savePlan, PlanLevel, PlanExercise } from '../services/plans';

const LEVELS: { key: PlanLevel; label: string; color: string }[] = [
  { key: 'basic',        label: 'Basic',        color: colors.textMuted },
  { key: 'intermediate', label: 'Intermediate',  color: colors.secondary },
  { key: 'advanced',     label: 'Advanced',      color: colors.primary },
];

const WORKOUT_TYPES = ['strength', 'cardio', 'hiit', 'functional', 'flexibility', 'core', 'circuit', 'athletic'];

function newExercise(): PlanExercise {
  return { id: `ex_${Date.now()}`, name: '', workoutType: 'strength', sets: 3, reps: 10, notes: '' };
}

export default function TrainerPlansScreen() {
  const navigation = useNavigation<any>();
  const [activeLevel, setActiveLevel] = useState<PlanLevel>('basic');
  const [plans, setPlans] = useState<Record<PlanLevel, PlanExercise[]>>({ basic: [], intermediate: [], advanced: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<PlanExercise>(newExercise());

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [basic, intermediate, advanced] = await Promise.all([
        getPlan('basic'),
        getPlan('intermediate'),
        getPlan('advanced'),
      ]);
      setPlans({ basic: basic.exercises, intermediate: intermediate.exercises, advanced: advanced.exercises });
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(loadAll);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePlan(activeLevel, plans[activeLevel]);
      (window as any).alert('Plan saved.');
    } catch (err: any) {
      (window as any).alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setDraft(newExercise());
    setEditIndex(null);
    setAddModal(true);
  };

  const openEdit = (i: number) => {
    setDraft({ ...plans[activeLevel][i] });
    setEditIndex(i);
    setAddModal(true);
  };

  const confirmExercise = () => {
    if (!draft.name.trim()) { (window as any).alert('Exercise name is required.'); return; }
    const ex: PlanExercise = { ...draft, name: draft.name.trim() };
    setPlans(prev => {
      const list = [...prev[activeLevel]];
      if (editIndex !== null) { list[editIndex] = ex; } else { list.push(ex); }
      return { ...prev, [activeLevel]: list };
    });
    setAddModal(false);
  };

  const removeExercise = (i: number) => {
    setPlans(prev => {
      const list = prev[activeLevel].filter((_, idx) => idx !== i);
      return { ...prev, [activeLevel]: list };
    });
  };

  const currentExercises = plans[activeLevel];
  const levelMeta = LEVELS.find(l => l.key === activeLevel)!;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Workout Plans</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard' as never)}>
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <>
          <View style={styles.content}>
            <View style={styles.planHeader}>
              <View style={[styles.levelDot, { backgroundColor: levelMeta.color }]} />
              <Text style={[styles.levelTitle, { color: levelMeta.color }]}>{levelMeta.label} Plan</Text>
              <Text style={styles.exerciseCount}>{currentExercises.length} exercise{currentExercises.length !== 1 ? 's' : ''}</Text>
              <TouchableOpacity style={styles.addExBtn} onPress={openAdd}>
                <Ionicons name="add" size={18} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {currentExercises.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="barbell-outline" size={44} color={colors.textDim} />
                  <Text style={styles.emptyText}>No exercises yet</Text>
                  <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}>
                    <Text style={styles.addFirstBtnText}>+ Add Exercise</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                currentExercises.map((ex, i) => (
                  <View key={ex.id} style={styles.card}>
                    <View style={styles.cardLeft}>
                      <View style={styles.cardNum}>
                        <Text style={styles.cardNumText}>{i + 1}</Text>
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{ex.name}</Text>
                        <View style={styles.cardMeta}>
                          <View style={[styles.typeChip, { backgroundColor: `${levelMeta.color}18` }]}>
                            <Text style={[styles.typeChipText, { color: levelMeta.color }]}>{ex.workoutType}</Text>
                          </View>
                          <Text style={styles.cardSets}>{ex.sets} sets × {ex.reps} reps</Text>
                        </View>
                        {!!ex.notes && <Text style={styles.cardNotes}>{ex.notes}</Text>}
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => openEdit(i)}>
                        <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeExercise(i)}>
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 16 }} />
            </ScrollView>

            {currentExercises.length > 0 && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.saveBtnText}>Save {levelMeta.label} Plan</Text>
                }
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom level tabs */}
          <View style={styles.tabBar}>
            {LEVELS.map(l => {
              const active = activeLevel === l.key;
              return (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.tab, active && { borderTopColor: l.color }]}
                  onPress={() => setActiveLevel(l.key)}
                >
                  <Text style={[styles.tabText, active && { color: l.color, fontWeight: '800' }]}>
                    {l.label}
                  </Text>
                  {active && <View style={[styles.tabIndicator, { backgroundColor: l.color }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Add / Edit Exercise Modal */}
      <Modal visible={addModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editIndex !== null ? 'Edit Exercise' : 'Add Exercise'}</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Exercise name"
              placeholderTextColor={colors.textDim}
              value={draft.name}
              onChangeText={v => setDraft(p => ({ ...p, name: v }))}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {WORKOUT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, draft.workoutType === t && styles.typeBtnActive]}
                  onPress={() => setDraft(p => ({ ...p, workoutType: t }))}
                >
                  <Text style={[styles.typeBtnText, draft.workoutType === t && styles.typeBtnTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.setsRow}>
              <View style={styles.setsField}>
                <Text style={styles.setsLabel}>Sets</Text>
                <TextInput
                  style={styles.setsInput}
                  value={String(draft.sets)}
                  onChangeText={v => setDraft(p => ({ ...p, sets: parseInt(v, 10) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.setsSep}>×</Text>
              <View style={styles.setsField}>
                <Text style={styles.setsLabel}>Reps</Text>
                <TextInput
                  style={styles.setsInput}
                  value={String(draft.reps)}
                  onChangeText={v => setDraft(p => ({ ...p, reps: parseInt(v, 10) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textDim}
              value={draft.notes}
              onChangeText={v => setDraft(p => ({ ...p, notes: v }))}
            />

            <TouchableOpacity style={styles.confirmBtn} onPress={confirmExercise}>
              <Text style={styles.confirmBtnText}>{editIndex !== null ? 'Update' : 'Add'}</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14,
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },

  content: { flex: 1, paddingHorizontal: 16 },

  planHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  levelTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  exerciseCount: { color: colors.textDim, fontSize: 12 },
  addExBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingBottom: 8 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 14, marginBottom: 8, gap: 10,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardNum: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardNumText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeChipText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  cardSets: { color: colors.textMuted, fontSize: 12 },
  cardNotes: { color: colors.textDim, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  cardActions: { gap: 12 },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 12,
  },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { color: colors.textDim, fontSize: 14 },
  addFirstBtn: {
    borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}55`,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addFirstBtnText: { color: colors.primary, fontWeight: '700' },

  /* Bottom tab bar */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingBottom: 24,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderTopWidth: 2, borderTopColor: 'transparent',
    position: 'relative',
  },
  tabText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  tabIndicator: {
    position: 'absolute', bottom: 24, width: 4, height: 4, borderRadius: 2,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: colors.surface, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  input: {
    backgroundColor: colors.bg, borderRadius: 10, padding: 12,
    color: colors.text, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  typeRow: { marginVertical: 12 },
  typeBtn: {
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 6,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  typeBtnTextActive: { color: '#000' },
  setsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  setsField: { flex: 1 },
  setsLabel: { color: colors.textDim, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  setsInput: {
    backgroundColor: colors.bg, borderRadius: 10, padding: 12,
    color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  setsSep: { color: colors.textDim, fontSize: 20, fontWeight: '300', marginTop: 18 },
  confirmBtn: {
    marginTop: 14, backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  confirmBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
