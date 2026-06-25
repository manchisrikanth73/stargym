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

    // Merge by workoutType: keep exercises from other sections, replace current section's.
    const existing = snap.exists ? (snap.data().exercises || []) : [];
    const payloadTypes = new Set(exercises.map(e => e.workoutType));
    const preserved = existing.filter(e => !payloadTypes.has(e.workoutType));
    const merged = [...preserved, ...exercises];

    await ref.set({
      uid,
      date: dateKey,
      exercises: merged,
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

router.get('/previous-exercise', requireAuth, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'name query param required' });

    const snap = await db()
      .collection(`users/${req.uid}/workouts`)
      .orderBy('date', 'desc')
      .limit(30)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const exercises = data.exercises || [];
      const match = exercises.find(e => e.name === name);
      if (match && match.sets && match.sets.length > 0) {
        const bestSet = match.sets.reduce((best, s) => {
          const score = (s.weight || 0) * s.reps;
          const bestScore = (best.weight || 0) * best.reps;
          return score > bestScore ? s : best;
        }, match.sets[0]);
        return res.json({
          name: match.name,
          date: data.date,
          bestSet: {
            reps: bestSet.reps,
            weight: bestSet.weight ?? null,
            unit: bestSet.unit ?? 'kg',
          },
        });
      }
    }

    res.status(404).json({ error: 'No previous record' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
