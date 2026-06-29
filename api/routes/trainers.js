const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const admin = require('../admin');

const db = () => admin.firestore();

function serializeDoc(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v?.toDate ? v.toDate().toISOString() : v;
  }
  return out;
}

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { email, displayName, password, phone = '' } = req.body;
  if (!email || !displayName || !password) {
    return res.status(400).json({ error: 'email, displayName, and password required' });
  }
  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName });
    const uid = userRecord.uid;
    const counterRef = db().doc('gymConfig/memberCounter');
    let memberId;
    await db().runTransaction(async tx => {
      const counterSnap = await tx.get(counterRef);
      const lastId = counterSnap.exists ? (counterSnap.data().lastId ?? 1000) : 1000;
      const newId = lastId + 1;
      memberId = `SG-${String(newId).padStart(4, '0')}`;
      tx.set(counterRef, { lastId: newId }, { merge: true });
      tx.set(db().doc(`users/${uid}`), {
        uid, email, displayName, phone, memberId,
        role: 'trainer',
        membershipType: 'basic',
        isActive: true,
        joinedAt: admin.FieldValue.serverTimestamp(),
        activationStartDate: null,
        activationEndDate: null,
        age: null, gender: null, weightKg: null,
        scheduledDeleteAt: null,
        promoWorkoutExpiry: null,
        assignedMemberUids: [],
      });
    });
    res.status(201).json({ uid });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await db().collection('users').where('role', '==', 'trainer').get();
    res.json(snap.docs.map(d => serializeDoc(d.data())));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:uid', requireAuth, requireAdmin, async (req, res) => {
  try {
    await admin.auth().deleteUser(req.params.uid);
    await db().doc(`users/${req.params.uid}`).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /trainers/member/:memberUid — find which trainer is assigned to a specific member
router.get('/member/:memberUid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await db().collection('users')
      .where('role', '==', 'trainer')
      .where('assignedMemberUids', 'array-contains', req.params.memberUid)
      .limit(1)
      .get();
    res.json(snap.empty ? null : serializeDoc(snap.docs[0].data()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:uid/members', requireAuth, async (req, res) => {
  const { uid } = req.params;
  if (!req.isAdmin && req.uid !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const trainerSnap = await db().doc(`users/${uid}`).get();
    if (!trainerSnap.exists) return res.status(404).json({ error: 'Trainer not found' });
    const assignedUids = trainerSnap.data().assignedMemberUids ?? [];
    if (assignedUids.length === 0) return res.json([]);
    const memberDocs = await Promise.all(assignedUids.map(muid => db().doc(`users/${muid}`).get()));
    res.json(memberDocs.filter(d => d.exists && d.data().isActive !== false).map(d => serializeDoc(d.data())));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:uid/members', requireAuth, requireAdmin, async (req, res) => {
  const { memberUid } = req.body;
  if (!memberUid) return res.status(400).json({ error: 'memberUid required' });
  try {
    await db().doc(`users/${req.params.uid}`).update({
      assignedMemberUids: admin.FieldValue.arrayUnion(memberUid),
    });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:uid/members/:memberUid', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db().doc(`users/${req.params.uid}`).update({
      assignedMemberUids: admin.FieldValue.arrayRemove(req.params.memberUid),
    });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
