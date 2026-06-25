const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const admin = require('../admin');

const db = () => admin.firestore();

function today() {
  return new Date().toISOString().slice(0, 10);
}

router.post('/checkin', requireAuth, async (req, res) => {
  try {
    const uid = req.uid;
    const key = today();
    const attendanceRef = db().doc(`users/${uid}/attendance/${key}`);
    const snap = await attendanceRef.get();
    if (snap.exists) return res.json({ alreadyCheckedIn: true });

    const userSnap = await db().doc(`users/${uid}`).get();
    const user = userSnap.exists ? userSnap.data() : {};

    const batch = db().batch();
    batch.set(attendanceRef, {
      date: admin.Timestamp.fromDate(new Date()),
      checkedInAt: admin.FieldValue.serverTimestamp(),
      uid,
    });
    batch.set(db().doc(`checkins/${uid}_${key}`), {
      uid,
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      checkedInAt: admin.FieldValue.serverTimestamp(),
      date: key,
    });
    await batch.commit();
    res.json({ alreadyCheckedIn: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/today', requireAuth, async (req, res) => {
  try {
    const snap = await db().doc(`users/${req.uid}/attendance/${today()}`).get();
    res.json({ checkedIn: snap.exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dates', requireAuth, async (req, res) => {
  try {
    const snap = await db()
      .collection(`users/${req.uid}/attendance`)
      .orderBy('date')
      .get();
    const dates = snap.docs.map(d => {
      const ts = d.data().date;
      return ts?.toDate ? ts.toDate().toISOString().slice(0, 10) : d.id;
    });
    res.json({ dates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    if (!year || !month) return res.status(400).json({ error: 'year and month required' });
    const start = admin.Timestamp.fromDate(new Date(year, month - 1, 1));
    const end = admin.Timestamp.fromDate(new Date(year, month, 1));
    const snap = await db()
      .collection(`users/${req.uid}/attendance`)
      .where('date', '>=', start)
      .where('date', '<', end)
      .get();
    res.json({ count: snap.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:uid/history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 60;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const snap = await db()
      .collection(`users/${req.params.uid}/attendance`)
      .where('date', '>=', admin.Timestamp.fromDate(cutoff))
      .orderBy('date', 'desc')
      .get();
    const records = snap.docs.map(d => ({
      date: d.id,
      checkedInAt: d.data().checkedInAt?.toDate?.().toISOString() ?? null,
    }));
    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
