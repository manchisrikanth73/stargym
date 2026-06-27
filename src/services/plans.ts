import { apiFetch } from './api';

export type PlanLevel = 'basic' | 'intermediate' | 'advanced';

export interface PlanExercise {
  id: string;
  name: string;
  workoutType: string;
  sets: number;
  reps: number;
  notes: string;
}

export interface WorkoutPlan {
  level: PlanLevel;
  exercises: PlanExercise[];
}

export async function getPlan(level: PlanLevel): Promise<WorkoutPlan> {
  const res = await apiFetch(`/plans/${level}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function savePlan(level: PlanLevel, exercises: PlanExercise[]): Promise<void> {
  const res = await apiFetch(`/plans/${level}`, {
    method: 'PUT',
    body: JSON.stringify({ exercises }),
  });
  if (!res.ok) throw new Error(await res.text());
}
