const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const admin = require('../admin');

const db = () => admin.firestore();

function serializeDoc(doc) {
  const data = doc.data();
  const out = { id: doc.id };
  for (const [k, v] of Object.entries(data)) {
    out[k] = v?.toDate ? v.toDate().toISOString() : v;
  }
  return out;
}

// Submit a referral — any authenticated member
router.post('/', requireAuth, async (req, res) => {
  try {
    const { referrerName, referrerEmail, refereeName, refereeEmail, refereePhone = '' } = req.body;
    if (!refereeName || !refereeEmail) {
      return res.status(400).json({ error: 'refereeName and refereeEmail are required' });
    }
    await db().collection('referrals').add({
      referrerUid: req.uid,
      referrerName: referrerName ?? '',
      referrerEmail: referrerEmail ?? '',
      refereeName,
      refereeEmail,
      refereePhone,
      read: false,
      createdAt: admin.FieldValue.serverTimestamp(),
    });
    res.status(201).json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all referrals — admin only, newest first
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await db().collection('referrals').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(serializeDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a referral as read — admin only
router.patch('/:id/read', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db().doc(`referrals/${req.params.id}`).update({ read: true });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
