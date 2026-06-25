export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Cardio';

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];

export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  Chest:     '#FF6B6B',
  Back:      '#48DBFB',
  Legs:      '#1DD1A1',
  Shoulders: '#FF9F43',
  Arms:      '#9B59B6',
  Core:      '#FFD700',
  Cardio:    '#FD7272',
};

export type WorkoutSectionId =
  | 'strength' | 'cardio' | 'hiit' | 'functional'
  | 'flexibility' | 'core' | 'circuit' | 'athletic';

export type ExerciseTracking = 'weighted' | 'reps_only' | 'duration';

export type Exercise = {
  name: string;
  muscle: MuscleGroup;
  sections: WorkoutSectionId[];
  tracking: ExerciseTracking;
};

export const EXERCISES: Exercise[] = [
  // ── Chest ──────────────────────────────────────────────────────
  { name: 'Bench Press',              muscle: 'Chest',     sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Incline Bench Press',      muscle: 'Chest',     sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Decline Bench Press',      muscle: 'Chest',     sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Dumbbell Fly',             muscle: 'Chest',     sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Cable Fly',                muscle: 'Chest',     sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Push-ups',                 muscle: 'Chest',     sections: ['strength', 'circuit', 'hiit'], tracking: 'reps_only' },
  { name: 'Pec Deck',                 muscle: 'Chest',     sections: ['strength'],                    tracking: 'weighted' },

  // ── Back ───────────────────────────────────────────────────────
  { name: 'Deadlift',                 muscle: 'Back',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Pull-ups',                 muscle: 'Back',      sections: ['strength', 'circuit'],         tracking: 'reps_only' },
  { name: 'Barbell Row',              muscle: 'Back',      sections: ['strength', 'circuit'],         tracking: 'weighted' },
  { name: 'Seated Cable Row',         muscle: 'Back',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Lat Pulldown',             muscle: 'Back',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'T-Bar Row',                muscle: 'Back',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Single-Arm Dumbbell Row',  muscle: 'Back',      sections: ['strength'],                    tracking: 'weighted' },

  // ── Legs ───────────────────────────────────────────────────────
  { name: 'Squat',                    muscle: 'Legs',      sections: ['strength', 'circuit'],         tracking: 'reps_only' },
  { name: 'Leg Press',                muscle: 'Legs',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Romanian Deadlift',        muscle: 'Legs',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Leg Extension',            muscle: 'Legs',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Leg Curl',                 muscle: 'Legs',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Calf Raise',               muscle: 'Legs',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Lunges',                   muscle: 'Legs',      sections: ['strength', 'circuit', 'functional'], tracking: 'reps_only' },
  { name: 'Hack Squat',               muscle: 'Legs',      sections: ['strength'],                    tracking: 'weighted' },

  // ── Shoulders ──────────────────────────────────────────────────
  { name: 'Overhead Press',           muscle: 'Shoulders', sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Dumbbell Shoulder Press',  muscle: 'Shoulders', sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Lateral Raise',            muscle: 'Shoulders', sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Front Raise',              muscle: 'Shoulders', sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Face Pull',                muscle: 'Shoulders', sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Arnold Press',             muscle: 'Shoulders', sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Upright Row',              muscle: 'Shoulders', sections: ['strength'],                    tracking: 'weighted' },

  // ── Arms ───────────────────────────────────────────────────────
  { name: 'Barbell Curl',             muscle: 'Arms',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Dumbbell Curl',            muscle: 'Arms',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Hammer Curl',              muscle: 'Arms',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Tricep Pushdown',          muscle: 'Arms',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Skull Crusher',            muscle: 'Arms',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Overhead Tricep Ext',      muscle: 'Arms',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Preacher Curl',            muscle: 'Arms',      sections: ['strength'],                    tracking: 'weighted' },
  { name: 'Close-Grip Bench Press',   muscle: 'Arms',      sections: ['strength'],                    tracking: 'weighted' },

  // ── Core ───────────────────────────────────────────────────────
  { name: 'Plank',                    muscle: 'Core',      sections: ['core', 'circuit'],             tracking: 'duration' },
  { name: 'Crunches',                 muscle: 'Core',      sections: ['core'],                        tracking: 'reps_only' },
  { name: 'Leg Raises',               muscle: 'Core',      sections: ['core'],                        tracking: 'reps_only' },
  { name: 'Russian Twists',           muscle: 'Core',      sections: ['core'],                        tracking: 'reps_only' },
  { name: 'Cable Woodchopper',        muscle: 'Core',      sections: ['core'],                        tracking: 'weighted' },
  { name: 'Ab Wheel',                 muscle: 'Core',      sections: ['core'],                        tracking: 'reps_only' },
  { name: 'Hanging Knee Raise',       muscle: 'Core',      sections: ['core'],                        tracking: 'reps_only' },

  // ── Cardio ─────────────────────────────────────────────────────
  { name: 'Treadmill Run',            muscle: 'Cardio',    sections: ['cardio'],                      tracking: 'duration' },
  { name: 'Cycling',                  muscle: 'Cardio',    sections: ['cardio'],                      tracking: 'duration' },
  { name: 'Rowing Machine',           muscle: 'Cardio',    sections: ['cardio'],                      tracking: 'duration' },
  { name: 'Jump Rope',                muscle: 'Cardio',    sections: ['cardio', 'hiit'],              tracking: 'duration' },
  { name: 'Stair Climber',            muscle: 'Cardio',    sections: ['cardio'],                      tracking: 'duration' },
  { name: 'Elliptical',               muscle: 'Cardio',    sections: ['cardio'],                      tracking: 'duration' },

  // ── HIIT ───────────────────────────────────────────────────────
  { name: 'Burpees',                  muscle: 'Cardio',    sections: ['hiit'],                        tracking: 'reps_only' },
  { name: 'Mountain Climbers',        muscle: 'Core',      sections: ['hiit', 'core'],                tracking: 'reps_only' },
  { name: 'Jump Squats',              muscle: 'Legs',      sections: ['hiit'],                        tracking: 'reps_only' },
  { name: 'High Knees',               muscle: 'Cardio',    sections: ['hiit'],                        tracking: 'reps_only' },
  { name: 'Box Jumps',                muscle: 'Legs',      sections: ['hiit', 'athletic'],            tracking: 'reps_only' },
  { name: 'Battle Ropes',             muscle: 'Cardio',    sections: ['hiit', 'functional'],          tracking: 'duration' },

  // ── Functional ─────────────────────────────────────────────────
  { name: 'Kettlebell Swing',         muscle: 'Legs',      sections: ['functional'],                  tracking: 'reps_only' },
  { name: "Farmer's Walk",            muscle: 'Back',      sections: ['functional'],                  tracking: 'duration' },
  { name: 'Medicine Ball Slam',       muscle: 'Core',      sections: ['functional', 'core'],          tracking: 'reps_only' },
  { name: 'Step-Ups',                 muscle: 'Legs',      sections: ['functional'],                  tracking: 'reps_only' },
  { name: 'Sled Push',                muscle: 'Legs',      sections: ['functional'],                  tracking: 'duration' },
  { name: 'Turkish Get-Up',           muscle: 'Core',      sections: ['functional', 'core'],          tracking: 'reps_only' },

  // ── Flexibility & Mobility ─────────────────────────────────────
  { name: 'Hamstring Stretch',        muscle: 'Legs',      sections: ['flexibility'],                 tracking: 'duration' },
  { name: 'Hip Flexor Stretch',       muscle: 'Legs',      sections: ['flexibility'],                 tracking: 'duration' },
  { name: 'Shoulder Stretch',         muscle: 'Shoulders', sections: ['flexibility'],                 tracking: 'duration' },
  { name: 'Cat-Cow Stretch',          muscle: 'Back',      sections: ['flexibility'],                 tracking: 'duration' },
  { name: 'Downward Dog',             muscle: 'Back',      sections: ['flexibility'],                 tracking: 'duration' },
  { name: 'Foam Rolling',             muscle: 'Legs',      sections: ['flexibility'],                 tracking: 'duration' },
  { name: 'Pigeon Pose',              muscle: 'Legs',      sections: ['flexibility'],                 tracking: 'duration' },

  // ── Sports & Athletic ──────────────────────────────────────────
  { name: 'Sprints',                  muscle: 'Cardio',    sections: ['athletic'],                    tracking: 'duration' },
  { name: 'Agility Ladder',           muscle: 'Cardio',    sections: ['athletic'],                    tracking: 'duration' },
  { name: 'Broad Jump',               muscle: 'Legs',      sections: ['athletic'],                    tracking: 'reps_only' },
  { name: 'Plyo Push-up',             muscle: 'Chest',     sections: ['athletic'],                    tracking: 'reps_only' },
  { name: 'Bounding',                 muscle: 'Legs',      sections: ['athletic'],                    tracking: 'reps_only' },
  { name: 'Lateral Bounds',           muscle: 'Legs',      sections: ['athletic'],                    tracking: 'reps_only' },
];
