/**
 * Abstract payment provider interface.
 * Implement this to swap in Cashfree, Juspay, or any other processor.
 */
class PaymentProvider {
  /** @returns {Promise<{ customerId: string }>} */
  async createCustomer({ name, email, phone }) { throw new Error('Not implemented'); }

  /** @returns {Promise<{ planId: string }>} */
  async createPlan({ name, amount, currency, period, interval }) { throw new Error('Not implemented'); }

  /** @returns {Promise<{ subscriptionId: string, shortUrl: string }>} */
  async createSubscription({ customerId, planId, totalCount, startAt }) { throw new Error('Not implemented'); }

  async cancelSubscription(subscriptionId) { throw new Error('Not implemented'); }
  async pauseSubscription(subscriptionId) { throw new Error('Not implemented'); }
  async resumeSubscription(subscriptionId) { throw new Error('Not implemented'); }

  /** @returns {Promise<object>} */
  async getSubscription(subscriptionId) { throw new Error('Not implemented'); }

  /** @returns {Promise<{ orderId: string }>} */
  async createOrder({ amount, currency, receipt }) { throw new Error('Not implemented'); }

  /** @returns {boolean} */
  verifyPaymentSignature({ orderId, paymentId, signature }) { throw new Error('Not implemented'); }

  /** @returns {boolean} */
  verifyWebhookSignature(body, signature) { throw new Error('Not implemented'); }
}

module.exports = PaymentProvider;
