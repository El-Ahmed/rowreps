// An exercise from free-exercise-db (https://github.com/yuhonas/free-exercise-db),
// served from public/free-exercise-db/exercises.json. Only the fields the app uses are listed.
export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}
