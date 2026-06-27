const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const admin = require('../admin');

const db = () => admin.firestore();
const SAFE_MEMBER_FIELDS = ['displayName', 'phone', 'age', 'gender', 'weightKg', 'photoURL'];

function serializeDoc(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v?.toDate ? v.toDate().toISOString() : v;
  }
  return out;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const todayStr = today();
    const snap = await db().collection('users').orderBy('joinedAt', 'desc').get();
    const toDelete = [];
    const users = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.scheduledDeleteAt && data.scheduledDeleteAt <= todayStr) {
        toDelete.push(doc.ref);
      } else {
        users.push({ ref: doc.ref, data: serializeDoc(data) });
      }
    }
    if (toDelete.length) {
      const batch = db().batch();
      toDelete.forEach(ref => batch.delete(ref));
      await batch.commit();
    }

    const needsId = users.filter(u => !u.data.memberId);
    if (needsId.length) {
      const counterRef = db().doc('gymConfig/memberCounter');
      await db().runTransaction(async tx => {
        const counterSnap = await tx.get(counterRef);
        let lastId = counterSnap.exists ? (counterSnap.data().lastId ?? 1000) : 1000;
        needsId.forEach(u => {
          lastId++;
          const memberId = `SG-${String(lastId).padStart(4, '0')}`;
          tx.update(u.ref, { memberId });
          u.data.memberId = memberId;
        });
        tx.set(counterRef, { lastId }, { merge: true });
      });
    }

    res.json(users.map(u => u.data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:uid', requireAuth, async (req, res) => {
  if (!req.isAdmin && req.uid !== req.params.uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const ref = db().doc(`users/${req.params.uid}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Not found' });
    const data = snap.data();
    if (!data.memberId) {
      const counterRef = db().doc('gymConfig/memberCounter');
      await db().runTransaction(async tx => {
        const counterSnap = await tx.get(counterRef);
        const lastId = counterSnap.exists ? (counterSnap.data().lastId ?? 1000) : 1000;
        const newId = lastId + 1;
        data.memberId = `SG-${String(newId).padStart(4, '0')}`;
        tx.set(counterRef, { lastId: newId }, { merge: true });
        tx.update(ref, { memberId: data.memberId });
      });
    }
    res.json(serializeDoc(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, displayName, phone = '', membershipType = 'basic',
            activationStartDate = null, activationEndDate = null,
            isActive = false, age = null, gender = null } = req.body;
    const uid = `manual_${Date.now()}`;
    const userRef = db().doc(`users/${uid}`);
    const counterRef = db().doc('gymConfig/memberCounter');
    await db().runTransaction(async tx => {
      const counterSnap = await tx.get(counterRef);
      const lastId = counterSnap.exists ? (counterSnap.data().lastId ?? 1000) : 1000;
      const newId = lastId + 1;
      const memberId = `SG-${String(newId).padStart(4, '0')}`;
      tx.set(counterRef, { lastId: newId }, { merge: true });
      tx.set(userRef, {
        uid, email, displayName, phone, role: 'member', memberId,
        membershipType, isActive,
        joinedAt: admin.FieldValue.serverTimestamp(),
        activationStartDate, activationEndDate,
        age, gender, scheduledDeleteAt: null, promoWorkoutExpiry: null,
      });
    });
    res.status(201).json({ uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:uid', requireAuth, async (req, res) => {
  if (!req.isAdmin && req.uid !== req.params.uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    let data = req.body;
    if (!req.isAdmin) {
      data = Object.fromEntries(
        Object.entries(data).filter(([k]) => SAFE_MEMBER_FIELDS.includes(k))
      );
    }
    await db().doc(`users/${req.params.uid}`).update(data);
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:uid', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db().doc(`users/${req.params.uid}`).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:uid/disable', requireAuth, requireAdmin, async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 60);
    await db().doc(`users/${req.params.uid}`).update({
      isActive: false,
      scheduledDeleteAt: cutoff.toISOString().slice(0, 10),
      promoWorkoutExpiry: null,
    });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:uid/enable', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db().doc(`users/${req.params.uid}`).update({
      isActive: true,
      scheduledDeleteAt: null,
    });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
