const router = require('express').Router();
const admin = require('../admin');

const db = () => admin.firestore();

async function verifyToken(token) {
  if (!token) throw new Error('Missing token');
  const decoded = await admin.auth().verifyIdToken(token);
  const snap = await db().doc(`users/${decoded.uid}`).get();
  const role = snap.exists ? (snap.data().role ?? 'member') : 'member';
  return { uid: decoded.uid, role, isAdmin: role === 'admin' };
}

function startSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);
  res.on('close', () => clearInterval(heartbeat));
  return heartbeat;
}

router.get('/checkins', async (req, res) => {
  try {
    const user = await verifyToken(req.query.token);
    if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });

    startSSE(res);

    const cutoff = admin.Timestamp.fromDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const unsub = db()
      .collection('checkins')
      .where('checkedInAt', '>=', cutoff)
      .orderBy('checkedInAt', 'desc')
      .onSnapshot(snap => {
        const records = snap.docs
          .map(d => {
            const data = d.data();
            return {
              uid: data.uid,
              displayName: data.displayName,
              email: data.email,
              checkedInAt: data.checkedInAt?.toDate?.().toISOString() ?? null,
              date: data.date,
            };
          })
          .filter(r => r.uid && r.checkedInAt);
        res.write(`data: ${JSON.stringify(records)}\n\n`);
      }, err => {
        console.error('[SSE /checkins]', err.message);
        res.end();
      });

    res.on('close', unsub);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/workout-access', async (req, res) => {
  try {
    await verifyToken(req.query.token);
    startSSE(res);

    const unsub = db().doc('gymConfig/membership').onSnapshot(snap => {
      const d = snap.exists ? (snap.data().workoutAccess ?? {}) : {};
      res.write(`data: ${JSON.stringify({
        basic:   d.basic   ?? false,
        premium: d.premium ?? true,
        vip:     d.vip     ?? true,
      })}\n\n`);
    }, err => {
      console.error('[SSE /workout-access]', err.message);
      res.end();
    });

    res.on('close', unsub);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/referrals-unread', async (req, res) => {
  try {
    const user = await verifyToken(req.query.token);
    if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });

    startSSE(res);

    const unsub = db().collection('referrals').where('read', '==', false).onSnapshot(snap => {
      res.write(`data: ${JSON.stringify({ count: snap.size })}\n\n`);
    }, err => {
      console.error('[SSE /referrals-unread]', err.message);
      res.end();
    });

    res.on('close', unsub);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
