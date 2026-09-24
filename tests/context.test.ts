import { mergeByRecency } from '@/ai/context';

const byId = (d: { id: number }) => d.id;

describe('mergeByRecency', () => {
  it('keeps the newest group first and fills with earlier turns', () => {
    const merged = mergeByRecency([[{ id: 1 }], [{ id: 2 }, { id: 3 }]], byId, 8);
    expect(merged.map(byId)).toEqual([1, 2, 3]);
  });

  it('dedupes drugs mentioned in several turns', () => {
    const merged = mergeByRecency([[{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 1 }]], byId, 8);
    expect(merged.map(byId)).toEqual([1, 2]);
  });

  it('caps the result without dropping current-turn matches', () => {
    const merged = mergeByRecency([[{ id: 1 }, { id: 2 }], [{ id: 3 }, { id: 4 }]], byId, 3);
    expect(merged.map(byId)).toEqual([1, 2, 3]);
  });

  it('returns an empty list when nothing matched', () => {
    expect(mergeByRecency<{ id: number }>([[], []], byId, 8)).toEqual([]);
  });
});
