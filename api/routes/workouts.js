const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const admin = require('../admin');

const db = () => admin.firestore();

function today() {
  return new Date().toISOString().slice(0, 10);
}

router.post('/log', requireAuth, async (req, res) => {
  try {
    const uid = req.uid;
    const { exercises } = req.body;
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: 'exercises array required' });
    }
    const dateKey = today();
    const ref = db().doc(`users/${uid}/workouts/${dateKey}`);
    const snap = await ref.get();
    const now = admin.FieldValue.serverTimestamp();
    await ref.set({
      uid,
      date: dateKey,
      exercises,
      updatedAt: now,
      createdAt: snap.exists ? snap.data().createdAt : now,
    });
    res.json({ date: dateKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/today', requireAuth, async (req, res) => {
  try {
    const snap = await db().doc(`users/${req.uid}/workouts/${today()}`).get();
    if (!snap.exists) return res.status(404).json({ error: 'No log for today' });
    const data = snap.data();
    res.json({
      ...data,
      createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 90);
    const snap = await db()
      .collection(`users/${req.uid}/workouts`)
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    const logs = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
      };
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
