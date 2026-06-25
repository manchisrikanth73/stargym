import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { EXERCISES, MUSCLE_GROUPS, MUSCLE_COLORS, MuscleGroup, WorkoutSectionId, ExerciseTracking } from '../data/exercises';

export default function ExerciseLibraryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const alreadySelected: string[] = route.params?.alreadySelected ?? [];
  const workoutTypeId: WorkoutSectionId | undefined = route.params?.workoutTypeId;
  const workoutTitle: string | undefined = route.params?.workoutTitle;

  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<MuscleGroup | 'All'>('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sectionExercises = useMemo(
    () => workoutTypeId ? EXERCISES.filter(e => e.sections.includes(workoutTypeId)) : EXERCISES,
    [workoutTypeId]
  );

  const availableMuscles = useMemo(
    () => MUSCLE_GROUPS.filter(m => sectionExercises.some(e => e.muscle === m)),
    [sectionExercises]
  );

  const filtered = useMemo(() => {
    return sectionExercises.filter(e => {
      const matchMuscle = filterMuscle === 'All' || e.muscle === filterMuscle;
      const matchSearch = search === '' || e.name.toLowerCase().includes(search.toLowerCase());
      return matchMuscle && matchSearch;
    });
  }, [sectionExercises, search, filterMuscle]);

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleAdd = () => {
    const exercises = Array.from(selected).map(name => {
      const ex = EXERCISES.find(e => e.name === name)!;
      return { name: ex.name, muscle: ex.muscle, tracking: ex.tracking };
    });
    navigation.navigate('WorkoutLog', { addedExercises: exercises });
  };

  const tabs: (MuscleGroup | 'All')[] = ['All', ...availableMuscles];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>{workoutTitle ?? 'Exercises'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textDim}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(m => {
          const active = filterMuscle === m;
          const color = m === 'All' ? colors.primary : MUSCLE_COLORS[m as MuscleGroup];
          return (
            <TouchableOpacity
              key={m}
              style={[
                styles.tab,
                active && { backgroundColor: `${color}22`, borderColor: color },
              ]}
              onPress={() => setFilterMuscle(m as any)}
            >
              <Text style={[styles.tabText, active && { color }]}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map(ex => {
          const isSelected = selected.has(ex.name);
          const isAlreadyIn = alreadySelected.includes(ex.name);
          const color = MUSCLE_COLORS[ex.muscle];
          return (
            <TouchableOpacity
              key={ex.name}
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => !isAlreadyIn && toggleSelect(ex.name)}
              activeOpacity={isAlreadyIn ? 1 : 0.7}
            >
              <View style={[styles.muscleDot, { backgroundColor: color }]} />
              <View style={styles.exInfo}>
                <Text style={[styles.exName, isAlreadyIn && { color: colors.textDim }]}>
                  {ex.name}
                </Text>
                <Text style={[styles.muscleTag, { color }]}>{ex.muscle}</Text>
              </View>
              {isAlreadyIn ? (
                <Text style={styles.alreadyTag}>Added</Text>
              ) : isSelected ? (
                <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color={colors.bg} />
                </View>
              ) : (
                <View style={styles.checkCircleEmpty} />
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: selected.size > 0 ? 96 : 32 }} />
      </ScrollView>

      {selected.size > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>
              Add {selected.size} Exercise{selected.size > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, gap: 10,
  },
  backBtn: { padding: 4 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: {
    flex: 1, color: colors.text, fontSize: 14,
    padding: 0,
  },

  tabsRow: { flexGrow: 0 },
  tabsContent: {
    paddingHorizontal: 16, paddingBottom: 10, gap: 8,
    flexDirection: 'row',
  },
  tab: {
    borderWidth: 1, borderRadius: 20, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8,
  },
  rowSelected: {
    borderColor: `${colors.primary}44`,
    backgroundColor: `${colors.primary}0D`,
  },
  muscleDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  exInfo: { flex: 1 },
  exName: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  muscleTag: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  alreadyTag: {
    color: colors.textDim, fontSize: 11, fontWeight: '600',
  },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleEmpty: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },

  footer: {
    paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: colors.bg,
  },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  addBtnText: { color: colors.bg, fontSize: 16, fontWeight: '800' },
});
