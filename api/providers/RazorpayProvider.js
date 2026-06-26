const Razorpay = require('razorpay');
const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');

class RazorpayProvider extends PaymentProvider {
  constructor() {
    super();
    this._client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async createCustomer({ name, email, phone }) {
    const customer = await this._client.customers.create({
      name,
      email,
      contact: phone,
      fail_existing: 0,
    });
    return { customerId: customer.id };
  }

  async createPlan({ name, amount, currency = 'INR', period = 'monthly', interval = 1 }) {
    const plan = await this._client.plans.create({
      period,
      interval,
      item: { name, amount: Math.round(amount * 100), currency },
    });
    return { planId: plan.id };
  }

  async createSubscription({ customerId, planId, totalCount = 120, startAt }) {
    const params = {
      plan_id: planId,
      customer_id: customerId,
      total_count: totalCount,
      quantity: 1,
    };
    if (startAt) params.start_at = startAt;
    const sub = await this._client.subscriptions.create(params);
    return { subscriptionId: sub.id, shortUrl: sub.short_url };
  }

  async cancelSubscription(subscriptionId) {
    await this._client.subscriptions.cancel(subscriptionId);
  }

  async pauseSubscription(subscriptionId) {
    await this._client.subscriptions.pauseSubscription(subscriptionId, { pause_at: 'now' });
  }

  async resumeSubscription(subscriptionId) {
    await this._client.subscriptions.resumeSubscription(subscriptionId, { resume_at: 'now' });
  }

  async getSubscription(subscriptionId) {
    return this._client.subscriptions.fetch(subscriptionId);
  }

  async createOrder({ amount, currency = 'INR', receipt }) {
    const order = await this._client.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
    });
    return { orderId: order.id };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }) {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return expected === signature;
  }

  verifyWebhookSignature(body, signature) {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    return expected === signature;
  }
}

module.exports = RazorpayProvider;
