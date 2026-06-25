import { apiFetch, apiSSE } from './api';

export type MembershipPrices = {
  basic: number;
  premium: number;
  vip: number;
};

export type WorkoutAccess = {
  basic: boolean;
  premium: boolean;
  vip: boolean;
};

export async function getMembershipPrices(): Promise<MembershipPrices> {
  const res = await apiFetch('/settings/membership');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function setMembershipPrices(prices: MembershipPrices): Promise<void> {
  const res = await apiFetch('/settings/membership', {
    method: 'PUT',
    body: JSON.stringify(prices),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getWorkoutAccess(): Promise<WorkoutAccess> {
  const res = await apiFetch('/settings/workout-access');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function setWorkoutAccess(access: WorkoutAccess): Promise<void> {
  const res = await apiFetch('/settings/workout-access', {
    method: 'PUT',
    body: JSON.stringify(access),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function subscribeWorkoutAccess(cb: (access: WorkoutAccess) => void): () => void {
  return apiSSE('/sse/workout-access', data => cb(data as WorkoutAccess));
}
