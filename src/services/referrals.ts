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

export interface MemberNotification {
  id: string;
  type: 'referral_sent' | 'legal_update' | 'new_member';
  refereeName?: string;
  refereeEmail?: string;
  refereePhone?: string;
  memberName?: string;
  memberEmail?: string;
  read: boolean;
  createdAt: string;
}

export async function getMemberNotifications(): Promise<MemberNotification[]> {
  const res = await apiFetch('/notifications/mine');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMemberUnreadCount(): Promise<number> {
  const res = await apiFetch('/notifications/unread-count');
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await res.text());
}
