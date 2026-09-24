import type { ChatMessage, ContextDrug } from '../ai/prompt.ts';

export const LIMITS = {
  maxMessages: 20,
  maxMessageChars: 2000,
  maxRxcuis: 8,
  perInstallPerHour: 30,
  perIpPerHour: 60,
};

export interface AskBody {
  messages: ChatMessage[];
  rxcuis: string[];
}

export interface AskResult {
  status: number;
  body: { reply: string } | { error: string };
}

export interface AskDeps {
  apiKey: string | undefined;
  findDrugsByRxcui: (rxcuis: string[]) => ContextDrug[];
  callModel: (history: ChatMessage[], drugs: ContextDrug[], apiKey: string) => Promise<string>;
  limiter: RateLimiter;
  now?: number;
}

/** Returns a validated body, or an error message for a 400 response. */
export function validateAskBody(raw: unknown): AskBody | string {
  if (!raw || typeof raw !== 'object') return 'Request body must be a JSON object.';
  const { messages, rxcuis } = raw as { messages?: unknown; rxcuis?: unknown };

  if (!Array.isArray(messages) || messages.length === 0) return 'messages must be a non-empty array.';
  if (messages.length > LIMITS.maxMessages) return `At most ${LIMITS.maxMessages} messages are allowed.`;
  for (const message of messages) {
    if (!message || typeof message !== 'object') return 'Each message must be an object.';
    const { role, content } = message as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return 'Message role must be "user" or "assistant".';
    if (typeof content !== 'string' || !content.trim()) return 'Message content must be a non-empty string.';
    if (content.length > LIMITS.maxMessageChars) {
      return `Each message must be at most ${LIMITS.maxMessageChars} characters.`;
    }
  }
  if ((messages[messages.length - 1] as ChatMessage).role !== 'user') {
    return 'The last message must be from the user.';
  }

  const ids = rxcuis ?? [];
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !/^\d{1,10}$/.test(id))) {
    return 'rxcuis must be an array of numeric RxNorm id strings.';
  }
  if (ids.length > LIMITS.maxRxcuis) return `At most ${LIMITS.maxRxcuis} rxcuis are allowed.`;

  return {
    messages: (messages as ChatMessage[]).map(({ role, content }) => ({ role, content })),
    rxcuis: ids as string[],
  };
}

/**
 * Sliding one-hour window per key. EAS Hosting runs stateless workers, so this
 * only limits within one worker instance; it is a first layer, not a guarantee.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  allow(key: string, limit: number, now: number = Date.now()): boolean {
    const windowStart = now - 60 * 60 * 1000;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

export async function handleAsk(
  raw: unknown,
  headers: { installId: string | null; ip: string | null },
  deps: AskDeps
): Promise<AskResult> {
  if (!headers.installId || !/^[\w-]{8,64}$/.test(headers.installId)) {
    return { status: 400, body: { error: 'Missing or invalid install id.' } };
  }

  const body = validateAskBody(raw);
  if (typeof body === 'string') return { status: 400, body: { error: body } };

  const now = deps.now ?? Date.now();
  const installOk = deps.limiter.allow(`install:${headers.installId}`, LIMITS.perInstallPerHour, now);
  const ipOk = !headers.ip || deps.limiter.allow(`ip:${headers.ip}`, LIMITS.perIpPerHour, now);
  if (!installOk || !ipOk) {
    return { status: 429, body: { error: 'Too many questions in the last hour. Please try again later.' } };
  }

  if (!deps.apiKey) {
    return { status: 503, body: { error: 'Ask AI is not configured on the server.' } };
  }

  try {
    const drugs = deps.findDrugsByRxcui(body.rxcuis);
    const reply = await deps.callModel(body.messages, drugs, deps.apiKey);
    return { status: 200, body: { reply } };
  } catch {
    return { status: 502, body: { error: 'The AI service is unavailable right now. Please try again.' } };
  }
}
