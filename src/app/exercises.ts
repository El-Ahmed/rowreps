export interface Exercise {
  name: string;
  group: string;
  muscles: string;
}

// Placeholder catalog until exercises come from a database.
export const EXERCISES: Exercise[] = [
  { name: 'Bench Press', group: 'Chest', muscles: 'Chest · Triceps · Front shoulders' },
  { name: 'Incline Press', group: 'Chest', muscles: 'Upper chest · Front shoulders · Triceps' },
  { name: 'Dumbbell Fly', group: 'Chest', muscles: 'Chest' },
  { name: 'Pull-up', group: 'Back', muscles: 'Lats · Biceps' },
  { name: 'Barbell Row', group: 'Back', muscles: 'Upper back · Lats · Biceps' },
  { name: 'Lat Pulldown', group: 'Back', muscles: 'Lats · Biceps' },
  { name: 'Squat', group: 'Legs', muscles: 'Quads · Glutes' },
  { name: 'Goblet Squat', group: 'Legs', muscles: 'Quads · Glutes' },
  { name: 'Curl', group: 'Arms', muscles: 'Biceps' },
  { name: 'Triceps Pushdown', group: 'Arms', muscles: 'Triceps' },
];
