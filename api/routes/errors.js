const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const admin = require('../admin');

router.post('/', requireAuth, async (req, res) => {
  try {
    const { operation, error } = req.body;
    await admin.firestore().collection('errorLogs').add({
      operation: operation ?? 'unknown',
      error: error ?? '',
      uid: req.uid,
      timestamp: admin.FieldValue.serverTimestamp(),
      retries: 3,
    });
    res.status(201).json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
