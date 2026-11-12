import { RateLimiter } from '@/server/ask-handler';
import { handleScan } from '@/server/scan-handler';
import { callScanVision } from '@/server/scan-vision';

const limiter = new RateLimiter();

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = request.headers.get('cf-connecting-ip') ?? forwarded?.split(',')[0]?.trim() ?? null;

  const result = await handleScan(
    raw,
    { installId: request.headers.get('x-install-id'), ip },
    {
      apiKey: process.env.ANTHROPIC_API_KEY,
      callVision: (imageBase64, mimeType, apiKey) =>
        callScanVision(imageBase64, mimeType, apiKey, process.env.ANTHROPIC_MODEL || undefined),
      limiter,
    }
  );

  // Image payload is dropped when this handler returns; do not log body fields.
  return Response.json(result.body, { status: result.status });
}
