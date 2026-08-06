/**
 * One-time / periodic seed script.
 *
 * Fetches drug data from OpenFDA (drug labels) and RxNorm (name normalization
 * + drug class fallback) for the curated list in drug-list.js, parses the
 * relevant fields, and writes the result to src/data/drugs.json.
 *
 * The app imports drugs.json into the on-device SQLite "drugs" table on first
 * launch (see src/db/database.ts). All screens read from that local cache —
 * no live API calls happen during normal app use.
 *
 * Usage: npm run seed   (or: node scripts/seed-drugs.js)
 */
const fs = require('fs');
const path = require('path');
const { DRUG_LIST } = require('./drug-list');

const OPENFDA_URL = 'https://api.fda.gov/drug/label.json';
const RXNORM_BASE = 'https://rxnav.nlm.nih.gov/REST';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'drugs.json');
const MAX_FIELD_LENGTH = 700;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Strip label-section headings, bullets and excess whitespace, then truncate at a sentence boundary. */
function cleanLabelText(raw, maxLength = MAX_FIELD_LENGTH) {
  if (!raw) return null;
  const text = (Array.isArray(raw) ? raw.join(' ') : String(raw))
    .replace(/^\s*\d+(\.\d+)*\s+[A-Z][A-Z /&,-]+\b/g, '') // "6.1 ADVERSE REACTIONS" style headings
    .replace(/^(uses|purpose|directions|warnings|drug interactions|indications and usage|dosage and administration|adverse reactions)[:\s]*/i, '')
    .replace(/\u2022/g, '; ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.'));
  return (lastSentence > maxLength * 0.5 ? cut.slice(0, lastSentence + 1) : cut.trimEnd() + '…');
}

function firstField(result, keys) {
  for (const key of keys) {
    const value = cleanLabelText(result[key]);
    if (value) return value;
  }
  return null;
}

const SALT_SUFFIXES = ['', ' HYDROCHLORIDE', ' HCL', ' SODIUM', ' SUCCINATE', ' TARTRATE', ' POTASSIUM', ' CITRATE', ' SULFATE', ' MALEATE'];

/**
 * Query OpenFDA drug labels. Uses `.exact` matching so we get single-ingredient
 * products (a plain phrase search mostly returns combination products), trying
 * common salt-form suffixes. Falls back to a loose search that prefers
 * single-ingredient results.
 */
async function fetchOpenFdaLabel(name) {
  const upper = name.toUpperCase();

  for (const suffix of SALT_SUFFIXES) {
    try {
      const search = `openfda.generic_name.exact:"${upper}${suffix}"`;
      const url = `${OPENFDA_URL}?search=${encodeURIComponent(search)}&limit=5`;
      const data = await fetchJson(url);
      const results = data.results ?? [];
      // Prefer a result that carries a pharmacologic class; otherwise take the first.
      const withClass = results.find((r) => r.openfda?.pharm_class_epc?.length);
      if (results.length > 0) return withClass ?? results[0];
    } catch (err) {
      if (!String(err.message).includes('404')) throw err;
    }
    await sleep(100);
  }

  // Loose fallback: token search, prefer single-ingredient generic names.
  try {
    const search = `openfda.generic_name:"${name}"`;
    const url = `${OPENFDA_URL}?search=${encodeURIComponent(search)}&limit=10`;
    const data = await fetchJson(url);
    const results = data.results ?? [];
    const single = results.filter((r) => {
      const generics = r.openfda?.generic_name ?? [];
      return generics.length === 1 && !generics[0].includes(',') && !/\band\b/i.test(generics[0]);
    });
    const pool = single.length > 0 ? single : results;
    const withClass = pool.find((r) => r.openfda?.pharm_class_epc?.length);
    if (pool.length > 0) return withClass ?? pool[0];
  } catch (err) {
    if (!String(err.message).includes('404')) throw err;
  }
  return null;
}

/** RxNorm: normalize the name and get an RxCUI. */
async function fetchRxNorm(name) {
  try {
    const data = await fetchJson(`${RXNORM_BASE}/rxcui.json?name=${encodeURIComponent(name)}&search=2`);
    const rxcui = data?.idGroup?.rxnormId?.[0] ?? null;
    if (!rxcui) return { rxcui: null, normalizedName: null };
    const props = await fetchJson(`${RXNORM_BASE}/rxcui/${rxcui}/properties.json`);
    return { rxcui, normalizedName: props?.properties?.name ?? null };
  } catch {
    return { rxcui: null, normalizedName: null };
  }
}

