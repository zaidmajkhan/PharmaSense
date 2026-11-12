import { getInstallId } from '@/lib/install-id';
import type { ScanLabelResult } from '@/types/scan';

const REQUEST_TIMEOUT_MS = 45_000;

export type ScanErrorKind = 'offline' | 'timeout' | 'rate_limited' | 'server' | 'bad_request';

export class ScanError extends Error {
  constructor(
    readonly kind: ScanErrorKind,
    message: string
  ) {
    super(message);
  }
}

const MESSAGES: Record<ScanErrorKind, string> = {
  offline: 'You appear to be offline. Check your connection and try again.',
  timeout: 'The scan took too long. Please try again with a clearer photo.',
  rate_limited: 'You have scanned a lot in the last hour. Please try again later.',
  server: 'Label scan is unavailable right now. Please try again in a moment.',
  bad_request: 'That photo could not be sent. Try another image.',
};

/**
 * Posts a label image to the PharmaSense scan route. The server holds the API key.
 * The client does not persist the image.
 */
export async function scanLabelImage(
  imageBase64: string,
  mimeType: string
): Promise<ScanLabelResult> {
  const installId = await getInstallId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-install-id': installId },
      body: JSON.stringify({ imageBase64, mimeType }),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new ScanError(aborted ? 'timeout' : 'offline', MESSAGES[aborted ? 'timeout' : 'offline']);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) throw new ScanError('rate_limited', MESSAGES.rate_limited);
  if (response.status === 400) throw new ScanError('bad_request', MESSAGES.bad_request);
  if (!response.ok) throw new ScanError('server', MESSAGES.server);

  const data = (await response.json().catch(() => null)) as ScanLabelResult | { error?: string } | null;
  if (!data || typeof data !== 'object' || !('labelType' in data)) {
    throw new ScanError('server', MESSAGES.server);
  }
  return data as ScanLabelResult;
}
