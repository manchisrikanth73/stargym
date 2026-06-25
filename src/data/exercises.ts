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

export type Exercise = { name: string; muscle: MuscleGroup; sections: WorkoutSectionId[] };

export const EXERCISES: Exercise[] = [
  { name: 'Bench Press',              muscle: 'Chest',     sections: ['strength'] },
  { name: 'Incline Bench Press',      muscle: 'Chest',     sections: ['strength'] },
  { name: 'Decline Bench Press',      muscle: 'Chest',     sections: ['strength'] },
  { name: 'Dumbbell Fly',             muscle: 'Chest',     sections: ['strength'] },
  { name: 'Cable Fly',                muscle: 'Chest',     sections: ['strength'] },
  { name: 'Push-ups',                 muscle: 'Chest',     sections: ['strength', 'circuit', 'hiit'] },
  { name: 'Pec Deck',                 muscle: 'Chest',     sections: ['strength'] },

  { name: 'Deadlift',                 muscle: 'Back',      sections: ['strength'] },
  { name: 'Pull-ups',                 muscle: 'Back',      sections: ['strength', 'circuit'] },
  { name: 'Barbell Row',              muscle: 'Back',      sections: ['strength', 'circuit'] },
  { name: 'Seated Cable Row',         muscle: 'Back',      sections: ['strength'] },
  { name: 'Lat Pulldown',             muscle: 'Back',      sections: ['strength'] },
  { name: 'T-Bar Row',                muscle: 'Back',      sections: ['strength'] },
  { name: 'Single-Arm Dumbbell Row',  muscle: 'Back',      sections: ['strength'] },

  { name: 'Squat',                    muscle: 'Legs',      sections: ['strength', 'circuit'] },
  { name: 'Leg Press',                muscle: 'Legs',      sections: ['strength'] },
  { name: 'Romanian Deadlift',        muscle: 'Legs',      sections: ['strength'] },
  { name: 'Leg Extension',            muscle: 'Legs',      sections: ['strength'] },
  { name: 'Leg Curl',                 muscle: 'Legs',      sections: ['strength'] },
  { name: 'Calf Raise',               muscle: 'Legs',      sections: ['strength'] },
  { name: 'Lunges',                   muscle: 'Legs',      sections: ['strength', 'circuit', 'functional'] },
  { name: 'Hack Squat',               muscle: 'Legs',      sections: ['strength'] },

  { name: 'Overhead Press',           muscle: 'Shoulders', sections: ['strength'] },
  { name: 'Dumbbell Shoulder Press',  muscle: 'Shoulders', sections: ['strength'] },
  { name: 'Lateral Raise',            muscle: 'Shoulders', sections: ['strength'] },
  { name: 'Front Raise',              muscle: 'Shoulders', sections: ['strength'] },
  { name: 'Face Pull',                muscle: 'Shoulders', sections: ['strength'] },
  { name: 'Arnold Press',             muscle: 'Shoulders', sections: ['strength'] },
  { name: 'Upright Row',              muscle: 'Shoulders', sections: ['strength'] },

  { name: 'Barbell Curl',             muscle: 'Arms',      sections: ['strength'] },
  { name: 'Dumbbell Curl',            muscle: 'Arms',      sections: ['strength'] },
  { name: 'Hammer Curl',              muscle: 'Arms',      sections: ['strength'] },
  { name: 'Tricep Pushdown',          muscle: 'Arms',      sections: ['strength'] },
  { name: 'Skull Crusher',            muscle: 'Arms',      sections: ['strength'] },
  { name: 'Overhead Tricep Ext',      muscle: 'Arms',      sections: ['strength'] },
  { name: 'Preacher Curl',            muscle: 'Arms',      sections: ['strength'] },
  { name: 'Close-Grip Bench Press',   muscle: 'Arms',      sections: ['strength'] },

  { name: 'Plank',                    muscle: 'Core',      sections: ['core', 'circuit'] },
  { name: 'Crunches',                 muscle: 'Core',      sections: ['core'] },
  { name: 'Leg Raises',               muscle: 'Core',      sections: ['core'] },
  { name: 'Russian Twists',           muscle: 'Core',      sections: ['core'] },
  { name: 'Cable Woodchopper',        muscle: 'Core',      sections: ['core'] },
  { name: 'Ab Wheel',                 muscle: 'Core',      sections: ['core'] },
  { name: 'Hanging Knee Raise',       muscle: 'Core',      sections: ['core'] },

  { name: 'Treadmill Run',            muscle: 'Cardio',    sections: ['cardio'] },
  { name: 'Cycling',                  muscle: 'Cardio',    sections: ['cardio'] },
  { name: 'Rowing Machine',           muscle: 'Cardio',    sections: ['cardio'] },
  { name: 'Jump Rope',                muscle: 'Cardio',    sections: ['cardio', 'hiit'] },
  { name: 'Stair Climber',            muscle: 'Cardio',    sections: ['cardio'] },
  { name: 'Elliptical',               muscle: 'Cardio',    sections: ['cardio'] },

  // HIIT
  { name: 'Burpees',                  muscle: 'Cardio',    sections: ['hiit'] },
  { name: 'Mountain Climbers',        muscle: 'Core',      sections: ['hiit', 'core'] },
  { name: 'Jump Squats',              muscle: 'Legs',      sections: ['hiit'] },
  { name: 'High Knees',               muscle: 'Cardio',    sections: ['hiit'] },
  { name: 'Box Jumps',                muscle: 'Legs',      sections: ['hiit', 'athletic'] },
  { name: 'Battle Ropes',             muscle: 'Cardio',    sections: ['hiit', 'functional'] },

  // Functional
  { name: 'Kettlebell Swing',         muscle: 'Legs',      sections: ['functional'] },
  { name: "Farmer's Walk",            muscle: 'Back',      sections: ['functional'] },
  { name: 'Medicine Ball Slam',       muscle: 'Core',      sections: ['functional', 'core'] },
  { name: 'Step-Ups',                 muscle: 'Legs',      sections: ['functional'] },
  { name: 'Sled Push',                muscle: 'Legs',      sections: ['functional'] },
  { name: 'Turkish Get-Up',           muscle: 'Core',      sections: ['functional', 'core'] },

  // Flexibility & Mobility
  { name: 'Hamstring Stretch',        muscle: 'Legs',      sections: ['flexibility'] },
  { name: 'Hip Flexor Stretch',       muscle: 'Legs',      sections: ['flexibility'] },
  { name: 'Shoulder Stretch',         muscle: 'Shoulders', sections: ['flexibility'] },
  { name: 'Cat-Cow Stretch',          muscle: 'Back',      sections: ['flexibility'] },
  { name: 'Downward Dog',             muscle: 'Back',      sections: ['flexibility'] },
  { name: 'Foam Rolling',             muscle: 'Legs',      sections: ['flexibility'] },
  { name: 'Pigeon Pose',              muscle: 'Legs',      sections: ['flexibility'] },

  // Sports & Athletic
  { name: 'Sprints',                  muscle: 'Cardio',    sections: ['athletic'] },
  { name: 'Agility Ladder',           muscle: 'Cardio',    sections: ['athletic'] },
  { name: 'Broad Jump',               muscle: 'Legs',      sections: ['athletic'] },
  { name: 'Plyo Push-up',             muscle: 'Chest',     sections: ['athletic'] },
  { name: 'Bounding',                 muscle: 'Legs',      sections: ['athletic'] },
  { name: 'Lateral Bounds',           muscle: 'Legs',      sections: ['athletic'] },
];
