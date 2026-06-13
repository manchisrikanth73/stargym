import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import '../services/attendance_service.dart';

class CheckinScreen extends StatefulWidget {
  const CheckinScreen({super.key});

  @override
  State<CheckinScreen> createState() => _CheckinScreenState();
}

class _CheckinScreenState extends State<CheckinScreen>
    with SingleTickerProviderStateMixin {
  final _attendance = AttendanceService();
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;

  bool _confirming = false;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnim = Tween(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  String _qrData() {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final date = DateFormat('yyyy-MM-dd').format(DateTime.now());
    return 'stargym:checkin:$uid:$date';
  }

  Future<void> _confirmCheckin() async {
    setState(() => _confirming = true);
    try {
      final success = await _attendance.checkIn();
      if (mounted) {
        setState(() {
          _done = true;
          _confirming = false;
        });
        if (!success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('You already checked in today!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _confirming = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Check-in failed. Please try again.'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final now = DateTime.now();
    final user = FirebaseAuth.instance.currentUser;
    final displayName = user?.displayName ?? user?.email?.split('@').first ?? 'Athlete';

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        title: const Text(
          'Check In',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: _done ? _successView(cs) : _barcodeView(cs, now, displayName),
    );
  }

  Widget _barcodeView(ColorScheme cs, DateTime now, String displayName) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Text(
            DateFormat('EEEE, MMMM d, yyyy').format(now),
            style: const TextStyle(color: Colors.white60, fontSize: 14),
          ),
          const SizedBox(height: 8),
          Text(
            DateFormat('HH:mm').format(now),
            style: TextStyle(
              color: cs.primary,
              fontSize: 40,
              fontWeight: FontWeight.w900,
              letterSpacing: 3,
            ),
          ),
          const SizedBox(height: 32),
          // QR Code card
          AnimatedBuilder(
            animation: _pulseAnim,
            builder: (_, child) => Transform.scale(
              scale: _pulseAnim.value,
              child: child,
            ),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: cs.primary.withOpacity(0.5),
                    blurRadius: 30,
                    spreadRadius: 4,
                  ),
                ],
              ),
              child: QrImageView(
                data: _qrData(),
                version: QrVersions.auto,
                size: 220,
                backgroundColor: Colors.white,
                errorCorrectionLevel: QrErrorCorrectLevel.H,
                embeddedImage: null,
              ),
            ),
          ),
          const SizedBox(height: 28),
          Text(
            displayName.toUpperCase(),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: cs.secondary,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Show this code at the front desk',
            style: const TextStyle(color: Colors.white54, fontSize: 13),
          ),
          const SizedBox(height: 40),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton.icon(
              onPressed: _confirming ? null : _confirmCheckin,
              icon: _confirming
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                    )
                  : const Icon(Icons.check_circle_outline, color: Colors.black),
              label: Text(
                _confirming ? 'Confirming...' : 'Confirm Check-In',
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: cs.secondary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _successView(ColorScheme cs) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [cs.secondary, cs.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, size: 64, color: Colors.white),
            ),
            const SizedBox(height: 32),
            const Text(
              'Check-In Confirmed!',
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            Text(
              'Your attendance for today has been\nmarked on the calendar.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white60, fontSize: 15, height: 1.6),
            ),
            const SizedBox(height: 48),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: cs.primary,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Back to Dashboard',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
