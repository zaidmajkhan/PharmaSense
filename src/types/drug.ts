export interface Drug {
  id: number;
  name: string;
  drug_class: string;
  uses: string;
  dosing: string;
  side_effects: string;
  interactions: string;
  notable_fact: string;
  otc_or_prescription: 'otc' | 'prescription';
  /** RxNorm concept id from the NLM RxNorm database. Null if normalization failed. */
  rxcui: string | null;
  /** Comma-separated brand names from the OpenFDA label, when present. */
  brand_names: string;
}

export type UsageType = 'search' | 'flashcard' | 'view' | 'ai_query';

export interface UsageEntry {
  id: number;
  type: UsageType;
  drug_id: number | null;
  timestamp: number;
}
