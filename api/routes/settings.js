const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const admin = require('../admin');

const settingsRef = () => admin.firestore().doc('gymConfig/membership');

router.get('/membership', requireAuth, async (req, res) => {
  try {
    const snap = await settingsRef().get();
    if (!snap.exists) return res.json({ basic: 0, premium: 0, vip: 0 });
    const d = snap.data();
    res.json({ basic: d.basic ?? 0, premium: d.premium ?? 0, vip: d.vip ?? 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/membership', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { basic, premium, vip } = req.body;
    await settingsRef().set({ basic, premium, vip }, { merge: true });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/workout-access', requireAuth, async (req, res) => {
  try {
    const snap = await settingsRef().get();
    const d = snap.exists ? (snap.data().workoutAccess ?? {}) : {};
    res.json({
      basic:   d.basic   ?? false,
      premium: d.premium ?? true,
      vip:     d.vip     ?? true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/workout-access', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { basic, premium, vip } = req.body;
    await settingsRef().set({ workoutAccess: { basic, premium, vip } }, { merge: true });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
