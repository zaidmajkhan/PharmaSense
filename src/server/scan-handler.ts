import type { ScanLabelResult } from '../types/scan.ts';
import { RateLimiter } from './ask-handler.ts';

export const SCAN_LIMITS = {
  maxBase64Chars: 6_000_000,
  perInstallPerHour: 20,
  perIpPerHour: 40,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
};

export interface ScanBody {
  imageBase64: string;
  mimeType: (typeof SCAN_LIMITS.allowedMimeTypes)[number];
}

export interface ScanResultEnvelope {
  status: number;
  body: ScanLabelResult | { error: string };
}

export interface ScanDeps {
  apiKey: string | undefined;
  callVision: (imageBase64: string, mimeType: string, apiKey: string) => Promise<ScanLabelResult>;
  limiter: RateLimiter;
  now?: number;
}

const EMPTY_SCAN: ScanLabelResult = {
  labelType: 'unknown',
  drugName: null,
  strength: null,
  form: null,
  directions: null,
  servingSize: null,
  servingsPerContainer: null,
  sodiumMg: null,
  sodiumDailyValuePercent: null,
  productName: null,
  confidence: 0,
  rawText: null,
  reason: null,
};

/** Returns a validated body, or an error message for a 400 response. */
export function validateScanBody(raw: unknown): ScanBody | string {
  if (!raw || typeof raw !== 'object') return 'Request body must be a JSON object.';
  const { imageBase64, mimeType } = raw as { imageBase64?: unknown; mimeType?: unknown };

  if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    return 'imageBase64 must be a non-empty string.';
  }
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!cleaned || cleaned.length > SCAN_LIMITS.maxBase64Chars) {
    return `imageBase64 must be at most ${SCAN_LIMITS.maxBase64Chars} characters.`;
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(cleaned)) {
    return 'imageBase64 must be valid base64.';
  }
  if (
    typeof mimeType !== 'string' ||
    !(SCAN_LIMITS.allowedMimeTypes as readonly string[]).includes(mimeType)
  ) {
    return `mimeType must be one of: ${SCAN_LIMITS.allowedMimeTypes.join(', ')}.`;
  }

  return { imageBase64: cleaned, mimeType: mimeType as ScanBody['mimeType'] };
}

/**
 * Validates and normalizes a model JSON payload into ScanLabelResult.
 * Never invents values — missing or invalid fields become null / unknown.
 */
export function normalizeScanLabelResult(raw: unknown): ScanLabelResult {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_SCAN, reason: 'Model returned unreadable JSON.' };
  }
  const obj = raw as Record<string, unknown>;
  const labelType =
    obj.labelType === 'medication' || obj.labelType === 'nutrition' || obj.labelType === 'unknown'
      ? obj.labelType
      : 'unknown';

  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, 2000) : null;

  const num = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
    return null;
  };

  const confidenceRaw = num(obj.confidence);
  // Accept 0–1 ratios or 0–100 percentages; always clamp to [0, 1].
  let confidence = 0;
  if (confidenceRaw !== null) {
    confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;
    confidence = Math.max(0, Math.min(1, confidence));
  }

  const result: ScanLabelResult = {
    labelType,
    drugName: str(obj.drugName),
    strength: str(obj.strength),
    form: str(obj.form),
    directions: str(obj.directions),
    servingSize: str(obj.servingSize),
    servingsPerContainer: str(obj.servingsPerContainer),
    sodiumMg: num(obj.sodiumMg),
    sodiumDailyValuePercent: num(obj.sodiumDailyValuePercent),
    productName: str(obj.productName),
    confidence,
    rawText: str(obj.rawText),
    reason: str(obj.reason),
  };

  if (labelType === 'unknown' && !result.reason) {
    result.reason = 'Label could not be read with enough confidence.';
  }
  return result;
}

export async function handleScan(
  raw: unknown,
  headers: { installId: string | null; ip: string | null },
  deps: ScanDeps
): Promise<ScanResultEnvelope> {
  if (!headers.installId || !/^[\w-]{8,64}$/.test(headers.installId)) {
    return { status: 400, body: { error: 'Missing or invalid install id.' } };
  }

  const body = validateScanBody(raw);
  if (typeof body === 'string') return { status: 400, body: { error: body } };

  const now = deps.now ?? Date.now();
  const installOk = deps.limiter.allow(`scan-install:${headers.installId}`, SCAN_LIMITS.perInstallPerHour, now);
  const ipOk = !headers.ip || deps.limiter.allow(`scan-ip:${headers.ip}`, SCAN_LIMITS.perIpPerHour, now);
  if (!installOk || !ipOk) {
    return { status: 429, body: { error: 'Too many scans in the last hour. Please try again later.' } };
  }

  if (!deps.apiKey) {
    return { status: 503, body: { error: 'Label scan is not configured on the server.' } };
  }

  try {
    const result = await deps.callVision(body.imageBase64, body.mimeType, deps.apiKey);
    return { status: 200, body: normalizeScanLabelResult(result) };
  } catch {
    return { status: 502, body: { error: 'The scan service is unavailable right now. Please try again.' } };
  }
}

export { EMPTY_SCAN };
