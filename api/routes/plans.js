const router = require('express').Router();
const { requireAuth, requireTrainer } = require('../middleware/auth');
const admin = require('../admin');

const db = () => admin.firestore();
const LEVELS = ['basic', 'intermediate', 'advanced'];

router.get('/:level', requireAuth, requireTrainer, async (req, res) => {
  const { level } = req.params;
  if (!LEVELS.includes(level)) return res.status(400).json({ error: 'Invalid level' });
  try {
    const snap = await db().doc(`workoutPlans/${req.uid}_${level}`).get();
    if (!snap.exists) return res.json({ level, exercises: [] });
    res.json(snap.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:level', requireAuth, requireTrainer, async (req, res) => {
  const { level } = req.params;
  if (!LEVELS.includes(level)) return res.status(400).json({ error: 'Invalid level' });
  const { exercises } = req.body;
  if (!Array.isArray(exercises)) return res.status(400).json({ error: 'exercises array required' });
  try {
    await db().doc(`workoutPlans/${req.uid}_${level}`).set({
      trainerUid: req.uid,
      level,
      exercises,
      updatedAt: admin.FieldValue.serverTimestamp(),
    });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
