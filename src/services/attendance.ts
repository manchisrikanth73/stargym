import { apiFetch, apiSSE } from './api';

export type CheckinRecord = {
  uid: string;
  displayName: string;
  email: string;
  checkedInAt: string;
  date: string;
};

export async function checkIn(): Promise<boolean> {
  const res = await apiFetch('/attendance/checkin', { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return !data.alreadyCheckedIn;
}

export async function isCheckedInToday(): Promise<boolean> {
  const res = await apiFetch('/attendance/today');
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.checkedIn;
}

export async function getAttendanceDates(): Promise<string[]> {
  const res = await apiFetch('/attendance/dates');
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.dates;
}

export async function getMonthlyCount(year: number, month: number): Promise<number> {
  const res = await apiFetch(`/attendance/monthly?year=${year}&month=${month}`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.count;
}

export async function getMemberCheckinHistory(
  memberUid: string,
  days = 60,
): Promise<{ date: string; checkedInAt: string | null }[]> {
  const res = await apiFetch(`/attendance/${memberUid}/history?days=${days}`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.records;
}

export function subscribeRecentCheckins(cb: (records: CheckinRecord[]) => void): () => void {
  return apiSSE('/sse/checkins', data => cb(data as CheckinRecord[]));
}
