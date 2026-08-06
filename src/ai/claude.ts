import type { Drug } from '@/types/drug';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-sonnet-5';

export const SYSTEM_PROMPT = `You are a drug information and OTC guidance assistant. Only use the drug data provided in context below — never rely on outside knowledge about drugs. When explaining a drug, explain only what's in the provided context, in plain language. When given a symptom or condition, suggest general OTC drug CATEGORIES only, never a specific brand or dosing instruction, and always ground the suggestion in the cached context provided. Always include a 'see a doctor if...' note. If symptoms described sound severe (difficulty breathing, high fever, spreading rash, severe pain, symptoms lasting several days), do not suggest an OTC category — instead clearly recommend seeing a doctor or seeking urgent care. If the context doesn't contain relevant data, say so rather than guessing.`;

/** Formats cached drug rows into the context block injected into the request. */
export function buildContextBlock(drugs: Drug[]): string {
  if (drugs.length === 0) {
    return 'CACHED DRUG DATA CONTEXT:\n(No matching drugs found in the local cache for this message.)';
  }
  const entries = drugs.map((d) =>
    [
      `Name: ${d.name}`,
      `Class: ${d.drug_class}`,
      `Type: ${d.otc_or_prescription === 'otc' ? 'Over the counter' : 'Prescription only'}`,
      `Uses: ${d.uses}`,
      `Dosing: ${d.dosing}`,
      `Side effects: ${d.side_effects}`,
      `Interactions: ${d.interactions}`,
    ].join('\n')
  );
  return `CACHED DRUG DATA CONTEXT:\n\n${entries.join('\n\n---\n\n')}`;
}

/**
 * Calls the Anthropic Messages API with the fixed system prompt plus the
 * cached-drug context for this turn. The API key comes from .env
 * (EXPO_PUBLIC_ANTHROPIC_API_KEY) and is never hardcoded.
 */
export async function askClaude(
  history: ChatMessage[],
  contextDrugs: Drug[],
  apiKey: string
): Promise<string> {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Required when the app runs in a browser (Expo web); harmless on native.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n${buildContextBlock(contextDrugs)}`,
      messages: history,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Anthropic API error ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = (data.content ?? [])
    .filter((block: { type: string }) => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('Anthropic API returned an empty response.');
  return text;
}
