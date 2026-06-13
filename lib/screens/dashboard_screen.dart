import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/attendance_service.dart';
import '../services/auth_service.dart';
import '../widgets/gym_drawer.dart';
import 'checkin_screen.dart';
import 'calendar_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _attendance = AttendanceService();
  final _auth = AuthService();

  bool _checkedInToday = false;
  int _monthlyCount = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    final now = DateTime.now();
    final [checkedIn, monthly] = await Future.wait([
      _attendance.isCheckedInToday(),
      _attendance.getMonthlyCount(now.year, now.month),
    ]);
    if (mounted) {
      setState(() {
        _checkedInToday = checkedIn as bool;
        _monthlyCount = monthly as int;
        _loading = false;
      });
    }
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  String _displayName() {
    final user = FirebaseAuth.instance.currentUser;
    return user?.displayName ?? user?.email?.split('@').first ?? 'Athlete';
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      drawer: GymDrawer(onSignOut: () => _auth.signOut()),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white),
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CircleAvatar(
              radius: 18,
              backgroundColor: cs.primary.withOpacity(0.2),
              child: Text(
                _displayName()[0].toUpperCase(),
                style: TextStyle(color: cs.primary, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadStats,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _greeting_section(cs),
                    const SizedBox(height: 28),
                    _statsRow(cs),
                    const SizedBox(height: 32),
                    _checkinCard(cs),
                    const SizedBox(height: 24),
                    _quickActions(cs),
                    const SizedBox(height: 24),
                    _motivationBanner(cs),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _greeting_section(ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${_greeting()},',
          style: const TextStyle(fontSize: 16, color: Colors.white60),
        ),
        Text(
          _displayName(),
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _checkedInToday
              ? '✅ You\'re checked in for today!'
              : 'Ready to crush today\'s workout?',
          style: TextStyle(
            color: _checkedInToday ? cs.secondary : Colors.white54,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _statsRow(ColorScheme cs) {
    final now = DateTime.now();
    final monthName = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ][now.month];

    return Row(
      children: [
        Expanded(
          child: _statCard(
            cs,
            icon: Icons.calendar_today,
            value: '$_monthlyCount',
            label: '$monthName Sessions',
            color: cs.primary,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: _statCard(
            cs,
            icon: Icons.local_fire_department,
            value: _checkedInToday ? '🔥' : '—',
            label: 'Today\'s Status',
            color: cs.secondary,
          ),
        ),
      ],
    );
  }

  Widget _statCard(
    ColorScheme cs, {
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF1A2F45),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white54)),
        ],
      ),
    );
  }

  Widget _checkinCard(ColorScheme cs) {
    return GestureDetector(
      onTap: _checkedInToday
          ? null
          : () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CheckinScreen()),
              );
              _loadStats();
            },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
        decoration: BoxDecoration(
          gradient: _checkedInToday
              ? LinearGradient(
                  colors: [
                    cs.secondary.withOpacity(0.3),
                    cs.secondary.withOpacity(0.1),
                  ],
                )
              : const LinearGradient(
                  colors: [Color(0xFF00BFFF), Color(0xFF0077B6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: _checkedInToday
              ? []
              : [
                  BoxShadow(
                    color: const Color(0xFF00BFFF).withOpacity(0.4),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _checkedInToday ? Icons.check_circle : Icons.qr_code_scanner,
                size: 32,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _checkedInToday ? 'Checked In!' : 'Check In Now',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    _checkedInToday
                        ? 'Great work today 💪'
                        : 'Tap to show your barcode',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
              ),
            ),
            if (!_checkedInToday)
              const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _quickActions(ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _actionButton(
                icon: Icons.calendar_month,
                label: 'Attendance',
                color: cs.primary,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CalendarScreen()),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _actionButton(
                icon: Icons.bar_chart,
                label: 'Progress',
                color: const Color(0xFF9B59B6),
                onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Progress tracking coming soon!')),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _actionButton(
                icon: Icons.fitness_center,
                label: 'Workouts',
                color: const Color(0xFFE74C3C),
                onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Workout plans coming soon!')),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _actionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _motivationBanner(ColorScheme cs) {
    const quotes = [
      'Every rep counts. Every session matters.',
      'The pain you feel today is the strength of tomorrow.',
      'You don\'t stop when you\'re tired. You stop when you\'re done.',
    ];
    final quote = quotes[DateTime.now().day % quotes.length];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1A2F45),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.secondary.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.format_quote, color: cs.secondary, size: 20),
          const SizedBox(height: 8),
          Text(
            quote,
            style: const TextStyle(
              fontStyle: FontStyle.italic,
              fontSize: 14,
              color: Colors.white70,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
