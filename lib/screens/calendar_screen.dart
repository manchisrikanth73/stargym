import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import '../services/attendance_service.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  final _attendance = AttendanceService();

  Set<DateTime> _presentDays = {};
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
    _loadAttendance();
  }

  Future<void> _loadAttendance() async {
    final dates = await _attendance.getAttendanceDates();
    setState(() {
      _presentDays = dates.map(_normalizeDate).toSet();
      _loading = false;
    });
  }

  DateTime _normalizeDate(DateTime d) => DateTime(d.year, d.month, d.day);

  bool _isPresent(DateTime day) => _presentDays.contains(_normalizeDate(day));

  int get _currentMonthCount {
    return _presentDays.where((d) {
      return d.year == _focusedDay.year && d.month == _focusedDay.month;
    }).length;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        title: const Text(
          'Attendance Calendar',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _monthSummary(cs),
                const SizedBox(height: 8),
                _calendar(cs),
                const SizedBox(height: 16),
                _legend(cs),
              ],
            ),
    );
  }

  Widget _monthSummary(ColorScheme cs) {
    final monthName = DateFormat('MMMM yyyy').format(_focusedDay);
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cs.primary.withOpacity(0.3), cs.primary.withOpacity(0.1)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.primary.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(monthName,
                  style: const TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 4),
              Text(
                '$_currentMonthCount sessions',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: cs.primary,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: cs.primary.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.fitness_center, color: cs.primary, size: 24),
          ),
        ],
      ),
    );
  }

  Widget _calendar(ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: TableCalendar(
        firstDay: DateTime.utc(2024, 1, 1),
        lastDay: DateTime.utc(2026, 12, 31),
        focusedDay: _focusedDay,
        selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
        onDaySelected: (selected, focused) {
          setState(() {
            _selectedDay = selected;
            _focusedDay = focused;
          });
        },
        onPageChanged: (focused) {
          setState(() => _focusedDay = focused);
        },
        calendarStyle: CalendarStyle(
          defaultTextStyle: const TextStyle(color: Colors.white),
          weekendTextStyle: const TextStyle(color: Colors.white70),
          outsideTextStyle: const TextStyle(color: Colors.white24),
          todayDecoration: BoxDecoration(
            color: cs.primary.withOpacity(0.3),
            shape: BoxShape.circle,
          ),
          todayTextStyle: TextStyle(color: cs.primary, fontWeight: FontWeight.bold),
          selectedDecoration: BoxDecoration(
            color: cs.primary,
            shape: BoxShape.circle,
          ),
          selectedTextStyle: const TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
          markerDecoration: BoxDecoration(
            color: cs.secondary,
            shape: BoxShape.circle,
          ),
        ),
        headerStyle: HeaderStyle(
          formatButtonVisible: false,
          titleCentered: true,
          titleTextStyle: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
          leftChevronIcon: const Icon(Icons.chevron_left, color: Colors.white),
          rightChevronIcon: const Icon(Icons.chevron_right, color: Colors.white),
          decoration: BoxDecoration(color: Colors.transparent),
        ),
        daysOfWeekStyle: const DaysOfWeekStyle(
          weekdayStyle: TextStyle(color: Colors.white60, fontWeight: FontWeight.bold),
          weekendStyle: TextStyle(color: Colors.white38, fontWeight: FontWeight.bold),
        ),
        calendarBuilders: CalendarBuilders(
          defaultBuilder: (ctx, day, focused) {
            if (_isPresent(day)) {
              return _presentDayCell(day, cs);
            }
            return null;
          },
          todayBuilder: (ctx, day, focused) {
            if (_isPresent(day)) {
              return _presentDayCell(day, cs, isToday: true);
            }
            return null;
          },
        ),
      ),
    );
  }

  Widget _presentDayCell(DateTime day, ColorScheme cs, {bool isToday = false}) {
    return Container(
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cs.secondary, cs.secondary.withOpacity(0.7)],
        ),
        shape: BoxShape.circle,
        border: isToday
            ? Border.all(color: cs.primary, width: 2)
            : null,
      ),
      child: Center(
        child: Text(
          '${day.day}',
          style: const TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _legend(ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          _legendItem(cs.secondary, 'Present', Colors.black),
          const SizedBox(width: 20),
          _legendItem(cs.primary.withOpacity(0.3), 'Today', Colors.white),
          const SizedBox(width: 20),
          _legendItem(Colors.transparent, 'Absent', Colors.white54,
              border: Colors.white24),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String label, Color textColor, {Color? border}) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: border != null ? Border.all(color: border) : null,
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(color: textColor, fontSize: 12)),
      ],
    );
  }
}
