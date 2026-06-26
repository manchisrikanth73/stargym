require('dotenv').config();

const express = require('express');
const router = express.Router();

router.use(express.json());

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/auth',       require('./routes/auth'));
router.use('/users',      require('./routes/users'));
router.use('/attendance', require('./routes/attendance'));
router.use('/settings',   require('./routes/settings'));
router.use('/workouts',   require('./routes/workouts'));
router.use('/sse',        require('./routes/sse'));
router.use('/referrals',      require('./routes/referrals'));
router.use('/notifications',  require('./routes/notifications'));
router.use('/errors',     require('./routes/errors'));

module.exports = router;
