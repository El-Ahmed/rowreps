// Lowercases, strips accents and apostrophes ("Farmer's" -> "farmers"),
// then splits on any other punctuation or whitespace.
const words = (text: string): string[] =>
  text
    .normalize('NFD')
    .replace(/\p{M}|'/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const startsAWord = (nameWords: string[]) => (queryWord: string) =>
  nameWords.some((nameWord) => nameWord.startsWith(queryWord));

// True when every word of the query starts some word of the name, in any order.
export function matchesSearch(name: string, query: string): boolean {
  return words(query).every(startsAWord(words(name)));
}

// True when at least one word of the query starts some word of the name: a close match.
export function matchesSomeWord(name: string, query: string): boolean {
  return words(query).some(startsAWord(words(name)));
}
