import { Exercise } from './exercises';
import { matchesSomeWord, search, searchable } from './search';

const exercise = (name: string, primaryMuscles: string[] = [], secondaryMuscles: string[] = []) =>
  ({ id: name, name, primaryMuscles, secondaryMuscles }) satisfies Exercise;

const names = (exercises: Exercise[], query: string) =>
  search(exercises.map(searchable), query).map(({ name }) => name);

describe('search', () => {
  const bench = exercise('Bench Press - Wide Grip', ['chest'], ['triceps']);
  const found = (query: string) => names([bench], query).length === 1;

  it.each(['bench press wide', 'press bench', 'ben pr', 'grip', '', '   '])(
    'matches "%s" against the start of any word of the name, in any order',
    (query) => {
      expect(found(query)).toBe(true);
    },
  );

  it('ignores case, accents, punctuation and extra spaces', () => {
    expect(found('  BENCH,   PRÉSS! ')).toBe(true);
    expect(names([exercise('Crème Curl')], 'creme')).toEqual(['Crème Curl']);
    expect(names([exercise("Farmer's Walk")], 'farmers')).toEqual(["Farmer's Walk"]);
  });

  it('needs every typed word to match', () => {
    expect(found('bench squat')).toBe(false);
  });

  it('only matches the start of a word', () => {
    expect(found('ench')).toBe(false);
    expect(found('ress')).toBe(false);
    expect(names([exercise("Farmer's Walk", ['forearms'])], 'arm')).toEqual([]);
  });

  it('matches main muscles, mixed with words of the name', () => {
    expect(found('chest')).toBe(true);
    expect(found('che ben')).toBe(true);
    expect(found('chest squat')).toBe(false);
  });

  it('matches each word of a muscle with more than one', () => {
    const deadlift = exercise('Deadlift', ['lower back']);
    expect(names([deadlift], 'back')).toEqual(['Deadlift']);
    expect(names([deadlift], 'low back')).toEqual(['Deadlift']);
  });

  it('does not match the muscles that also work', () => {
    expect(found('triceps')).toBe(false);
  });

  it.each([
    ['pecs', 'chest'],
    ['lats', 'lats'],
    ['back', 'lats'],
    ['quads', 'quadriceps'],
    ['legs', 'quadriceps'],
    ['delts', 'shoulders'],
    ['butt', 'glutes'],
    ['abs', 'abdominals'],
  ])('finds "%s" by the %s', (query, muscle) => {
    expect(names([exercise('Some Exercise', [muscle])], query)).toEqual(['Some Exercise']);
  });

  it('finds exercises with no muscle set by name', () => {
    expect(names([exercise('Belt Squat')], 'belt')).toEqual(['Belt Squat']);
  });

  it('ranks names starting with the first word, then other name matches, then muscle matches', () => {
    const pushups = exercise('Pushups', ['chest']);
    const fly = exercise('Dumbbell Chest Fly', ['chest']);
    const press = exercise('Chest Press', ['chest']);
    const otherFly = exercise('Cable Chest Fly', ['chest']);

    expect(names([pushups, fly, press, otherFly], 'chest')).toEqual([
      'Chest Press',
      'Dumbbell Chest Fly',
      'Cable Chest Fly',
      'Pushups',
    ]);
  });

  it('keeps the order when there is no query', () => {
    const exercises = [exercise('B'), exercise('A')];
    expect(names(exercises, '')).toEqual(['B', 'A']);
  });
});

describe('matchesSomeWord', () => {
  const squat = searchable(exercise('Barbell Squat', ['quadriceps']));

  it('matches when any typed word starts a word of the name', () => {
    expect(matchesSomeWord(squat, 'belt squat')).toBe(true);
    expect(matchesSomeWord(squat, 'BELT SQU')).toBe(true);
  });

  it('does not match when no typed word does', () => {
    expect(matchesSomeWord(squat, 'belt press')).toBe(false);
    expect(matchesSomeWord(squat, 'quads press')).toBe(false);
    expect(matchesSomeWord(squat, '')).toBe(false);
  });
});
