import { RateLimiter } from '@/server/ask-handler';
import {
  SCAN_LIMITS,
  handleScan,
  normalizeScanLabelResult,
  validateScanBody,
  type ScanDeps,
} from '@/server/scan-handler';
import type { ScanLabelResult } from '@/types/scan';

const INSTALL = 'install-1234abcd';

const sampleResult: ScanLabelResult = {
  labelType: 'medication',
  drugName: 'Lisinopril',
  strength: '10 mg',
  form: 'tablet',
  directions: 'Take one tablet by mouth daily',
  servingSize: null,
  servingsPerContainer: null,
  sodiumMg: null,
  sodiumDailyValuePercent: null,
  productName: null,
  confidence: 0.91,
  rawText: 'Lisinopril 10 mg',
  reason: null,
};

function makeDeps(overrides: Partial<ScanDeps> = {}): ScanDeps {
  return {
    apiKey: 'sk-test',
    callVision: jest.fn(async () => sampleResult),
    limiter: new RateLimiter(),
    now: 1_000_000,
    ...overrides,
  };
}

describe('validateScanBody', () => {
  it('accepts a valid image payload and strips data-url prefixes', () => {
    const result = validateScanBody({
      imageBase64: 'data:image/jpeg;base64,abc123==',
      mimeType: 'image/jpeg',
    });
    expect(result).toEqual({ imageBase64: 'abc123==', mimeType: 'image/jpeg' });
  });

  it.each([
    ['non-object', null],
    ['missing image', { mimeType: 'image/jpeg' }],
    ['empty image', { imageBase64: '   ', mimeType: 'image/jpeg' }],
    ['bad mime', { imageBase64: 'abc', mimeType: 'image/tiff' }],
    [
      'too large',
      { imageBase64: 'a'.repeat(SCAN_LIMITS.maxBase64Chars + 1), mimeType: 'image/jpeg' },
    ],
  ])('rejects %s', (_label: string, body: unknown) => {
    expect(typeof validateScanBody(body)).toBe('string');
  });
});

describe('normalizeScanLabelResult', () => {
  it('keeps medication fields and clamps confidence', () => {
    const result = normalizeScanLabelResult({
      labelType: 'medication',
      drugName: 'Ibuprofen',
      strength: '200 mg',
      form: 'tablet',
      directions: 'Take with food',
      confidence: 150,
      rawText: 'Ibuprofen 200 mg',
      invented: 'drop me',
    });
    expect(result.labelType).toBe('medication');
    expect(result.drugName).toBe('Ibuprofen');
    expect(result.confidence).toBe(1);
    expect(result.sodiumMg).toBeNull();
  });

  it('returns unknown with a reason when the payload is invalid', () => {
    const result = normalizeScanLabelResult('not-json');
    expect(result.labelType).toBe('unknown');
    expect(result.reason).toBeTruthy();
  });

  it('parses nutrition sodium fields without inventing missing ones', () => {
    const result = normalizeScanLabelResult({
      labelType: 'nutrition',
      sodiumMg: '480',
      sodiumDailyValuePercent: 21,
      servingSize: '1 cup',
    });
    expect(result.labelType).toBe('nutrition');
    expect(result.sodiumMg).toBe(480);
    expect(result.sodiumDailyValuePercent).toBe(21);
    expect(result.drugName).toBeNull();
    expect(result.productName).toBeNull();
  });
});

describe('handleScan', () => {
  it('returns the vision result and does not call the model on bad bodies', async () => {
    const deps = makeDeps();
    const ok = await handleScan(
      { imageBase64: 'abc123', mimeType: 'image/jpeg' },
      { installId: INSTALL, ip: '1.2.3.4' },
      deps
    );
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ labelType: 'medication', drugName: 'Lisinopril' });
    expect(deps.callVision).toHaveBeenCalledWith('abc123', 'image/jpeg', 'sk-test');

    const bad = await handleScan({}, { installId: INSTALL, ip: null }, makeDeps());
    expect(bad.status).toBe(400);
  });

  it('requires an install id and rate-limits', async () => {
    const missing = await handleScan(
      { imageBase64: 'abc', mimeType: 'image/jpeg' },
      { installId: null, ip: null },
      makeDeps()
    );
    expect(missing.status).toBe(400);

    const limiter = new RateLimiter();
    const deps = makeDeps({
      limiter,
      now: 1000,
      callVision: jest.fn(async () => sampleResult),
    });
    for (let i = 0; i < SCAN_LIMITS.perInstallPerHour; i++) {
      const result = await handleScan(
        { imageBase64: 'abc', mimeType: 'image/jpeg' },
        { installId: INSTALL, ip: null },
        deps
      );
      expect(result.status).toBe(200);
    }
    const blocked = await handleScan(
      { imageBase64: 'abc', mimeType: 'image/jpeg' },
      { installId: INSTALL, ip: null },
      deps
    );
    expect(blocked.status).toBe(429);
  });

  it('returns 503 when the API key is missing without calling vision', async () => {
    const deps = makeDeps({ apiKey: undefined });
    const result = await handleScan(
      { imageBase64: 'abc', mimeType: 'image/jpeg' },
      { installId: INSTALL, ip: null },
      deps
    );
    expect(result.status).toBe(503);
    expect(deps.callVision).not.toHaveBeenCalled();
  });
});
