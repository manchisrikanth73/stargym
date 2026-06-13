import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AttendanceService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  CollectionReference<Map<String, dynamic>> get _attendanceRef =>
      _db.collection('users').doc(_uid).collection('attendance');

  String _dateKey(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  Future<bool> checkIn() async {
    final today = DateTime.now();
    final key = _dateKey(today);
    final doc = _attendanceRef.doc(key);
    final snap = await doc.get();
    if (snap.exists) return false; // already checked in today

    await doc.set({
      'date': Timestamp.fromDate(today),
      'checkedInAt': FieldValue.serverTimestamp(),
      'uid': _uid,
    });
    return true;
  }

  Future<bool> isCheckedInToday() async {
    final key = _dateKey(DateTime.now());
    final snap = await _attendanceRef.doc(key).get();
    return snap.exists;
  }

  Future<List<DateTime>> getAttendanceDates() async {
    final query = await _attendanceRef.orderBy('date', descending: false).get();
    return query.docs.map((doc) {
      final ts = doc['date'] as Timestamp;
      return ts.toDate();
    }).toList();
  }

  Future<int> getMonthlyCount(int year, int month) async {
    final start = DateTime(year, month, 1);
    final end = DateTime(year, month + 1, 1);
    final query = await _attendanceRef
        .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(start))
        .where('date', isLessThan: Timestamp.fromDate(end))
        .get();
    return query.docs.length;
  }
}
