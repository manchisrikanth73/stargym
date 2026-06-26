const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
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

// Get the current user's notifications, newest first
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const snap = await db()
      .collection('notifications')
      .where('recipientUid', '==', req.uid)
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snap.docs.map(serializeDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a notification as read — only the recipient can do this
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const doc = await db().doc(`notifications/${req.params.id}`).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    if (doc.data().recipientUid !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await doc.ref.update({ read: true });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
