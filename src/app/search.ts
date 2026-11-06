import { Exercise } from './exercises';

// Other names people use for free-exercise-db's muscles, so "pecs" finds chest exercises.
// Forearms get no "arms", so "arm" doesn't find Farmer's Walk.
const MUSCLE_ALIASES: Record<string, string[]> = {
  abdominals: ['abs', 'core'],
  abductors: ['legs'],
  adductors: ['legs'],
  biceps: ['arms'],
  calves: ['legs'],
  chest: ['pecs', 'pectorals'],
  glutes: ['butt', 'legs'],
  hamstrings: ['hams', 'legs'],
  lats: ['back'],
  quadriceps: ['quads', 'legs'],
  shoulders: ['delts', 'deltoids'],
  traps: ['back'],
  triceps: ['arms'],
};

// Lowercases, strips accents and apostrophes ("Farmer's" -> "farmers"),
// then splits on any other punctuation or whitespace.
const words = (text: string): string[] =>
  text
    .normalize('NFD')
    .replace(/\p{M}|'/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const startsAWord = (terms: string[], queryWord: string) =>
  terms.some((term) => term.startsWith(queryWord));

// An exercise with the words it can be found by, worked out once rather than on every keystroke.
export interface Searchable {
  exercise: Exercise;
  nameWords: string[];
  // The words of its main muscles and their aliases.
  muscleTerms: string[];
}

export const searchable = (exercise: Exercise): Searchable => ({
  exercise,
  nameWords: words(exercise.name),
  muscleTerms: words(
    exercise.primaryMuscles
      .flatMap((muscle) => [muscle, ...(MUSCLE_ALIASES[muscle] ?? [])])
      .join(' '),
  ),
});

// The exercises where every word of the query starts a word of the name or of a main muscle,
// in any order. Best first: names that start with the first word, then names with a word that
// starts with one, then the ones found only by muscle. Otherwise they keep their order.
export function search(items: Searchable[], query: string): Exercise[] {
  const queryWords = words(query);
  if (!queryWords.length) {
    return items.map(({ exercise }) => exercise);
  }
  const rank = ({ nameWords }: Searchable) => {
    if (nameWords[0]?.startsWith(queryWords[0])) {
      return 0;
    }
    return queryWords.some((word) => startsAWord(nameWords, word)) ? 1 : 2;
  };

  return items
    .filter(({ nameWords, muscleTerms }) =>
      queryWords.every((word) => startsAWord(nameWords, word) || startsAWord(muscleTerms, word)),
    )
    .sort((a, b) => rank(a) - rank(b))
    .map(({ exercise }) => exercise);
}

// True when at least one word of the query starts some word of the name: a close match.
export const matchesSomeWord = ({ nameWords }: Searchable, query: string): boolean =>
  words(query).some((word) => startsAWord(nameWords, word));
