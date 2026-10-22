// Lowercases, strips accents and apostrophes ("Farmer's" -> "farmers"),
// then splits on any other punctuation or whitespace.
const words = (text: string): string[] =>
  text
    .normalize('NFD')
    .replace(/\p{M}|'/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

// True when every word of the query starts some word of the name, in any order.
export function matchesSearch(name: string, query: string): boolean {
  const nameWords = words(name);
  return words(query).every((queryWord) =>
    nameWords.some((nameWord) => nameWord.startsWith(queryWord)),
  );
}
