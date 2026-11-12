export type LabelType = 'medication' | 'nutrition' | 'unknown';

export interface MedicationScanFields {
  drugName: string | null;
  strength: string | null;
  form: string | null;
  directions: string | null;
}

export interface NutritionScanFields {
  servingSize: string | null;
  servingsPerContainer: string | null;
  sodiumMg: number | null;
  sodiumDailyValuePercent: number | null;
  productName: string | null;
}

/** Structured response from the scan API. Never invent fields client-side. */
export interface ScanLabelResult {
  labelType: LabelType;
  drugName: string | null;
  strength: string | null;
  form: string | null;
  directions: string | null;
  servingSize: string | null;
  servingsPerContainer: string | null;
  sodiumMg: number | null;
  sodiumDailyValuePercent: number | null;
  productName: string | null;
  confidence: number;
  rawText: string | null;
  reason: string | null;
}

export type BpFlagDirection = 'raise' | 'lower' | 'variable';

export interface BpFlagEntry {
  id: string;
  matchTerms: string[];
  direction: BpFlagDirection;
  note: string;
  pharmacistLine: string;
}

export interface MyMedication {
  id: number;
  drug_id: number | null;
  display_name: string;
  strength: string | null;
  form: string | null;
  directions: string | null;
  source: 'scan' | 'search';
  added_at: number;
}

export interface SodiumLogEntry {
  id: number;
  logged_date: string;
  product_name: string | null;
  serving_size: string | null;
  sodium_mg: number;
  created_at: number;
}
