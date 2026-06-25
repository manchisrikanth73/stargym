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

export type Exercise = { name: string; muscle: MuscleGroup };

export const EXERCISES: Exercise[] = [
  { name: 'Bench Press',              muscle: 'Chest' },
  { name: 'Incline Bench Press',      muscle: 'Chest' },
  { name: 'Decline Bench Press',      muscle: 'Chest' },
  { name: 'Dumbbell Fly',             muscle: 'Chest' },
  { name: 'Cable Fly',                muscle: 'Chest' },
  { name: 'Push-ups',                 muscle: 'Chest' },
  { name: 'Pec Deck',                 muscle: 'Chest' },

  { name: 'Deadlift',                 muscle: 'Back' },
  { name: 'Pull-ups',                 muscle: 'Back' },
  { name: 'Barbell Row',              muscle: 'Back' },
  { name: 'Seated Cable Row',         muscle: 'Back' },
  { name: 'Lat Pulldown',             muscle: 'Back' },
  { name: 'T-Bar Row',                muscle: 'Back' },
  { name: 'Single-Arm Dumbbell Row',  muscle: 'Back' },

  { name: 'Squat',                    muscle: 'Legs' },
  { name: 'Leg Press',                muscle: 'Legs' },
  { name: 'Romanian Deadlift',        muscle: 'Legs' },
  { name: 'Leg Extension',            muscle: 'Legs' },
  { name: 'Leg Curl',                 muscle: 'Legs' },
  { name: 'Calf Raise',               muscle: 'Legs' },
  { name: 'Lunges',                   muscle: 'Legs' },
  { name: 'Hack Squat',               muscle: 'Legs' },

  { name: 'Overhead Press',           muscle: 'Shoulders' },
  { name: 'Dumbbell Shoulder Press',  muscle: 'Shoulders' },
  { name: 'Lateral Raise',            muscle: 'Shoulders' },
  { name: 'Front Raise',              muscle: 'Shoulders' },
  { name: 'Face Pull',                muscle: 'Shoulders' },
  { name: 'Arnold Press',             muscle: 'Shoulders' },
  { name: 'Upright Row',              muscle: 'Shoulders' },

  { name: 'Barbell Curl',             muscle: 'Arms' },
  { name: 'Dumbbell Curl',            muscle: 'Arms' },
  { name: 'Hammer Curl',              muscle: 'Arms' },
  { name: 'Tricep Pushdown',          muscle: 'Arms' },
  { name: 'Skull Crusher',            muscle: 'Arms' },
  { name: 'Overhead Tricep Ext',      muscle: 'Arms' },
  { name: 'Preacher Curl',            muscle: 'Arms' },
  { name: 'Close-Grip Bench Press',   muscle: 'Arms' },

  { name: 'Plank',                    muscle: 'Core' },
  { name: 'Crunches',                 muscle: 'Core' },
  { name: 'Leg Raises',               muscle: 'Core' },
  { name: 'Russian Twists',           muscle: 'Core' },
  { name: 'Cable Woodchopper',        muscle: 'Core' },
  { name: 'Ab Wheel',                 muscle: 'Core' },
  { name: 'Hanging Knee Raise',       muscle: 'Core' },

  { name: 'Treadmill Run',            muscle: 'Cardio' },
  { name: 'Cycling',                  muscle: 'Cardio' },
  { name: 'Rowing Machine',           muscle: 'Cardio' },
  { name: 'Jump Rope',                muscle: 'Cardio' },
  { name: 'Stair Climber',            muscle: 'Cardio' },
  { name: 'Elliptical',               muscle: 'Cardio' },
];
