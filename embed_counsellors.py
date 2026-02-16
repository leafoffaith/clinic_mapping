"""
Reads the counsellors Excel file, fuzzy-matches each counsellor's
"Place of Posting" to a clinic in clinics.json (by district + name),
then writes an enriched clinics.json with a `counsellors` array on
each matched clinic.

Run:
    python3 embed_counsellors.py
"""

import json
import re
import pandas as pd
from pathlib import Path

# ── paths ────────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent
EXCEL_PATH = BASE / "1. Compiled list of counsellors (district-wise).xlsx"
CLINICS_IN  = BASE / "data" / "clinics.json"
CLINICS_OUT = BASE / "data" / "clinics.json"   # overwrite in place

# ── load counsellors ─────────────────────────────────────────────────────────
df = pd.read_excel(EXCEL_PATH, header=1)
df.columns = [
    "sr_no", "crc_name", "sub_sr", "district",
    "name", "designation", "place_of_posting",
    "facility_type", "contact", "gender", "email"
]
# drop fully-empty rows
df = df.dropna(subset=["name", "place_of_posting"])
df["district"]          = df["district"].ffill().str.strip()
df["designation"]       = df["designation"].fillna("Counsellor").str.strip()
df["place_of_posting"]  = df["place_of_posting"].astype(str).str.strip()
df["name"]              = df["name"].astype(str).str.strip()
df["facility_type"]     = df["facility_type"].fillna("").str.strip()
df["contact"]           = df["contact"].fillna("").astype(str).str.strip()
df["gender"]            = df["gender"].fillna("").str.strip()

# normalise designation (fix typos, trailing spaces)
DESIG_MAP = {
    "counsellor": "Counsellor",
    "clinical psychologist": "Clinical Psychologist",
    "psychologist": "Psychologist",
    "psychiatric social worker": "Psychiatric Social Worker",
    "psychiatrict social worker": "Psychiatric Social Worker",
    "medical/psychiatric social worker": "Psychiatric Social Worker",
    "social worker": "Social Worker",
}
def norm_desig(d):
    return DESIG_MAP.get(d.lower().strip(), d.strip())

df["designation"] = df["designation"].apply(norm_desig)

# ── load clinics ──────────────────────────────────────────────────────────────
with open(CLINICS_IN) as f:
    data = json.load(f)

clinics = data["clinics"]

# ── fuzzy-match helpers ───────────────────────────────────────────────────────
def tokenise(s: str) -> set:
    """Lower-case alphanumeric tokens, drop very short words."""
    s = s.lower()
    # expand common abbreviations
    s = re.sub(r'\bsdh\b',  'sub divisional hospital', s)
    s = re.sub(r'\bchc\b',  'community health centre', s)
    s = re.sub(r'\bphc\b',  'primary health centre', s)
    s = re.sub(r'\brh\b',   'rural hospital', s)
    s = re.sub(r'\bshc\b',  'sub health centre', s)
    s = re.sub(r'\bdh\b',   'district hospital', s)
    s = re.sub(r'\buphc\b', 'urban primary health centre', s)
    s = re.sub(r'\bmphc\b', 'mini primary health centre', s)
    tokens = re.findall(r'[a-z0-9]+', s)
    return {t for t in tokens if len(t) > 2}

STOP = {'ooat', 'clinic', 'centre', 'center', 'hospital', 'govt',
        'government', 'and', 'the', 'for', 'health', 'community',
        'district', 'primary', 'sub', 'urban', 'rural', 'divisional',
        'mini', 'medical', 'college', 'rehabilitation', 'addiction',
        'drug', 'deaddiction', 'de', 'care', 'jail', 'central',
        'new', 'old', 'general', 'civil'}

def key_tokens(s: str) -> set:
    return tokenise(s) - STOP

def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)

# build a per-district index  district → list of (clinic, key_tokens)
district_index: dict = {}
for c in clinics:
    c["counsellors"] = []           # initialise empty list
    d = c["district"].strip().lower()
    kt = key_tokens(c["name"])
    district_index.setdefault(d, []).append((c, kt))

