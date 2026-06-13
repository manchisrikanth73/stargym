import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../screens/calendar_screen.dart';
import '../screens/checkin_screen.dart';

class GymDrawer extends StatelessWidget {
  final VoidCallback onSignOut;

  const GymDrawer({super.key, required this.onSignOut});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final user = FirebaseAuth.instance.currentUser;
    final name = user?.displayName ?? user?.email?.split('@').first ?? 'Athlete';
    final email = user?.email ?? '';

    return Drawer(
      backgroundColor: const Color(0xFF0D1B2A),
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFF0077B6), cs.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  child: Text(
                    name[0].toUpperCase(),
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  email,
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          _tile(
            context,
            icon: Icons.dashboard_outlined,
            label: 'Dashboard',
            onTap: () => Navigator.pop(context),
          ),
          _tile(
            context,
            icon: Icons.qr_code_scanner,
            label: 'Check In',
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CheckinScreen()),
              );
            },
          ),
          _tile(
            context,
            icon: Icons.calendar_month,
            label: 'Attendance Calendar',
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CalendarScreen()),
              );
            },
          ),
          _tile(
            context,
            icon: Icons.fitness_center,
            label: 'Workouts',
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Workout plans coming soon!')),
              );
            },
          ),
          _tile(
            context,
            icon: Icons.bar_chart,
            label: 'Progress',
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Progress tracking coming soon!')),
              );
            },
          ),
          const Divider(color: Colors.white12),
          _tile(
            context,
            icon: Icons.settings_outlined,
            label: 'Settings',
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Settings coming soon!')),
              );
            },
          ),
          const Spacer(),
          const Divider(color: Colors.white12),
          _tile(
            context,
            icon: Icons.logout,
            label: 'Log Out',
            color: Colors.red.shade400,
            onTap: () {
              Navigator.pop(context);
              onSignOut();
            },
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _tile(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
  }) {
    return ListTile(
      leading: Icon(icon, color: color ?? Colors.white70, size: 22),
      title: Text(
        label,
        style: TextStyle(
          color: color ?? Colors.white,
          fontSize: 15,
          fontWeight: FontWeight.w500,
        ),
      ),
      onTap: onTap,
      horizontalTitleGap: 8,
    );
  }
}
