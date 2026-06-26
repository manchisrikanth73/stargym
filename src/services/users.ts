import { apiFetch } from './api';

export type MemberRole = 'admin' | 'member';
export type MembershipType = 'basic' | 'premium' | 'vip';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: MemberRole;
  membershipType: MembershipType;
  isActive: boolean;
  joinedAt: string | null;
  activationStartDate: string | null;
  activationEndDate: string | null;
  age: number | null;
  gender: string | null;
  weightKg: number | null;
  scheduledDeleteAt: string | null;
  promoWorkoutExpiry: string | null;
  photoURL: string | null;
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  age: number | null = null,
  gender = '',
  weightKg: number | null = null,
): Promise<void> {
  const res = await apiFetch('/auth/profile', {
    method: 'POST',
    body: JSON.stringify({ uid, email, displayName, age, gender, weightKg, photoURL: null }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const res = await apiFetch(`/users/${uid}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const res = await apiFetch('/users');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const res = await apiFetch(`/users/${uid}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteUserProfile(uid: string): Promise<void> {
  const res = await apiFetch(`/users/${uid}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}

export async function disableMember(uid: string): Promise<void> {
  const res = await apiFetch(`/users/${uid}/disable`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export async function enableMember(uid: string): Promise<void> {
  const res = await apiFetch(`/users/${uid}/enable`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export async function isCurrentUserAdmin(uid: string): Promise<boolean> {
  const profile = await getUserProfile(uid);
  return profile?.role === 'admin';
}
