import type { Drug } from '@/types/drug';

export interface DrugMatchCandidate {
  id: number;
  name: string;
  drug_class: string;
  brand_names: string;
}

export interface DrugMatchResult {
  drug: DrugMatchCandidate;
  score: number;
  matchedOn: 'name' | 'brand' | 'class';
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t.length > 2);
}

/**
 * Scores how well a scanned drug name matches a cached drug (name, brand, or class).
 * Returns null when confidence is too low to trust an automatic match.
 */
export function scoreDrugMatch(
  scannedName: string,
  drug: DrugMatchCandidate
): DrugMatchResult | null {
  const query = normalize(scannedName);
  if (!query) return null;

  const name = normalize(drug.name);
  if (name === query) return { drug, score: 1, matchedOn: 'name' };
  if (name.startsWith(query) || query.startsWith(name)) {
    return { drug, score: 0.92, matchedOn: 'name' };
  }
  if (name.includes(query) || query.includes(name)) {
    return { drug, score: 0.85, matchedOn: 'name' };
  }

  const brands = drug.brand_names
    .split(',')
    .map((b) => normalize(b))
    .filter(Boolean);
  for (const brand of brands) {
    if (brand === query) return { drug, score: 0.95, matchedOn: 'brand' };
    if (brand.includes(query) || query.includes(brand)) {
      return { drug, score: 0.82, matchedOn: 'brand' };
    }
  }

  const queryTokens = new Set(tokens(query));
  const nameTokens = tokens(name);
  if (queryTokens.size > 0 && nameTokens.length > 0) {
    const overlap = nameTokens.filter((t) => queryTokens.has(t)).length;
    const ratio = overlap / Math.max(queryTokens.size, nameTokens.length);
    if (ratio >= 0.6) return { drug, score: 0.7 + ratio * 0.2, matchedOn: 'name' };
  }

  const drugClass = normalize(drug.drug_class);
  if (drugClass && (drugClass === query || query.includes(drugClass))) {
    return { drug, score: 0.55, matchedOn: 'class' };
  }

  return null;
}

/** Best confident match from the local cache, or null. */
export function matchDrugName(
  scannedName: string | null | undefined,
  drugs: DrugMatchCandidate[],
  minScore = 0.7
): DrugMatchResult | null {
  if (!scannedName?.trim()) return null;
  let best: DrugMatchResult | null = null;
  for (const drug of drugs) {
    const scored = scoreDrugMatch(scannedName, drug);
    if (!scored || scored.score < minScore) continue;
    if (!best || scored.score > best.score) best = scored;
  }
  return best;
}

/** Narrow Drug rows to the fields matching needs (keeps tests free of full Drug fixtures). */
export function toMatchCandidates(drugs: Drug[]): DrugMatchCandidate[] {
  return drugs.map((d) => ({
    id: d.id,
    name: d.name,
    drug_class: d.drug_class,
    brand_names: d.brand_names,
  }));
}
