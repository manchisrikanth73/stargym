import { apiFetch } from './api';
import { UserProfile } from './users';

export interface TrainerProfile extends UserProfile {
  assignedMemberUids: string[];
}

export async function getTrainers(): Promise<TrainerProfile[]> {
  const res = await apiFetch('/trainers');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createTrainer(payload: { displayName: string; email: string; password: string; phone?: string }): Promise<{ uid: string }> {
  const res = await apiFetch('/trainers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteTrainer(uid: string): Promise<void> {
  const res = await apiFetch(`/trainers/${uid}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export async function getTrainerMembers(trainerUid: string): Promise<UserProfile[]> {
  const res = await apiFetch(`/trainers/${trainerUid}/members`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function assignMember(trainerUid: string, memberUid: string): Promise<void> {
  const res = await apiFetch(`/trainers/${trainerUid}/members`, {
    method: 'POST',
    body: JSON.stringify({ memberUid }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function unassignMember(trainerUid: string, memberUid: string): Promise<void> {
  const res = await apiFetch(`/trainers/${trainerUid}/members/${memberUid}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}
