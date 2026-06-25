import { ExerciseTracking } from '../data/exercises';

// MET (Metabolic Equivalent of Task) values per exercise.
// Sources: Compendium of Physical Activities (Ainsworth et al., 2011) and
// ACSM Guidelines for Exercise Testing and Prescription (10th ed.).
const EXERCISE_MET: Record<string, number> = {
  // ── Cardio machines / duration ────────────────────────────────
  'Treadmill Run':       9.8,
  'Cycling':             7.5,
  'Rowing Machine':      8.5,
  'Jump Rope':          11.8,
  'Stair Climber':       9.0,
  'Elliptical':          5.0,
  'Battle Ropes':       10.0,
  'Sprints':            16.0,
  'Agility Ladder':      9.0,
  "Farmer's Walk":       6.0,
  'Sled Push':          10.3,
  // ── Flexibility / mobility (duration) ────────────────────────
  'Plank':               3.5,
  'Hamstring Stretch':   2.3,
  'Hip Flexor Stretch':  2.3,
  'Shoulder Stretch':    2.3,
  'Cat-Cow Stretch':     2.5,
  'Downward Dog':        2.5,
  'Foam Rolling':        2.0,
  'Pigeon Pose':         2.5,
  // ── HIIT / plyometric (reps) ─────────────────────────────────
  'Burpees':            10.0,
  'Mountain Climbers':   8.0,
  'Jump Squats':         9.8,
  'High Knees':          9.8,
  'Box Jumps':          10.0,
  'Plyo Push-up':       10.0,
  'Bounding':            9.0,
  'Lateral Bounds':      9.0,
  'Broad Jump':          9.0,
  'Kettlebell Swing':   12.0,
  'Medicine Ball Slam':  8.0,
  // ── Functional (reps) ────────────────────────────────────────
  'Step-Ups':            5.0,
  'Turkish Get-Up':      5.0,
  // ── Bodyweight strength (reps) ───────────────────────────────
  'Push-ups':            8.0,
  'Pull-ups':            8.0,
  'Squat':               5.0,
  'Lunges':              5.5,
  // ── Core (reps) ──────────────────────────────────────────────
  'Crunches':            3.5,
  'Leg Raises':          3.5,
  'Russian Twists':      3.8,
  'Ab Wheel':            4.0,
  'Hanging Knee Raise':  4.0,
  // ── Weighted — heavy compound ────────────────────────────────
  'Deadlift':            6.0,
  'Hack Squat':          5.5,
  'Romanian Deadlift':   5.5,
  'Leg Press':           5.0,
  'Barbell Row':         5.5,
  'T-Bar Row':           5.5,
  'Overhead Press':      5.0,
  'Bench Press':         5.0,
  'Incline Bench Press': 5.0,
  'Decline Bench Press': 5.0,
  // ── Weighted — isolation (lighter load, shorter sets) ────────
  'Lateral Raise':       3.5,
  'Front Raise':         3.5,
  'Face Pull':           3.5,
  'Barbell Curl':        3.8,
  'Dumbbell Curl':       3.8,
  'Hammer Curl':         3.8,
  'Preacher Curl':       3.8,
  'Tricep Pushdown':     3.8,
  'Skull Crusher':       4.0,
  'Overhead Tricep Ext': 4.0,
  'Cable Woodchopper':   4.0,
  'Calf Raise':          3.5,
};

// Fallback MET when exercise is not in the table above.
const DEFAULT_MET: Record<ExerciseTracking, number> = {
  weighted:  4.5,
  reps_only: 5.5,
  duration:  5.0,
};

// HIIT and plyometric movements have faster rep cadence and shorter rest.
const HIIT_EXERCISES = new Set([
  'Burpees', 'Mountain Climbers', 'Jump Squats', 'High Knees', 'Box Jumps',
  'Plyo Push-up', 'Bounding', 'Lateral Bounds', 'Broad Jump', 'Battle Ropes',
  'Kettlebell Swing', 'Medicine Ball Slam',
]);

// Reference body weight used when actual weight is unknown.
const BODY_WEIGHT_KG = 70;

export type SetCalcInput = {
  reps: number;
  weight: number | null;
  duration: number; // minutes; 0 for non-duration exercises
};

/**
 * Returns estimated kcal burned for a single exercise given its completed sets.
 * Formula: MET × 70 kg × time_hours  (standard Compendium method).
 *
 * Time is estimated from actual rep counts so heavy/light sets are differentiated:
 *   weighted   — reps × 3 s work + 120 s rest per set
 *   reps_only  — reps × 3 s work + 90 s rest  (HIIT: 1.5 s/rep + 60 s rest)
 *   duration   — actual minutes logged
 */
export function calcExerciseCalories(
  name: string,
  tracking: ExerciseTracking,
  completedSets: SetCalcInput[],
): number {
  if (completedSets.length === 0) return 0;

  const met = EXERCISE_MET[name] ?? DEFAULT_MET[tracking];
  let minutes = 0;

  if (tracking === 'duration') {
    minutes = completedSets.reduce((sum, s) => sum + (s.duration || 0), 0);
  } else if (tracking === 'weighted') {
    for (const s of completedSets) {
      const reps = Math.max(1, s.reps || 1);
      minutes += (reps * 3 + 120) / 60; // 3 s/rep + 2 min rest
    }
  } else {
    const isHiit = HIIT_EXERCISES.has(name);
    const secPerRep = isHiit ? 1.5 : 3.0;
    const restSec   = isHiit ? 60  : 90;
    for (const s of completedSets) {
      const reps = Math.max(1, s.reps || 1);
      minutes += (reps * secPerRep + restSec) / 60;
    }
  }

  if (minutes <= 0) return 0;
  return met * BODY_WEIGHT_KG * (minutes / 60);
}
