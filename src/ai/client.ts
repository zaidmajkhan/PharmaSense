import type { ChatMessage } from '@/ai/prompt';
import { getInstallId } from '@/lib/install-id';

const REQUEST_TIMEOUT_MS = 30_000;

export type AskErrorKind = 'offline' | 'timeout' | 'rate_limited' | 'server' | 'bad_request';

export class AskError extends Error {
  constructor(
    readonly kind: AskErrorKind,
    message: string
  ) {
    super(message);
  }
}

const MESSAGES: Record<AskErrorKind, string> = {
  offline: 'You appear to be offline. Check your connection and try again.',
  timeout: 'The request took too long. Please try again.',
  rate_limited: 'You have asked a lot of questions in the last hour. Please try again later.',
  server: 'The AI service is unavailable right now. Please try again in a moment.',
  bad_request: 'That message could not be sent. Try shortening it or starting a new chat.',
};

/**
 * Sends the conversation to the PharmaSense server, which holds the API key
 * and looks up drug context by RxNorm id from its own copy of the cache.
 */
export async function askPharmaSense(history: ChatMessage[], rxcuis: string[]): Promise<string> {
  const installId = await getInstallId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-install-id': installId },
      body: JSON.stringify({ messages: history, rxcuis }),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new AskError(aborted ? 'timeout' : 'offline', MESSAGES[aborted ? 'timeout' : 'offline']);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) throw new AskError('rate_limited', MESSAGES.rate_limited);
  if (response.status === 400) throw new AskError('bad_request', MESSAGES.bad_request);
  if (!response.ok) throw new AskError('server', MESSAGES.server);

  const data = (await response.json().catch(() => null)) as { reply?: unknown } | null;
  if (!data || typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new AskError('server', MESSAGES.server);
  }
  return data.reply;
}
