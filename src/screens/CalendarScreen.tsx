import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { getAttendanceDates } from '../services/attendance';
import { colors } from '../theme/colors';

type MarkedDates = Record<string, { selected?: boolean; marked?: boolean; selectedColor?: string; dotColor?: string; activeOpacity?: number }>;

export default function CalendarScreen() {
  const navigation = useNavigation();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
  const [monthCount, setMonthCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const dates = await getAttendanceDates();
      const marks: MarkedDates = {};
      dates.forEach(d => {
        marks[d] = {
          selected: true,
          selectedColor: colors.secondary,
          activeOpacity: 0.7,
        };
      });
      setMarkedDates(marks);
      const count = dates.filter(d => d.startsWith(dayjs().format('YYYY-MM'))).length;
      setMonthCount(count);
      setLoading(false);
    })();
  }, []);

  const handleMonthChange = (month: DateData) => {
    const key = `${month.year}-${String(month.month).padStart(2, '0')}`;
    setCurrentMonth(key);
    const count = Object.keys(markedDates).filter(d => d.startsWith(key)).length;
    setMonthCount(count);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Attendance Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Month summary */}
      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryMonth}>{dayjs(currentMonth).format('MMMM YYYY')}</Text>
          <Text style={styles.summaryCount}>{monthCount} sessions</Text>
        </View>
        <View style={styles.summaryIcon}>
          <Ionicons name="fitness-outline" size={24} color={colors.primary} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Calendar
            markedDates={markedDates}
            onMonthChange={handleMonthChange}
            theme={{
              backgroundColor: colors.bg,
              calendarBackground: colors.bg,
              textSectionTitleColor: colors.textMuted,
              selectedDayBackgroundColor: colors.secondary,
              selectedDayTextColor: '#000',
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textDim,
              monthTextColor: colors.text,
              arrowColor: colors.text,
              textMonthFontWeight: '700',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              dotColor: colors.secondary,
            }}
            style={styles.calendar}
          />

          {/* Legend */}
          <View style={styles.legend}>
            <LegendItem color={colors.secondary} label="Present" textColor="#000" />
            <LegendItem color={`${colors.primary}44`} label="Today" textColor={colors.textMuted} />
            <LegendItem color="transparent" label="Absent" textColor={colors.textMuted} border={colors.textDim} />
          </View>
        </>
      )}
    </View>
  );
}

function LegendItem({ color, label, textColor, border }: { color: string; label: string; textColor: string; border?: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderWidth: border ? 1 : 0, borderColor: border }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  heading: { color: colors.text, fontSize: 17, fontWeight: '700' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 18,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  summaryMonth: { color: colors.textMuted, fontSize: 13, marginBottom: 4 },
  summaryCount: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendar: { marginHorizontal: 8 },
  legend: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendLabel: { fontSize: 12 },
});
