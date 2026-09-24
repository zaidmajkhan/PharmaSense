import type { ChatMessage, ContextDrug } from '@/ai/prompt';
import { LIMITS, RateLimiter, handleAsk, validateAskBody, type AskDeps } from '@/server/ask-handler';

const INSTALL = 'install-1234abcd';
const drug: ContextDrug = {
  name: 'Ibuprofen',
  drug_class: 'NSAID',
  otc_or_prescription: 'otc',
  uses: 'Pain',
  side_effects: 'Stomach upset',
  interactions: 'Aspirin',
};

function makeDeps(overrides: Partial<AskDeps> = {}): AskDeps {
  return {
    apiKey: 'sk-test',
    findDrugsByRxcui: (ids) => (ids.includes('5640') ? [drug] : []),
    callModel: jest.fn(async () => 'grounded reply'),
    limiter: new RateLimiter(),
    now: 1_000_000,
    ...overrides,
  };
}

const userMessage = (content = 'What is ibuprofen for?'): ChatMessage => ({ role: 'user', content });

describe('validateAskBody', () => {
  it('accepts a valid body and strips extra message fields', () => {
    const result = validateAskBody({
      messages: [{ role: 'user', content: 'hi there', extra: 'drop me' }],
      rxcuis: ['5640'],
    });
    expect(result).toEqual({ messages: [{ role: 'user', content: 'hi there' }], rxcuis: ['5640'] });
  });

  it.each([
    ['non-object body', null],
    ['missing messages', { rxcuis: [] }],
    ['empty messages', { messages: [] }],
    ['bad role', { messages: [{ role: 'system', content: 'x' }] }],
    ['empty content', { messages: [{ role: 'user', content: '   ' }] }],
    ['last message not from user', { messages: [userMessage(), { role: 'assistant', content: 'ok' }] }],
    ['too long', { messages: [userMessage('a'.repeat(LIMITS.maxMessageChars + 1))] }],
    ['too many messages', { messages: Array.from({ length: LIMITS.maxMessages + 1 }, () => userMessage()) }],
    ['non-numeric rxcui', { messages: [userMessage()], rxcuis: ['abc'] }],
    ['too many rxcuis', { messages: [userMessage()], rxcuis: Array.from({ length: LIMITS.maxRxcuis + 1 }, () => '1') }],
  ])('rejects %s', (_label: string, body: unknown) => {
    expect(typeof validateAskBody(body)).toBe('string');
  });
});

describe('RateLimiter', () => {
  it('allows up to the limit within an hour, then blocks, then recovers', () => {
    const limiter = new RateLimiter();
    const t0 = 0;
    expect(limiter.allow('k', 2, t0)).toBe(true);
    expect(limiter.allow('k', 2, t0 + 1)).toBe(true);
    expect(limiter.allow('k', 2, t0 + 2)).toBe(false);
    expect(limiter.allow('k', 2, t0 + 60 * 60 * 1000 + 5)).toBe(true);
  });
});

describe('handleAsk', () => {
  it('returns the model reply and passes only server-side drug context', async () => {
    const deps = makeDeps();
    const result = await handleAsk({ messages: [userMessage()], rxcuis: ['5640', '999'] }, { installId: INSTALL, ip: '1.2.3.4' }, deps);
    expect(result).toEqual({ status: 200, body: { reply: 'grounded reply' } });
    expect(deps.callModel).toHaveBeenCalledWith([userMessage()], [drug], 'sk-test');
  });

  it('requires an install id', async () => {
    const result = await handleAsk({ messages: [userMessage()] }, { installId: null, ip: null }, makeDeps());
    expect(result.status).toBe(400);
  });

  it('returns 400 for an invalid body without calling the model', async () => {
    const deps = makeDeps();
    const result = await handleAsk({ messages: [] }, { installId: INSTALL, ip: null }, deps);
    expect(result.status).toBe(400);
    expect(deps.callModel).not.toHaveBeenCalled();
  });

  it('rate-limits per install id', async () => {
    const deps = makeDeps();
    for (let i = 0; i < LIMITS.perInstallPerHour; i++) {
      const ok = await handleAsk({ messages: [userMessage()] }, { installId: INSTALL, ip: null }, deps);
      expect(ok.status).toBe(200);
    }
    const blocked = await handleAsk({ messages: [userMessage()] }, { installId: INSTALL, ip: null }, deps);
    expect(blocked.status).toBe(429);
  });

  it('returns 503 when the server has no key', async () => {
    const result = await handleAsk({ messages: [userMessage()] }, { installId: INSTALL, ip: null }, makeDeps({ apiKey: undefined }));
    expect(result.status).toBe(503);
  });

  it('hides upstream error details behind a 502', async () => {
    const deps = makeDeps({
      callModel: jest.fn(async () => {
        throw new Error('Anthropic API error 500: secret detail');
      }),
    });
    const result = await handleAsk({ messages: [userMessage()] }, { installId: INSTALL, ip: null }, deps);
    expect(result.status).toBe(502);
    expect(JSON.stringify(result.body)).not.toContain('secret detail');
  });
});

describe('RateLimiter', () => {
  const HOUR = 60 * 60 * 1000;

  it('frees the slot once a hit leaves the one-hour window', () => {
    const limiter = new RateLimiter();
    expect(limiter.allow('k', 1, 0)).toBe(true);
    expect(limiter.allow('k', 1, HOUR - 1)).toBe(false);
    expect(limiter.allow('k', 1, HOUR + 1)).toBe(true);
  });

  it('forgets idle keys so memory does not grow with every install id', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 100; i++) limiter.allow(`install:${i}`, 5, 0);
    expect(limiter.size).toBe(100);
    limiter.allow('install:new', 5, HOUR + 60 * 1000);
    expect(limiter.size).toBe(1);
  });
});
