import bpFlagsData from '@/data/bp-flags.json';
import type { BpFlagEntry } from '@/types/scan';

// TODO: Every entry in bp-flags.json must be reviewed by a licensed pharmacist
// before any real clinical or patient-facing use. This file is a prototype aid only.

export const BP_FLAGS_VERSION = bpFlagsData.version;

export function getBpFlagEntries(): BpFlagEntry[] {
  return bpFlagsData.entries as BpFlagEntry[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Returns curated BP flags whose matchTerms appear in the haystack
 * (drug name, brands, class, printed directions, etc.). Never model-generated.
 */
export function matchBpFlags(
  haystackParts: (string | null | undefined)[],
  entries: BpFlagEntry[] = getBpFlagEntries()
): BpFlagEntry[] {
  const haystack = normalize(haystackParts.filter(Boolean).join(' '));
  if (!haystack) return [];

  const matched: BpFlagEntry[] = [];
  for (const entry of entries) {
    const hit = entry.matchTerms.some((term) => {
      const needle = normalize(term);
      return needle.length > 0 && haystack.includes(needle);
    });
    if (hit) matched.push(entry);
  }
  return matched;
}
