import { apiFetch } from './api';

export type WorkoutSet = {
  reps: number;
  weight: number | null;
  unit: 'kg' | 'lbs';
};

export type LoggedExercise = {
  id: string;
  name: string;
  workoutType: string;
  sets: WorkoutSet[];
};

export type WorkoutLog = {
  uid: string;
  date: string;
  createdAt: string | null;
  updatedAt: string | null;
  exercises: LoggedExercise[];
};

export type PreviousBest = {
  name: string;
  date: string;
  bestSet: { reps: number; weight: number | null; unit: 'kg' | 'lbs' };
};

export async function logWorkout(exercises: LoggedExercise[], targetUid?: string): Promise<void> {
  const res = await apiFetch('/workouts/log', {
    method: 'POST',
    body: JSON.stringify({ exercises, ...(targetUid ? { targetUid } : {}) }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getTodayLog(targetUid?: string): Promise<WorkoutLog | null> {
  const url = targetUid ? `/workouts/today?targetUid=${targetUid}` : '/workouts/today';
  const res = await apiFetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getWorkoutHistory(limit = 30, targetUid?: string): Promise<WorkoutLog[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (targetUid) params.set('targetUid', targetUid);
  const res = await apiFetch(`/workouts/history?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPreviousExercise(name: string, targetUid?: string): Promise<PreviousBest | null> {
  const params = new URLSearchParams({ name });
  if (targetUid) params.set('targetUid', targetUid);
  const res = await apiFetch(`/workouts/previous-exercise?${params}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
