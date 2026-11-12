import type { ScanLabelResult } from '@/types/scan';

/** In-memory handoff from Scan tab → result screen. Not persisted. */
let latest: ScanLabelResult | null = null;

export function setLatestScanResult(result: ScanLabelResult): void {
  latest = result;
}

export function getLatestScanResult(): ScanLabelResult | null {
  return latest;
}

export function clearLatestScanResult(): void {
  latest = null;
}
