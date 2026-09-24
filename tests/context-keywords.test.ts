import { extractKeywords } from '@/db/context-keywords';

describe('extractKeywords', () => {
  it('keeps drug names and symptom words, drops short and stop words', () => {
    const words = extractKeywords('What is ibuprofen used for with a headache?');
    expect(words).toEqual(expect.arrayContaining(['ibuprofen', 'headache']));
    expect(words).not.toContain('what');
    expect(words).not.toContain('used');
    expect(words).not.toContain('is');
  });

  it('adds singular forms so plurals match cached classes', () => {
    expect(extractKeywords('antihistamines')).toEqual(
      expect.arrayContaining(['antihistamines', 'antihistamine'])
    );
  });

  it('ignores dose and brand request words', () => {
    const words = extractKeywords('exact dosage in milligrams, which brand is best');
    expect(words).not.toContain('dosage');
    expect(words).not.toContain('milligrams');
    expect(words).not.toContain('brand');
  });

  it('returns nothing for an empty or punctuation-only message', () => {
    expect(extractKeywords('')).toEqual([]);
    expect(extractKeywords('?!...')).toEqual([]);
  });
});
