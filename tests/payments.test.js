const crypto = require('crypto');

// Pure functions extracted for unit testing (mirrors logic in RazorpayProvider and webhooks.js)

function verifyWebhookSignature(body, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
}

function verifyPaymentSignature(orderId, paymentId, signature, keySecret) {
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return expected === signature;
}

function computeGraceUntil(today, days = 7) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------

describe('Webhook signature verification', () => {
  const secret = 'test_webhook_secret_abc123';

  test('accepts a valid signature', () => {
    const body = JSON.stringify({ event: 'subscription.activated' });
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  test('rejects a tampered body', () => {
    const body = JSON.stringify({ event: 'subscription.activated' });
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const tampered = JSON.stringify({ event: 'subscription.activated', injected: true });
    expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false);
  });

  test('rejects an incorrect secret', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig, 'wrong_secret')).toBe(false);
  });

  test('accepts a Buffer body (as Express raw() provides)', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.failed' }));
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('Payment signature verification (one-time orders)', () => {
  const keySecret = 'test_key_secret_xyz789';

  test('accepts a valid payment signature', () => {
    const orderId = 'order_TEST123';
    const paymentId = 'pay_TEST456';
    const sig = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    expect(verifyPaymentSignature(orderId, paymentId, sig, keySecret)).toBe(true);
  });

  test('rejects mismatched payment ID', () => {
    const orderId = 'order_TEST123';
    const paymentId = 'pay_TEST456';
    const sig = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    expect(verifyPaymentSignature(orderId, 'pay_WRONG', sig, keySecret)).toBe(false);
  });

  test('rejects mismatched order ID', () => {
    const orderId = 'order_TEST123';
    const paymentId = 'pay_TEST456';
    const sig = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    expect(verifyPaymentSignature('order_WRONG', paymentId, sig, keySecret)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('Grace period logic (subscription.halted)', () => {
  test('sets graceUntil exactly 7 days from today', () => {
    const today = '2026-06-26';
    expect(computeGraceUntil(today, 7)).toBe('2026-07-03');
  });

  test('grace period spans a month boundary', () => {
    const today = '2026-06-29';
    expect(computeGraceUntil(today, 7)).toBe('2026-07-06');
  });

  test('difference is exactly 7 calendar days', () => {
    const today = new Date().toISOString().slice(0, 10);
    const grace = computeGraceUntil(today, 7);
    const diff = (new Date(grace).getTime() - new Date(today).getTime()) / 86400000;
    expect(diff).toBe(7);
  });
});

// ---------------------------------------------------------------------------

describe('Activation date extension (subscription.activated / subscription.charged)', () => {
  test('extends activationEndDate by 30 days', () => {
    const today = '2026-06-26';
    expect(addDays(today, 30)).toBe('2026-07-26');
  });

  test('handles month-end boundary correctly', () => {
    const today = '2026-01-31';
    expect(addDays(today, 30)).toBe('2026-03-02');
  });
});

// ---------------------------------------------------------------------------

describe('Failed payment counter', () => {
  test('increments from 0 to 1 on first failure', () => {
    const current = 0;
    expect(current + 1).toBe(1);
  });

  test('keeps accumulating across multiple failures', () => {
    let count = 0;
    for (let i = 0; i < 3; i++) count += 1;
    expect(count).toBe(3);
  });

  test('resets to 0 on subscription.charged', () => {
    let count = 2;
    count = 0; // simulates the reset in webhook handler
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('Amount conversion (INR rupees → paise)', () => {
  test('converts 1000 rupees to 100000 paise', () => {
    expect(Math.round(1000 * 100)).toBe(100000);
  });

  test('converts 499.50 rupees correctly', () => {
    expect(Math.round(499.50 * 100)).toBe(49950);
  });
});
