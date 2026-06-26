import { apiFetch, apiSSE } from './api';

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referrerName: string;
  referrerEmail: string;
  refereeName: string;
  refereeEmail: string;
  refereePhone: string;
  read: boolean;
  createdAt: string;
}

export interface SubmitReferralPayload {
  referrerName: string;
  referrerEmail: string;
  refereeName: string;
  refereeEmail: string;
  refereePhone: string;
}

export async function submitReferral(payload: SubmitReferralPayload): Promise<void> {
  const res = await apiFetch('/referrals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getReferrals(): Promise<ReferralRecord[]> {
  const res = await apiFetch('/referrals');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function markReferralRead(id: string): Promise<void> {
  const res = await apiFetch(`/referrals/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await res.text());
}

export function subscribeReferralUnreadCount(cb: (count: number) => void): () => void {
  return apiSSE('/sse/referrals-unread', data => cb((data as any).count ?? 0));
}
