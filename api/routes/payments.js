const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const admin = require('../admin');
const RazorpayProvider = require('../providers/RazorpayProvider');

const db = () => admin.firestore();

let _provider = null;
const provider = () => {
  if (!_provider) _provider = new RazorpayProvider();
  return _provider;
};

const payDoc = uid => db().doc(`payments/${uid}`);

const SUBSCRIPTION_TOTAL_COUNT = 120; // 10-year billing horizon; Razorpay requires a finite count

// POST /payments/subscribe/:uid — admin creates subscription for a member
router.post('/subscribe/:uid', requireAuth, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { membershipType, amount } = req.body;
  if (!membershipType || !amount) {
    return res.status(400).json({ error: 'membershipType and amount are required' });
  }
  try {
    const userSnap = await db().doc(`users/${uid}`).get();
    if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });
    const user = userSnap.data();

    // Get or create Razorpay customer
    const existing = await payDoc(uid).get();
    let razorpayCustomerId = existing.exists ? existing.data().razorpayCustomerId : null;
    if (!razorpayCustomerId) {
      const result = await provider().createCustomer({
        name: user.displayName || 'Member',
        email: user.email || '',
        phone: user.phone || '',
      });
      razorpayCustomerId = result.customerId;
    }

    // Get or create Razorpay plan (cached in Firestore)
    const planKey = `${membershipType}_${amount}`;
    const planCacheSnap = await db().doc('gymConfig/razorpayPlans').get();
    let planId = planCacheSnap.exists ? planCacheSnap.data()?.[planKey] : null;
    if (!planId) {
      const planName = `${membershipType.charAt(0).toUpperCase() + membershipType.slice(1)} Membership`;
      const result = await provider().createPlan({ name: planName, amount: Number(amount) });
      planId = result.planId;
      await db().doc('gymConfig/razorpayPlans').set({ [planKey]: planId }, { merge: true });
    }

    const { subscriptionId, shortUrl } = await provider().createSubscription({
      customerId: razorpayCustomerId,
      planId,
      totalCount: SUBSCRIPTION_TOTAL_COUNT,
    });

    const now = admin.FieldValue.serverTimestamp();
    await payDoc(uid).set({
      razorpayCustomerId,
      subscriptionId,
      planId,
      mandateStatus: 'pending',
      amount: Number(amount),
      frequency: 'monthly',
      nextBillingDate: null,
      failedPaymentCount: 0,
      graceUntil: null,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    res.json({ subscriptionId, shortUrl });
  } catch (err) {
    console.error('[payments/subscribe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /payments/order/:uid — admin creates one-time payment order
router.post('/order/:uid', requireAuth, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  try {
    const { orderId } = await provider().createOrder({
      amount: Number(amount),
      receipt: `${uid}_${Date.now()}`,
    });
    res.json({ orderId, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('[payments/order]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /payments/verify — verify one-time payment signature
router.post('/verify', requireAuth, async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: 'orderId, paymentId, and signature are required' });
  }
  const valid = provider().verifyPaymentSignature({ orderId, paymentId, signature });
  if (!valid) return res.status(400).json({ error: 'Invalid signature' });
  res.json({ verified: true });
});

// GET /payments/status/:uid — get subscription status
router.get('/status/:uid', requireAuth, async (req, res) => {
  const { uid } = req.params;
  if (!req.isAdmin && req.uid !== uid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const snap = await payDoc(uid).get();
    if (!snap.exists) return res.json({ mandateStatus: null, failedPaymentCount: 0 });
    const d = snap.data();
    res.json({
      subscriptionId: d.subscriptionId ?? null,
      razorpayCustomerId: d.razorpayCustomerId ?? null,
      mandateStatus: d.mandateStatus ?? null,
      amount: d.amount ?? null,
      frequency: d.frequency ?? null,
      nextBillingDate: d.nextBillingDate ?? null,
      graceUntil: d.graceUntil ?? null,
      failedPaymentCount: d.failedPaymentCount ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /payments/history/:uid — get payment events (last 20, sorted in JS)
router.get('/history/:uid', requireAuth, async (req, res) => {
  const { uid } = req.params;
  if (!req.isAdmin && req.uid !== uid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const snap = await db().collection('paymentEvents').where('uid', '==', uid).get();
    const events = snap.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          eventType: data.eventType,
          razorpayId: data.razorpayId,
          amount: data.amount ?? null,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 20);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /payments/cancel/:uid
router.post('/cancel/:uid', requireAuth, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  try {
    const snap = await payDoc(uid).get();
    if (!snap.exists || !snap.data().subscriptionId) {
      return res.status(404).json({ error: 'No active subscription' });
    }
    await provider().cancelSubscription(snap.data().subscriptionId);
    await payDoc(uid).update({ mandateStatus: 'cancelled', updatedAt: admin.FieldValue.serverTimestamp() });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /payments/pause/:uid
router.post('/pause/:uid', requireAuth, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  try {
    const snap = await payDoc(uid).get();
    if (!snap.exists || !snap.data().subscriptionId) {
      return res.status(404).json({ error: 'No active subscription' });
    }
    await provider().pauseSubscription(snap.data().subscriptionId);
    await payDoc(uid).update({ mandateStatus: 'paused', updatedAt: admin.FieldValue.serverTimestamp() });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /payments/resume/:uid
router.post('/resume/:uid', requireAuth, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  try {
    const snap = await payDoc(uid).get();
    if (!snap.exists || !snap.data().subscriptionId) {
      return res.status(404).json({ error: 'No active subscription' });
    }
    await provider().resumeSubscription(snap.data().subscriptionId);
    await payDoc(uid).update({ mandateStatus: 'active', updatedAt: admin.FieldValue.serverTimestamp() });
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
