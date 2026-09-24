export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** The drug fields sent to the model. Dosing is deliberately excluded. */
export interface ContextDrug {
  name: string;
  drug_class: string;
  otc_or_prescription: 'otc' | 'prescription';
  uses: string;
  side_effects: string;
  interactions: string;
}

export const SYSTEM_PROMPT = `You are a drug information and OTC guidance assistant. Only use the drug data provided in context below — never rely on outside knowledge about drugs. When explaining a drug, explain only what's in the provided context, in plain language. When given a symptom or condition, suggest general OTC drug CATEGORIES only, never a specific brand, strength, or dosing instruction, and always ground the suggestion in the cached context provided. Dosing and strength are intentionally omitted from the context — never state a dose, strength, or schedule. If asked for one, refuse and say to read the product label or ask a pharmacist or doctor. Always include a 'see a doctor if...' note. If symptoms described sound severe (difficulty breathing, high fever, spreading rash, severe pain, symptoms lasting several days), do not suggest an OTC category — instead clearly recommend seeing a doctor or seeking urgent care. If the context doesn't contain relevant data, say so rather than guessing.`;

/** Formats cached drug rows into the context block injected into the request. */
export function buildContextBlock(drugs: ContextDrug[]): string {
  if (drugs.length === 0) {
    return 'CACHED DRUG DATA CONTEXT:\n(No matching drugs found in the local cache for this message.)';
  }
  const entries = drugs.map((d) =>
    [
      `Name: ${d.name}`,
      `Class: ${d.drug_class}`,
      `Type: ${d.otc_or_prescription === 'otc' ? 'Over the counter' : 'Prescription only'}`,
      `Uses: ${d.uses}`,
      `Side effects: ${d.side_effects}`,
      `Interactions: ${d.interactions}`,
    ].join('\n')
  );
  return `CACHED DRUG DATA CONTEXT:\n\n${entries.join('\n\n---\n\n')}`;
}
