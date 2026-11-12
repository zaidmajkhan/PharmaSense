import { matchDrugName, scoreDrugMatch } from '@/lib/drug-match';

const cache = [
  {
    id: 1,
    name: 'Lisinopril',
    drug_class: 'ACE inhibitor',
    brand_names: 'Zestril, Prinivil',
  },
  {
    id: 2,
    name: 'Ibuprofen',
    drug_class: 'NSAID',
    brand_names: 'Advil, Motrin',
  },
  {
    id: 3,
    name: 'Pseudoephedrine',
    drug_class: 'Decongestant',
    brand_names: 'Sudafed',
  },
];

describe('scoreDrugMatch', () => {
  it('scores exact and brand matches highly', () => {
    expect(scoreDrugMatch('Lisinopril', cache[0])?.score).toBe(1);
    expect(scoreDrugMatch('Zestril', cache[0])?.matchedOn).toBe('brand');
    expect(scoreDrugMatch('Advil', cache[1])?.matchedOn).toBe('brand');
  });
});

describe('matchDrugName', () => {
  it('returns the best confident cache match', () => {
    const hit = matchDrugName('lisinopril 10 mg tablets', cache);
    expect(hit?.drug.name).toBe('Lisinopril');
    expect(hit?.score).toBeGreaterThanOrEqual(0.7);
  });

  it('returns null when there is no confident match', () => {
    expect(matchDrugName('completely unknown remedy', cache)).toBeNull();
    expect(matchDrugName(null, cache)).toBeNull();
    expect(matchDrugName('   ', cache)).toBeNull();
  });

  it('matches brand-only scans', () => {
    expect(matchDrugName('Sudafed', cache)?.drug.name).toBe('Pseudoephedrine');
  });
});
