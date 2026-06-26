import { apiFetch } from './api';

export interface SubscriptionStatus {
  subscriptionId: string | null;
  razorpayCustomerId: string | null;
  mandateStatus: 'pending' | 'active' | 'paused' | 'cancelled' | 'halted' | 'completed' | null;
  amount: number | null;
  frequency: string | null;
  nextBillingDate: string | null;
  graceUntil: string | null;
  failedPaymentCount: number;
}

export interface PaymentEvent {
  id: string;
  eventType: string;
  razorpayId: string;
  amount: number | null;
  status: string;
  createdAt: string | null;
}

export async function createSubscription(uid: string, membershipType: string, amount: number): Promise<{ subscriptionId: string; shortUrl: string }> {
  const res = await apiFetch(`/payments/subscribe/${uid}`, {
    method: 'POST',
    body: JSON.stringify({ membershipType, amount }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createOrder(uid: string, amount: number): Promise<{ orderId: string; keyId: string }> {
  const res = await apiFetch(`/payments/order/${uid}`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPaymentStatus(uid: string): Promise<SubscriptionStatus> {
  const res = await apiFetch(`/payments/status/${uid}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPaymentHistory(uid: string): Promise<PaymentEvent[]> {
  const res = await apiFetch(`/payments/history/${uid}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function cancelSubscription(uid: string): Promise<void> {
  const res = await apiFetch(`/payments/cancel/${uid}`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export async function pauseSubscription(uid: string): Promise<void> {
  const res = await apiFetch(`/payments/pause/${uid}`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export async function resumeSubscription(uid: string): Promise<void> {
  const res = await apiFetch(`/payments/resume/${uid}`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}
