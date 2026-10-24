import { matchesSearch, matchesSomeWord } from './search';

describe('matchesSearch', () => {
  const name = 'Bench Press - Wide Grip';

  it.each(['bench press wide', 'press bench', 'ben pr', 'grip', ''])(
    'matches "%s" against the start of any word, in any order',
    (query) => {
      expect(matchesSearch(name, query)).toBe(true);
    },
  );

  it('ignores case, accents and punctuation', () => {
    expect(matchesSearch(name, 'BENCH, PRÉSS!')).toBe(true);
    expect(matchesSearch('Crème Curl', 'creme')).toBe(true);
    expect(matchesSearch("Farmer's Walk", 'farmers')).toBe(true);
  });

  it('needs every typed word to match', () => {
    expect(matchesSearch(name, 'bench squat')).toBe(false);
  });

  it('only matches the start of a word', () => {
    expect(matchesSearch(name, 'ench')).toBe(false);
    expect(matchesSearch(name, 'ress')).toBe(false);
  });
});

describe('matchesSomeWord', () => {
  it('matches when any typed word starts a word of the name', () => {
    expect(matchesSomeWord('Barbell Squat', 'belt squat')).toBe(true);
    expect(matchesSomeWord('Barbell Squat', 'BELT SQU')).toBe(true);
  });

  it('does not match when no typed word does', () => {
    expect(matchesSomeWord('Barbell Squat', 'belt press')).toBe(false);
    expect(matchesSomeWord('Barbell Squat', '')).toBe(false);
  });
});
