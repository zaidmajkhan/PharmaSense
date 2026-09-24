import { SYSTEM_PROMPT, buildContextBlock, type ChatMessage, type ContextDrug } from '../ai/prompt.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5';
/** Below the client's 30s timeout, so the app gets a clean error instead of a dropped request. */
const UPSTREAM_TIMEOUT_MS = 25_000;

export class UpstreamError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Server-only. Calls the Anthropic Messages API with the fixed system prompt
 * plus the cached-drug context for this turn. Never import this from app code:
 * the API key must stay out of the client bundle.
 */
export async function callAnthropic(
  history: ChatMessage[],
  contextDrugs: ContextDrug[],
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
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
      system: `${SYSTEM_PROMPT}\n\n${buildContextBlock(contextDrugs)}`,
      messages: history,
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new UpstreamError(`Anthropic API error ${response.status}: ${detail.slice(0, 300)}`, response.status);
  }

  const data = await response.json();
  const text = (data.content ?? [])
    .filter((block: { type: string }) => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('\n')
    .trim();
  if (!text) throw new UpstreamError('Anthropic API returned an empty response.', 502);
  return text;
}
