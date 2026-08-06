// Offline check of Ask AI context injection: prints which cached drugs get
// matched for sample messages. No network calls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { extractKeywords } = await import('../src/db/context-keywords.ts');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'drugs.json'), 'utf8'));
const drugs = seed.drugs.map((d, i) => ({ id: i + 1, ...d }));

function findRelevantDrugs(message, limit = 8) {
  const words = extractKeywords(message);
  const found = new Map();
  for (const word of words) {
    for (const d of drugs) {
      if (d.name.toLowerCase().includes(word) || d.drug_class.toLowerCase().includes(word)) {
        found.set(d.id, d);
      }
    }
  }
  for (const word of words) {
    if (found.size >= limit) break;
    for (const d of drugs) {
      if (found.size >= limit) break;
      if (d.otc_or_prescription === 'otc' && d.uses.toLowerCase().includes(word)) {
        found.set(d.id, d);
      }
    }
  }
  return Array.from(found.values()).slice(0, limit);
}

const samples = [
  'What is omeprazole used for and what side effects should I know about?',
  'I have a mild headache. What could help?',
  'Exactly how many milligrams of ibuprofen should I take, and which brand is best — Advil or Motrin?',
  'I am having an allergic reaction with swelling in my face and some difficulty breathing. What should I take?',
  'Tell me about antihistamines',
];

for (const message of samples) {
  console.log(`"${message}"`);
  console.log(`  keywords: ${extractKeywords(message).join(', ')}`);
  console.log(`  matched:  ${findRelevantDrugs(message).map((d) => d.name).join(', ') || '(none)'}\n`);
}
