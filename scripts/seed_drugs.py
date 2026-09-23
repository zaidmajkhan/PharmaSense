"""Refresh src/data/drugs.json from OpenFDA + RxNorm. Mirrors scripts/seed-drugs.js."""
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIST_PATH = ROOT / "scripts" / "drug-list.js"
OUTPUT_PATH = ROOT / "src" / "data" / "drugs.json"
PROGRESS_PATH = ROOT / "scripts" / ".seed-progress.json"
OPENFDA_URL = "https://api.fda.gov/drug/label.json"
RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"
MAX_FIELD_LENGTH = 700
SALT_SUFFIXES = [
    "",
    " HYDROCHLORIDE",
    " HCL",
    " SODIUM",
    " SUCCINATE",
    " TARTRATE",
    " POTASSIUM",
    " CITRATE",
    " SULFATE",
    " MALEATE",
    " PROPIONATE",
    " FUMARATE",
    " BESYLATE",
  " BITARTRATE",
  " PHOSPHATE",
  " MONOHYDRATE",
  " BROMIDE",
]
CLASS_TYPE_PREFERENCE = ["EPC", "MOA", "ATC1-4", "VA"]


def fetch_json(url, attempt=0):
    req = urllib.request.Request(
        url, headers={"Accept": "application/json", "User-Agent": "PharmaSenseSeed/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as err:
        if err.code == 429 and attempt < 5:
            time.sleep(1.5 * (attempt + 1))
            return fetch_json(url, attempt + 1)
        if err.code == 404:
            raise FileNotFoundError(url)
        raise


def clean_label_text(raw, max_length=MAX_FIELD_LENGTH):
    if not raw:
        return None
    text = " ".join(raw) if isinstance(raw, list) else str(raw)
    text = re.sub(r"^\s*\d+(\.\d+)*\s+[A-Z][A-Z /&,-]+\b", "", text)
    text = re.sub(
        r"^(uses|purpose|directions|warnings|drug interactions|indications and usage|dosage and administration|adverse reactions)[:\s]*",
        "",
        text,
        flags=re.I,
    )
    text = text.replace("\u2022", "; ")
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return None
    if len(text) <= max_length:
        return text
    cut = text[:max_length]
    last_sentence = max(cut.rfind(". "), cut.rfind("."))
    if last_sentence > max_length * 0.5:
        return cut[: last_sentence + 1]
    return cut.rstrip() + "…"


def first_field(result, keys):
    for key in keys:
        value = clean_label_text(result.get(key))
        if value:
            return value
    return None


def title_case(name):
    return re.sub(r"\b[a-z]", lambda m: m.group(0).upper(), name)


CONTENT_KEYS = (
    "indications_and_usage",
    "purpose",
    "dosage_and_administration",
    "adverse_reactions",
    "warnings",
)


def is_single_ingredient(result):
    generics = (result.get("openfda") or {}).get("generic_name") or []
    if len(generics) != 1:
        return False
    generic = generics[0]
    return "," not in generic and not re.search(r"\band\b", generic, re.I)


def field_text(value):
    if not value:
        return ""
    if isinstance(value, list):
        return " ".join(str(part) for part in value).strip()
    return str(value).strip()


def has_label_content(result):
    return sum(len(field_text(result.get(key))) for key in CONTENT_KEYS) > 40


def pick_label(results):
    if not results:
        return None

    def rank(result):
        return (
            0 if has_label_content(result) else 1,
            0 if is_single_ingredient(result) else 1,
            0 if (result.get("openfda") or {}).get("pharm_class_epc") else 1,
        )

    return sorted(results, key=rank)[0]


def fetch_openfda_label(name):
    upper = name.upper()
    best = None
    for suffix in SALT_SUFFIXES:
        search = f'openfda.generic_name.exact:"{upper}{suffix}"'
        url = f"{OPENFDA_URL}?search={urllib.parse.quote(search)}&limit=15"
        try:
            data = fetch_json(url)
        except FileNotFoundError:
            time.sleep(0.1)
            continue
        chosen = pick_label(data.get("results") or [])
        if chosen and has_label_content(chosen):
            return chosen
        if chosen and best is None:
            best = chosen
        time.sleep(0.1)

    search = f'openfda.generic_name:"{name}"'
    url = f"{OPENFDA_URL}?search={urllib.parse.quote(search)}&limit=10"
    try:
        data = fetch_json(url)
    except FileNotFoundError:
        return best
    chosen = pick_label(data.get("results") or [])
    if chosen and has_label_content(chosen):
        return chosen
    return chosen or best


def fetch_rxnorm(name):
    try:
        data = fetch_json(f"{RXNORM_BASE}/rxcui.json?name={urllib.parse.quote(name)}&search=2")
        rxcui = ((data.get("idGroup") or {}).get("rxnormId") or [None])[0]
        if not rxcui:
            return {"rxcui": None, "normalizedName": None}
        props = fetch_json(f"{RXNORM_BASE}/rxcui/{rxcui}/properties.json")
        return {"rxcui": rxcui, "normalizedName": (props.get("properties") or {}).get("name")}
    except Exception:
        return {"rxcui": None, "normalizedName": None}


def fetch_rxnorm_class(rxcui):
    if not rxcui:
        return None
    try:
        data = fetch_json(f"{RXNORM_BASE}/rxclass/class/byRxcui.json?rxcui={rxcui}")
        items = ((data.get("rxclassDrugInfoList") or {}).get("rxclassDrugInfo")) or []
        for class_type in CLASS_TYPE_PREFERENCE:
            for item in items:
                concept = item.get("rxclassMinConceptItem") or {}
                class_name = concept.get("className") or ""
                if concept.get("classType") == class_type and not re.search(r"unknown|allergen", class_name, re.I):
                    if class_type == "VA":
                        return title_case(class_name.lower())
                    return class_name
        return None
    except Exception:
        return None


def brand_names_from_label(label):
    raw = ((label or {}).get("openfda") or {}).get("brand_name") or []
    unique = []
    for brand in raw:
        name = title_case(str(brand).lower())
        if name not in unique:
            unique.append(name)
        if len(unique) >= 4:
            break
    return ", ".join(unique)


def build_drug_record(entry):
    label = fetch_openfda_label(entry["name"])
    rxnorm = fetch_rxnorm(entry["name"])
    drug_class = None
    epc_list = ((label or {}).get("openfda") or {}).get("pharm_class_epc") or []
    if epc_list:
        epc = re.sub(r"\s*\[EPC\]\s*$", "", epc_list[0], flags=re.I)
        if not re.search(r"allergen", epc, re.I):
            drug_class = epc
    if not drug_class:
        drug_class = fetch_rxnorm_class(rxnorm["rxcui"])
    if not drug_class:
        return None

    purpose = clean_label_text(label.get("purpose"), 200) if label else None
    indications = first_field(label, ["indications_and_usage"]) if label else None
    if purpose and indications:
        uses = f"{purpose} — {indications}"
    else:
        uses = indications or purpose
    dosing = first_field(label, ["dosage_and_administration"]) if label else None
    side_effects = first_field(label, ["adverse_reactions", "warnings"]) if label else None
    interactions = (
        first_field(label, ["drug_interactions", "ask_doctor_or_pharmacist", "ask_doctor"]) if label else None
    )
    if not uses and not dosing and not side_effects:
        return None
    return {
        "name": title_case(entry["name"]),
        "drug_class": drug_class,
        "uses": uses or "No usage information available in cached label data.",
        "dosing": dosing or "No dosing information available in cached label data.",
        "side_effects": side_effects or "No side effect information available in cached label data.",
        "interactions": interactions or "No interaction information available in cached label data.",
        "notable_fact": entry["notableFact"],
        "otc_or_prescription": "otc" if entry["otc"] else "prescription",
        "rxcui": rxnorm["rxcui"],
        "brand_names": brand_names_from_label(label),
    }


def load_entries():
    text = LIST_PATH.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\{\s*name:\s*'((?:\\'|[^'])*)',\s*otc:\s*(true|false),\s*notableFact:\s*'((?:\\'|[^'])*)'\s*\}"
    )
    entries = []
    for name, otc, fact in pattern.findall(text):
        entries.append(
            {
                "name": name.replace("\\'", "'"),
                "otc": otc == "true",
                "notableFact": fact.replace("\\'", "'"),
            }
        )
    return entries


def load_existing():
    source = PROGRESS_PATH if PROGRESS_PATH.exists() else None
    if source is None:
        return {}
    try:
        data = json.loads(source.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    found = {}
    for drug in data.get("drugs") or []:
        if (
            drug.get("name")
            and drug.get("drug_class")
            and drug.get("uses")
            and isinstance(drug.get("brand_names"), str)
            and drug.get("rxcui")
        ):
            found[drug["name"].lower()] = drug
    return found


def write_progress(drugs):
    PROGRESS_PATH.write_text(
        json.dumps({"count": len(drugs), "drugs": drugs}, indent=2),
        encoding="utf-8",
    )


def write_output(drugs):
    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "sources": [OPENFDA_URL, RXNORM_BASE + "/"],
        "count": len(drugs),
        "drugs": drugs,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main():
    entries = load_entries()
    print(f"Seeding {len(entries)} drugs from OpenFDA + RxNorm\n", flush=True)
    if len(entries) != 200:
        raise SystemExit(f"Expected 200 curated drugs, found {len(entries)}")
    existing = load_existing()
    drugs = []
    failures = []
    for entry in entries:
        cached = existing.get(entry["name"].lower())
        if cached:
            cached = {
                **cached,
                "notable_fact": entry["notableFact"],
                "otc_or_prescription": "otc" if entry["otc"] else "prescription",
            }
            drugs.append(cached)
            print(f"  keep  {cached['name']}", flush=True)
            continue
        try:
            record = build_drug_record(entry)
            if record:
                drugs.append(record)
                print(f"  ok    {record['name']} ({record['drug_class']})", flush=True)
            else:
                failures.append(entry["name"])
                print(f"  skip  {entry['name']} — insufficient API data", flush=True)
        except Exception as err:
            failures.append(entry["name"])
            print(f"  fail  {entry['name']} — {err}", flush=True)
        if len(drugs) % 5 == 0:
            write_progress(drugs)
        time.sleep(0.25)
    write_progress(drugs)
    write_output(drugs)
    print(f"\nWrote {len(drugs)} drugs to {OUTPUT_PATH}", flush=True)
    if failures:
        print(f"Skipped/failed ({len(failures)}): {', '.join(failures)}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback

        traceback.print_exc()
        raise