# Build a flat lookup: any alias → canonical key from clinics.json
# Key = lower-stripped district from counsellor sheet
# Value = exact district string used in clinics.json
DIST_ALIAS: dict[str, str] = {}
with open(CLINICS_IN) as _f:
    _data = json.load(_f)
    _clinic_districts = list(_data["clinicsByDistrict"].keys())

# Direct lowercase map of clinics districts
for d in _clinic_districts:
    DIST_ALIAS[d.lower().strip()] = d

# Hand-coded aliases  (counsellor sheet name → clinics.json name)
_extra = {
    "s.a.s nagar":          "SAS nagar Mohali",
    "sbs nagar":            "Shaheed Bhagat Singh Nagar",
    "roopnagar":            "Rupnagar",
    "firozepur":            "Ferozpur",
    "sri muktsar sahib":    "Muktsar",
    "malerkotla":           "Sangrur",   # Malerkotla was part of Sangrur geo-data
    "pathankot":            "Pathankot",
    "gurdaspur":            "Gurdaspur",
    "fatehgarh sahib":      "Fatehgarh Sahib",
    "jalandhar":            "Jalandhar",
    "kapurthala":           "Kapurthala",
    "faridkot":             "Faridkot",
    "fazilka":              "Fazilka",
}
for alias, canonical in _extra.items():
    DIST_ALIAS[alias.lower().strip()] = canonical

def norm_district(d: str) -> str:
    key = d.lower().strip()
    return DIST_ALIAS.get(key, d.strip())

# ── matching ──────────────────────────────────────────────────────────────────
matched   = 0
unmatched = 0
unmatched_rows = []

for _, row in df.iterrows():
    posting  = row["place_of_posting"]
    dist_raw = row["district"]
    dist_key = norm_district(dist_raw)

    # gather candidates: exact district first, then all districts as fallback
    candidates = district_index.get(dist_key, [])
    if not candidates:
        # try all
        for v in district_index.values():
            candidates.extend(v)

    post_kt = key_tokens(posting)
    best_clinic = None
    best_score  = 0.0

    for clinic, ckt in candidates:
        score = jaccard(post_kt, ckt)
        if score > best_score:
            best_score  = score
            best_clinic = clinic

    THRESHOLD = 0.15   # minimum overlap to accept a match

    if best_clinic and best_score >= THRESHOLD:
        counsellor = {
            "name":        row["name"],
            "designation": row["designation"],
            "contact":     row["contact"],
            "gender":      row["gender"],
            "facilityType": row["facility_type"],
        }
        best_clinic["counsellors"].append(counsellor)
        matched += 1
    else:
        unmatched += 1
        unmatched_rows.append({
            "district": dist_raw,
            "place":    posting,
            "name":     row["name"],
            "score":    round(best_score, 3),
            "best":     best_clinic["name"] if best_clinic else "—"
        })

print(f"✓ Matched  : {matched}")
print(f"✗ Unmatched: {unmatched}")
if unmatched_rows:
    print("\nUnmatched counsellors:")
    for u in unmatched_rows:
        print(f"  [{u['district']}] {u['place']!r}  →  best={u['best']!r}  score={u['score']}")

# ── rebuild clinicsByDistrict (with counsellors) ──────────────────────────────
data["clinicsByDistrict"] = {}
for c in clinics:
    data["clinicsByDistrict"].setdefault(c["district"], []).append(c)

# ── collect unique designations for the UI ────────────────────────────────────
all_designations = sorted({
    csl["designation"]
    for c in clinics
    for csl in c["counsellors"]
})
data["metadata"]["designations"] = all_designations

# ── write out ─────────────────────────────────────────────────────────────────
with open(CLINICS_OUT, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n✓ Written to {CLINICS_OUT}")
print(f"  Designations found: {all_designations}")
