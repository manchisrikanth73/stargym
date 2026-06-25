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

export async function logWorkout(exercises: LoggedExercise[]): Promise<void> {
  const res = await apiFetch('/workouts/log', {
    method: 'POST',
    body: JSON.stringify({ exercises }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getTodayLog(): Promise<WorkoutLog | null> {
  const res = await apiFetch('/workouts/today');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getWorkoutHistory(limit = 30): Promise<WorkoutLog[]> {
  const res = await apiFetch(`/workouts/history?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPreviousExercise(name: string): Promise<PreviousBest | null> {
  const res = await apiFetch(`/workouts/previous-exercise?name=${encodeURIComponent(name)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
