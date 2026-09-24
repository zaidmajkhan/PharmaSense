import seedData from '@/data/drugs.json';
import { SYSTEM_PROMPT, buildContextBlock, type ContextDrug } from '@/ai/prompt';

const ibuprofen: ContextDrug = {
  name: 'Ibuprofen',
  drug_class: 'Nonsteroidal Anti-inflammatory Drug',
  otc_or_prescription: 'otc',
  uses: 'Pain reliever/fever reducer',
  side_effects: 'Stomach bleeding warning',
  interactions: 'Ask a doctor if taking aspirin',
};

describe('buildContextBlock', () => {
  it('never includes a dosing line, even when given a full cached record', () => {
    const full = seedData.drugs.slice(0, 10) as unknown as ContextDrug[];
    const block = buildContextBlock(full);
    expect(block).not.toMatch(/Dosing:/i);
    for (const drug of seedData.drugs.slice(0, 10)) {
      expect(block).not.toContain(drug.dosing);
    }
  });

  it('includes the grounding fields for each drug', () => {
    const block = buildContextBlock([ibuprofen]);
    expect(block).toContain('Name: Ibuprofen');
    expect(block).toContain('Type: Over the counter');
    expect(block).toContain('Uses: Pain reliever/fever reducer');
    expect(block).toContain('Side effects: Stomach bleeding warning');
    expect(block).toContain('Interactions: Ask a doctor if taking aspirin');
  });

  it('says so when no cached drugs match', () => {
    expect(buildContextBlock([])).toMatch(/No matching drugs found/);
  });
});

describe('SYSTEM_PROMPT', () => {
  it('keeps the safety rules', () => {
    expect(SYSTEM_PROMPT).toMatch(/never state a dose, strength, or schedule/);
    expect(SYSTEM_PROMPT).toMatch(/see a doctor if/);
    expect(SYSTEM_PROMPT).toMatch(/urgent care/);
    expect(SYSTEM_PROMPT).toMatch(/CATEGORIES only/);
  });
});

describe('seed cache', () => {
  it('has 200 drugs, each with an RxNorm id', () => {
    expect(seedData.drugs).toHaveLength(200);
    expect(seedData.drugs.every((d) => typeof d.rxcui === 'string' && d.rxcui.length > 0)).toBe(true);
  });
});
