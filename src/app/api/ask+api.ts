import seedData from '@/data/drugs.json';
import type { ContextDrug } from '@/ai/prompt';
import { callAnthropic } from '@/server/anthropic';
import { RateLimiter, handleAsk } from '@/server/ask-handler';

const drugsByRxcui = new Map<string, ContextDrug>(
  seedData.drugs
    .filter((drug) => drug.rxcui)
    .map((drug) => [
      drug.rxcui as string,
      {
        name: drug.name,
        drug_class: drug.drug_class,
        otc_or_prescription: drug.otc_or_prescription as ContextDrug['otc_or_prescription'],
        uses: drug.uses,
        side_effects: drug.side_effects,
        interactions: drug.interactions,
      },
    ])
);

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

  const result = await handleAsk(
    raw,
    { installId: request.headers.get('x-install-id'), ip },
    {
      apiKey: process.env.ANTHROPIC_API_KEY,
      findDrugsByRxcui: (rxcuis) =>
        rxcuis.map((id) => drugsByRxcui.get(id)).filter((d): d is ContextDrug => !!d),
      callModel: (history, drugs, apiKey) =>
        callAnthropic(history, drugs, apiKey, process.env.ANTHROPIC_MODEL || undefined),
      limiter,
    }
  );
  return Response.json(result.body, { status: result.status });
}
