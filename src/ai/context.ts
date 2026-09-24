/**
 * Merges per-message drug matches into one context list. Groups are ordered
 * newest message first, so the current question's drugs always win a slot and
 * earlier turns fill what is left. Keeps follow-ups like "what about its side
 * effects?" grounded in the drug discussed a turn earlier.
 */
export function mergeByRecency<T>(groups: T[][], key: (item: T) => string | number, limit: number): T[] {
  const merged = new Map<string | number, T>();
  for (const group of groups) {
    for (const item of group) {
      if (merged.size >= limit) return Array.from(merged.values());
      if (!merged.has(key(item))) merged.set(key(item), item);
    }
  }
  return Array.from(merged.values());
}
