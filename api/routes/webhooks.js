const router = require('express').Router();
const admin = require('../admin');
const RazorpayProvider = require('../providers/RazorpayProvider');

const db = () => admin.firestore();

let _provider = null;
const provider = () => {
  if (!_provider) _provider = new RazorpayProvider();
  return _provider;
};

const GRACE_PERIOD_DAYS       = 7;
const MEMBERSHIP_EXTENSION_DAYS = 30;

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function findUidBySubscription(subscriptionId) {
  const snap = await db()
    .collection('payments')
    .where('subscriptionId', '==', subscriptionId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

async function logEvent(uid, eventType, razorpayId, amount, status) {
  try {
    await db().collection('paymentEvents').add({
      uid,
      eventType,
      razorpayId: razorpayId || '',
      amount: amount ?? null,
      status: status || '',
      createdAt: admin.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Audit log failure must not trigger a Razorpay retry — state is already written.
    console.error(`[webhook] logEvent failed for ${eventType} uid=${uid}:`, err.message);
  }
}

// POST /webhooks/razorpay
// Receives raw body (express.raw applied in api/index.js before this router)
router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body; // Buffer

  if (!provider().verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { event: eventType } = event;
  const now = admin.FieldValue.serverTimestamp();
  const today = new Date().toISOString().slice(0, 10);

  try {
    switch (eventType) {
      case 'subscription.activated': {
        const sub = event.payload?.subscription?.entity;
        if (!sub) break;
        const uid = await findUidBySubscription(sub.id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${sub.id} not found`); break; }
        const nextBilling = sub.charge_at
          ? new Date(sub.charge_at * 1000).toISOString().slice(0, 10)
          : null;
        const batch = db().batch();
        batch.update(db().doc(`payments/${uid}`), {
          mandateStatus: 'active', nextBillingDate: nextBilling, graceUntil: null, updatedAt: now,
        });
        batch.update(db().doc(`users/${uid}`), {
          activationEndDate: addDays(today, MEMBERSHIP_EXTENSION_DAYS), isActive: true,
        });
        await batch.commit();
        await logEvent(uid, eventType, sub.id, null, 'active');
        break;
      }

      case 'subscription.charged': {
        const sub = event.payload?.subscription?.entity;
        const payment = event.payload?.payment?.entity;
        if (!sub) break;
        const uid = await findUidBySubscription(sub.id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${sub.id} not found`); break; }
        const nextBilling = sub.charge_at
          ? new Date(sub.charge_at * 1000).toISOString().slice(0, 10)
          : null;
        const batch = db().batch();
        batch.update(db().doc(`payments/${uid}`), {
          nextBillingDate: nextBilling, failedPaymentCount: 0, graceUntil: null, updatedAt: now,
        });
        batch.update(db().doc(`users/${uid}`), {
          activationEndDate: addDays(today, MEMBERSHIP_EXTENSION_DAYS), isActive: true,
        });
        await batch.commit();
        await logEvent(uid, eventType, payment?.id || sub.id, payment ? payment.amount / 100 : null, 'charged');
        break;
      }

      case 'subscription.completed': {
        const sub = event.payload?.subscription?.entity;
        if (!sub) break;
        const uid = await findUidBySubscription(sub.id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${sub.id} not found`); break; }
        await db().doc(`payments/${uid}`).update({ mandateStatus: 'completed', updatedAt: now });
        await logEvent(uid, eventType, sub.id, null, 'completed');
        break;
      }

      case 'subscription.cancelled': {
        const sub = event.payload?.subscription?.entity;
        if (!sub) break;
        const uid = await findUidBySubscription(sub.id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${sub.id} not found`); break; }
        const batch = db().batch();
        batch.update(db().doc(`payments/${uid}`), { mandateStatus: 'cancelled', updatedAt: now });
        batch.update(db().doc(`users/${uid}`), { isActive: false });
        await batch.commit();
        await logEvent(uid, eventType, sub.id, null, 'cancelled');
        break;
      }

      case 'subscription.halted': {
        const sub = event.payload?.subscription?.entity;
        if (!sub) break;
        const uid = await findUidBySubscription(sub.id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${sub.id} not found`); break; }
        await db().doc(`payments/${uid}`).update({
          mandateStatus: 'halted',
          graceUntil: addDays(today, GRACE_PERIOD_DAYS),
          updatedAt: now,
        });
        await logEvent(uid, eventType, sub.id, null, 'halted');
        break;
      }

      case 'subscription.paused': {
        const sub = event.payload?.subscription?.entity;
        if (!sub) break;
        const uid = await findUidBySubscription(sub.id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${sub.id} not found`); break; }
        await db().doc(`payments/${uid}`).update({ mandateStatus: 'paused', updatedAt: now });
        await logEvent(uid, eventType, sub.id, null, 'paused');
        break;
      }

      case 'subscription.resumed': {
        const sub = event.payload?.subscription?.entity;
        if (!sub) break;
        const uid = await findUidBySubscription(sub.id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${sub.id} not found`); break; }
        await db().doc(`payments/${uid}`).update({ mandateStatus: 'active', updatedAt: now });
        await logEvent(uid, eventType, sub.id, null, 'active');
        break;
      }

      case 'payment.captured': {
        const payment = event.payload?.payment?.entity;
        if (!payment?.subscription_id) break;
        const uid = await findUidBySubscription(payment.subscription_id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${payment.subscription_id} not found`); break; }
        await logEvent(uid, eventType, payment.id, payment.amount / 100, 'captured');
        break;
      }

      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        if (!payment?.subscription_id) break;
        const uid = await findUidBySubscription(payment.subscription_id);
        if (!uid) { console.warn(`[webhook] ${eventType}: subscription ${payment.subscription_id} not found`); break; }
        await db().doc(`payments/${uid}`).update({
          failedPaymentCount: admin.FieldValue.increment(1), updatedAt: now,
        });
        await logEvent(uid, eventType, payment.id, payment.amount / 100, 'failed');
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${eventType}`);
    }
  } catch (err) {
    // Return 500 so Razorpay retries — a Firestore write failed and the state was not saved.
    console.error(`[webhook] ${eventType} failed — Razorpay will retry:`, err.message);
    return res.status(500).json({ error: 'Internal error' });
  }

  res.json({ received: true });
});

module.exports = router;
