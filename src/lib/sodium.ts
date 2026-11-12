/** Common adult daily sodium reference limits (mg). Individual targets vary. */
export const SODIUM_DAILY_LIMIT_MG = 2300;
export const SODIUM_IDEAL_LIMIT_MG = 1500;

export interface SodiumProgress {
  sodiumMg: number;
  percentOfDailyLimit: number;
  percentOfIdealLimit: number;
  cappedDailyProgress: number;
  cappedIdealProgress: number;
}

/**
 * Computes how a sodium amount compares to the 2,300 mg and 1,500 mg references.
 * Progress values are 0–1 for UI bars (capped at 100% fill).
 */
export function computeSodiumProgress(sodiumMg: number): SodiumProgress {
  const safe = Number.isFinite(sodiumMg) && sodiumMg > 0 ? sodiumMg : 0;
  const percentOfDailyLimit = (safe / SODIUM_DAILY_LIMIT_MG) * 100;
  const percentOfIdealLimit = (safe / SODIUM_IDEAL_LIMIT_MG) * 100;
  return {
    sodiumMg: safe,
    percentOfDailyLimit,
    percentOfIdealLimit,
    cappedDailyProgress: Math.min(1, safe / SODIUM_DAILY_LIMIT_MG),
    cappedIdealProgress: Math.min(1, safe / SODIUM_IDEAL_LIMIT_MG),
  };
}

/** Local calendar date key YYYY-MM-DD for daily sodium resets. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