/**
 * RxNorm rxclass fallback for drug class when the FDA label has no EPC class.
 * OTC monograph labels almost never carry pharm_class_epc, so this fallback
 * matters. Preference order: EPC (FDA's established pharmacologic class),
 * then mechanism of action, then ATC, then VA class.
 */
const CLASS_TYPE_PREFERENCE = ['EPC', 'MOA', 'ATC1-4', 'VA'];

async function fetchRxNormClass(rxcui) {
  if (!rxcui) return null;
  try {
    const data = await fetchJson(`${RXNORM_BASE}/rxclass/class/byRxcui.json?rxcui=${rxcui}`);
    const items = data?.rxclassDrugInfoList?.rxclassDrugInfo ?? [];
    for (const type of CLASS_TYPE_PREFERENCE) {
      const match = items.find(
        (i) =>
          i.rxclassMinConceptItem?.classType === type &&
          !/unknown|allergen/i.test(i.rxclassMinConceptItem?.className ?? '')
      );
      if (match) {
        const className = match.rxclassMinConceptItem.className;
        // VA classes are ALL CAPS; make them readable.
        return type === 'VA' ? titleCase(className.toLowerCase()) : className;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function titleCase(name) {
  return name.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}

async function buildDrugRecord(entry) {
  const [label, rxnorm] = [await fetchOpenFdaLabel(entry.name), await fetchRxNorm(entry.name)];

  let drugClass = null;
  if (label?.openfda?.pharm_class_epc?.length) {
    const epc = label.openfda.pharm_class_epc[0].replace(/\s*\[EPC\]\s*$/i, '');
    // Allergen-extract products carry "Standardized Chemical Allergen",
    // which is not a useful therapeutic class.
    if (!/allergen/i.test(epc)) drugClass = epc;
  }
  if (!drugClass) drugClass = await fetchRxNormClass(rxnorm.rxcui);
  if (!drugClass) return null;

  // OTC monograph labels split this across "purpose" (short category line)
  // and "indications_and_usage" (what it treats); combine when both exist.
  const purpose = label ? cleanLabelText(label.purpose, 200) : null;
  const indications = label ? firstField(label, ['indications_and_usage']) : null;
  const uses = purpose && indications ? `${purpose} — ${indications}` : (indications ?? purpose);
  const dosing = label ? firstField(label, ['dosage_and_administration']) : null;
  const sideEffects = label ? firstField(label, ['adverse_reactions', 'warnings']) : null;
  // OTC monograph labels put interaction guidance in the "ask a doctor or
  // pharmacist" section rather than a drug_interactions section.
  const interactions = label
    ? firstField(label, ['drug_interactions', 'ask_doctor_or_pharmacist', 'ask_doctor'])
    : null;

  if (!uses && !dosing && !sideEffects) return null; // not enough label data to be useful

  return {
    name: titleCase(entry.name),
    drug_class: drugClass,
    uses: uses ?? 'No usage information available in cached label data.',
    dosing: dosing ?? 'No dosing information available in cached label data.',
    side_effects: sideEffects ?? 'No side effect information available in cached label data.',
    interactions: interactions ?? 'No interaction information available in cached label data.',
    notable_fact: entry.notableFact,
    otc_or_prescription: entry.otc ? 'otc' : 'prescription',
    rxcui: rxnorm.rxcui,
  };
}

async function main() {
  console.log(`Seeding ${DRUG_LIST.length} drugs from OpenFDA + RxNorm...\n`);
  const drugs = [];
  const failures = [];

  for (const entry of DRUG_LIST) {
    try {
      const record = await buildDrugRecord(entry);
      if (record) {
        drugs.push(record);
        console.log(`  ok    ${record.name} (${record.drug_class})`);
      } else {
        failures.push(entry.name);
        console.log(`  skip  ${entry.name} — insufficient API data`);
      }
    } catch (err) {
      failures.push(entry.name);
      console.log(`  fail  ${entry.name} — ${err.message}`);
    }
    await sleep(250); // stay well under OpenFDA/RxNorm rate limits
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sources: ['https://api.fda.gov/drug/label.json', 'https://rxnav.nlm.nih.gov/REST/'],
    count: drugs.length,
    drugs,
  };
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\nWrote ${drugs.length} drugs to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  if (failures.length) console.log(`Skipped/failed (${failures.length}): ${failures.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
