const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const admin = require('../admin');

const db = () => admin.firestore();

function serializeDoc(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v?.toDate ? v.toDate().toISOString() : v;
  }
  return out;
}

router.post('/profile', requireAuth, async (req, res) => {
  const uid = req.uid;
  const { email, displayName, age = null, gender = '', weightKg = null } = req.body;
  if (!email || !displayName) {
    return res.status(400).json({ error: 'email and displayName required' });
  }
  try {
    const ref = db().doc(`users/${uid}`);
    const existing = await ref.get();
    if (existing.exists) return res.status(200).json({ uid });
    await ref.set({
      uid, email, displayName,
      phone: '',
      role: 'member',
      membershipType: 'basic',
      isActive: false,
      joinedAt: admin.FieldValue.serverTimestamp(),
      activationStartDate: null,
      activationEndDate: null,
      age: age ?? null,
      gender: gender || null,
      weightKg: weightKg ?? null,
      scheduledDeleteAt: null,
      promoWorkoutExpiry: null,
    });
    res.status(201).json({ uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const snap = await db().doc(`users/${req.uid}`).get();
    if (!snap.exists) return res.status(404).json({ error: 'Profile not found' });
    res.json(serializeDoc(snap.data()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
