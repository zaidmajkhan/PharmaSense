import {
  SODIUM_DAILY_LIMIT_MG,
  SODIUM_IDEAL_LIMIT_MG,
  computeSodiumProgress,
  localDateKey,
} from '@/lib/sodium';

describe('computeSodiumProgress', () => {
  it('computes percentages against 2300 and 1500 mg limits', () => {
    const halfDaily = computeSodiumProgress(SODIUM_DAILY_LIMIT_MG / 2);
    expect(halfDaily.percentOfDailyLimit).toBeCloseTo(50);
    expect(halfDaily.cappedDailyProgress).toBeCloseTo(0.5);

    const ideal = computeSodiumProgress(SODIUM_IDEAL_LIMIT_MG);
    expect(ideal.percentOfIdealLimit).toBeCloseTo(100);
    expect(ideal.cappedIdealProgress).toBe(1);
  });

  it('caps progress at 100% fill and treats invalid input as zero', () => {
    const over = computeSodiumProgress(5000);
    expect(over.percentOfDailyLimit).toBeGreaterThan(100);
    expect(over.cappedDailyProgress).toBe(1);
    expect(computeSodiumProgress(-10).sodiumMg).toBe(0);
    expect(computeSodiumProgress(Number.NaN).percentOfDailyLimit).toBe(0);
  });
});

describe('localDateKey', () => {
  it('formats YYYY-MM-DD from a local date', () => {
    expect(localDateKey(new Date(2026, 10, 12))).toBe('2026-11-12');
  });
});
