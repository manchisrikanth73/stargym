const admin = require('../admin');

async function requireAuth(req, res, next) {
  const header = req.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;

    const snap = await admin.firestore().doc(`users/${decoded.uid}`).get();
    req.role = snap.exists ? (snap.data().role ?? 'member') : 'member';
    req.isAdmin = req.role === 'admin';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
  next();
}

function requireTrainer(req, res, next) {
  if (req.role !== 'trainer' && !req.isAdmin) {
    return res.status(403).json({ error: 'Trainer or admin only' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireTrainer };
