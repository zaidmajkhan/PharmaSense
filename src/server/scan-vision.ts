import { normalizeScanLabelResult } from './scan-handler.ts';
import type { ScanLabelResult } from '../types/scan.ts';
import { UpstreamError } from './anthropic.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5';
const UPSTREAM_TIMEOUT_MS = 25_000;

export const SCAN_SYSTEM_PROMPT = `You read medication labels and Nutrition Facts labels from photos for PharmaSense, a prototype health education app.

Return ONLY a single JSON object with these keys:
- labelType: "medication" | "nutrition" | "unknown"
- drugName: string or null (medication only; generic or brand as printed)
- strength: string or null (as printed, e.g. "10 mg")
- form: string or null (tablet, capsule, liquid, etc. as printed)
- directions: string or null (exact directions text as printed; do not reinterpret doses)
- servingSize: string or null (nutrition only, as printed)
- servingsPerContainer: string or null (nutrition only, as printed)
- sodiumMg: number or null (nutrition only; milligrams of sodium per serving when printed)
- sodiumDailyValuePercent: number or null (nutrition only; %DV for sodium when printed)
- productName: string or null (nutrition product name if visible)
- confidence: number from 0 to 1
- rawText: string or null (visible label text useful for matching; omit patient name/address if present)
- reason: string or null (required when labelType is "unknown")

Rules:
- Never invent fields. If a value is not clearly printed, use null.
- If the image is blurry, cropped, or not a label, use labelType "unknown" with a short reason.
- Do not give medical advice, dosing recommendations, or reinterpret printed directions.
- Prefer JSON only — no markdown fences or commentary.`;

/**
 * Server-only vision call. Image bytes are held in memory for this request only.
 * Do not log imageBase64 or rawText.
 */
export async function callScanVision(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<ScanLabelResult> {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SCAN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            {
              type: 'text',
              text: 'Extract the label fields as JSON only.',
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new UpstreamError(`Anthropic API error ${response.status}`, response.status);
  }

  const data = await response.json();
  const text = (data.content ?? [])
    .filter((block: { type: string }) => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('\n')
    .trim();

  if (!text) throw new UpstreamError('Anthropic API returned an empty response.', 502);

  return normalizeScanLabelResult(parseJsonObject(text));
}

function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
