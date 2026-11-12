import { matchBpFlags } from '@/lib/bp-flags';
import type { BpFlagEntry } from '@/types/scan';

const entries: BpFlagEntry[] = [
  {
    id: 'pseudoephedrine',
    matchTerms: ['pseudoephedrine', 'sudafed'],
    direction: 'raise',
    note: 'May raise BP',
    pharmacistLine: 'Ask pharmacist',
  },
  {
    id: 'ibuprofen',
    matchTerms: ['ibuprofen', 'advil'],
    direction: 'raise',
    note: 'NSAID note',
    pharmacistLine: 'Ask pharmacist',
  },
];

describe('matchBpFlags', () => {
  it('matches curated terms in names and brands only', () => {
    const hits = matchBpFlags(['Cold medicine with Pseudoephedrine HCl'], entries);
    expect(hits.map((h) => h.id)).toEqual(['pseudoephedrine']);
  });

  it('can return multiple flags and ignores non-matches', () => {
    const hits = matchBpFlags(['Advil', 'ibuprofen tablet'], entries);
    expect(hits.map((h) => h.id).sort()).toEqual(['ibuprofen']);
    expect(matchBpFlags(['acetaminophen'], entries)).toEqual([]);
    expect(matchBpFlags([null, undefined, ''], entries)).toEqual([]);
  });
});
