import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { getAttendanceDates, getMonthlyCount } from '../services/attendance';
import { getWorkoutHistory } from '../services/workouts';
import { getUserProfile } from '../services/users';
import { auth } from '../services/firebase';
import { EXERCISES } from '../data/exercises';
import { calcExerciseCalories } from '../utils/calories';
import { colors } from '../theme/colors';
import dayjs from 'dayjs';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const GOAL = 20;

export default function ProgressScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [thisMonth, setThisMonth] = useState(0);
  const [monthly, setMonthly] = useState<{ label: string; count: number }[]>([]);
  const [thisWeekDates, setThisWeekDates] = useState<string[]>([]);
  const [weekCalories, setWeekCalories] = useState<{ date: string; kcal: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1;

          const uid = auth.currentUser?.uid;
          const [current, allDates, history, profile] = await Promise.all([
            getMonthlyCount(year, month),
            getAttendanceDates(),
            getWorkoutHistory(14),
            uid ? getUserProfile(uid).catch(() => null) : Promise.resolve(null),
          ]);
          setThisMonth(current);
          const bodyWeight = profile?.weightKg ?? 70;
          const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
          const today = dayjs().format('YYYY-MM-DD');
          setThisWeekDates(allDates.filter(d => d >= weekStart && d <= today).reverse());

          const weekLogs = history.filter(w => w.date >= weekStart && w.date <= today);
          const calByDay = weekLogs.map(w => ({
            date: w.date,
            kcal: Math.round(w.exercises.reduce((acc, ex) => {
              const exDef = EXERCISES.find(e => e.name === ex.name);
              const tracking = exDef?.tracking ?? 'weighted';
              const sets = ex.sets.map(s => ({
                reps: s.reps,
                weight: s.weight,
                duration: tracking === 'duration' ? s.reps : 0,
              }));
              return acc + calcExerciseCalories(ex.name, tracking, sets, bodyWeight);
            }, 0)),
          })).filter(d => d.kcal > 0).sort((a, b) => b.date.localeCompare(a.date));
          setWeekCalories(calByDay);

          const past: { label: string; count: number }[] = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(year, month - 1 - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const count = await getMonthlyCount(y, m);
            past.push({ label: MONTHS[m - 1], count });
          }
          setMonthly(past);
        } catch (e) {
          // silently ignore
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const pct = Math.min(thisMonth / GOAL, 1);
  const maxCount = Math.max(...monthly.map(m => m.count), 1);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>My Progress</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* This month card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>This Month</Text>
            <Text style={styles.bigNumber}>{thisMonth}<Text style={styles.bigGoal}> / {GOAL}</Text></Text>
            <Text style={styles.cardSub}>check-ins · goal {GOAL} sessions</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pct * 100}%` as any }]} />
            </View>
            <Text style={styles.progressPct}>{Math.round(pct * 100)}% of monthly goal</Text>
          </View>

          {/* Monthly breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Last 6 Months</Text>
            <View style={styles.barChart}>
              {monthly.map(m => (
                <View key={m.label} style={styles.barCol}>
                  <Text style={styles.barCount}>{m.count > 0 ? m.count : ''}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { height: `${(m.count / maxCount) * 100}%` as any }]} />
                  </View>
                  <Text style={styles.barLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* This week check-ins */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>This Week Check-ins</Text>
            {thisWeekDates.length === 0 ? (
              <Text style={styles.empty}>No check-ins this week</Text>
            ) : (
              thisWeekDates.map((date, i) => (
                <View key={date} style={[styles.dateRow, i < thisWeekDates.length - 1 && styles.dateRowBorder]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.dateText}>{dayjs(date).format('DD MMM YYYY')}</Text>
                  <Text style={styles.dateDow}>{dayjs(date).format('ddd')}</Text>
                </View>
              ))
            )}
          </View>

          {/* This week calories */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>This Week Calories</Text>
            {weekCalories.length === 0 ? (
              <Text style={styles.empty}>No workouts logged this week</Text>
            ) : (
              <>
                <View style={styles.weekKcalTotal}>
                  <Text style={styles.weekKcalValue}>
                    {weekCalories.reduce((s, d) => s + d.kcal, 0).toLocaleString()}
                  </Text>
                  <Text style={styles.weekKcalUnit}>kcal total</Text>
                </View>
                {weekCalories.map((d, i) => (
                  <View key={d.date} style={[styles.dateRow, i < weekCalories.length - 1 && styles.dateRowBorder]}>
                    <Ionicons name="flame" size={16} color="#FF6B35" />
                    <Text style={styles.dateText}>{dayjs(d.date).format('DD MMM YYYY')}</Text>
                    <Text style={styles.dateDow}>{dayjs(d.date).format('ddd')}</Text>
                    <Text style={styles.kcalBadge}>{d.kcal} kcal</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 44, marginBottom: 24,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  bigNumber: { color: colors.text, fontSize: 48, fontWeight: '900', lineHeight: 54 },
  bigGoal: { color: colors.textMuted, fontSize: 24, fontWeight: '400' },
  cardSub: { color: colors.textMuted, fontSize: 13, marginBottom: 14 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressPct: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barCount: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  barBg: { width: '100%', flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: `${colors.primary}99`, borderRadius: 4 },
  barLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  dateRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  dateText: { flex: 1, color: colors.text, fontSize: 14 },
  dateDow: { color: colors.textMuted, fontSize: 12 },
  empty: { color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  weekKcalTotal: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 },
  weekKcalValue: { color: '#FF6B35', fontSize: 36, fontWeight: '900' },
  weekKcalUnit: { color: colors.textMuted, fontSize: 13 },
  kcalBadge: { color: '#FF6B35', fontSize: 13, fontWeight: '700' },
});
