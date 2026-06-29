const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const admin = require('../admin');

const db = () => admin.firestore();

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function resolveTargetUid(req, targetUid) {
  if (!targetUid || targetUid === req.uid) return req.uid;
  if (req.isAdmin) return targetUid;
  if (req.role === 'trainer') {
    const snap = await db().doc(`users/${req.uid}`).get();
    const assigned = snap.exists ? (snap.data().assignedMemberUids ?? []) : [];
    if (assigned.includes(targetUid)) return targetUid;
  }
  const err = new Error('Forbidden');
  err.status = 403;
  throw err;
}

router.post('/log', requireAuth, async (req, res) => {
  try {
    const { exercises, targetUid: bodyTargetUid } = req.body;
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: 'exercises array required' });
    }
    const uid = await resolveTargetUid(req, bodyTargetUid);
    const dateKey = today();
    const ref = db().doc(`users/${uid}/workouts/${dateKey}`);
    const snap = await ref.get();
    const now = admin.FieldValue.serverTimestamp();
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
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/today', requireAuth, async (req, res) => {
  try {
    const uid = await resolveTargetUid(req, req.query.targetUid);
    const snap = await db().doc(`users/${uid}/workouts/${today()}`).get();
    if (!snap.exists) return res.status(404).json({ error: 'No log for today' });
    const data = snap.data();
    res.json({
      ...data,
      createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const uid = await resolveTargetUid(req, req.query.targetUid);
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 90);
    const snap = await db()
      .collection(`users/${uid}/workouts`)
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
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/previous-exercise', requireAuth, async (req, res) => {
  try {
    const { name, targetUid } = req.query;
    if (!name) return res.status(400).json({ error: 'name query param required' });
    const uid = await resolveTargetUid(req, targetUid);
    const snap = await db()
      .collection(`users/${uid}/workouts`)
      .orderBy('date', 'desc')
      .limit(30)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const match = (data.exercises || []).find(e => e.name === name);
      if (match && match.sets?.length > 0) {
        const bestSet = match.sets.reduce((best, s) => {
          return ((s.weight || 0) * s.reps) > ((best.weight || 0) * best.reps) ? s : best;
        }, match.sets[0]);
        return res.json({ name: match.name, date: data.date, bestSet: { reps: bestSet.reps, weight: bestSet.weight ?? null, unit: bestSet.unit ?? 'kg' } });
      }
    }
    res.status(404).json({ error: 'No previous record' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
