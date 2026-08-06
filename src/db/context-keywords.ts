/** Common English words that would otherwise match label text spuriously. */
const CONTEXT_STOPWORDS = new Set([
  'what', 'when', 'where', 'which', 'about', 'should', 'could', 'would', 'have',
  'having', 'been', 'this', 'that', 'these', 'those', 'with', 'without', 'from',
  'your', 'mine', 'take', 'taking', 'taken', 'used', 'uses', 'using', 'usage',
  'side', 'effect', 'effects', 'know', 'need', 'help', 'helps', 'will', 'does',
  'doing', 'something', 'anything', 'good', 'best', 'better', 'safe', 'safely',
  'much', 'many', 'more', 'most', 'some', 'days', 'week', 'weeks', 'time',
  'times', 'feel', 'feeling', 'like', 'really', 'very', 'just', 'also', 'tell',
  'explain', 'recommend', 'suggestion', 'suggest', 'drug', 'drugs', 'medicine',
  'medication', 'medications', 'symptom', 'symptoms', 'condition', 'brand',
  'dose', 'dosing', 'dosage', 'milligrams', 'exactly',
]);

/**
 * Extracts candidate drug-name / symptom keywords from a free-text message
 * for matching against the local drug cache. Pure function shared by the
 * app's database layer and the Node test harness.
 */
export function extractKeywords(message: string): string[] {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !CONTEXT_STOPWORDS.has(w));
  // Include singular forms so e.g. "antihistamines" matches the cached
  // class "Antihistamine".
  const withSingulars = new Set<string>();
  for (const word of words) {
    withSingulars.add(word);
    if (word.endsWith('s') && word.length >= 5) withSingulars.add(word.slice(0, -1));
  }
  return Array.from(withSingulars);
}
