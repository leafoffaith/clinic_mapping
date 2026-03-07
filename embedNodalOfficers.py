"""
Reads the Nodal Officers Excel file, matches each officer to an OOAT clinic
in clinics.json by serial number (sn), then writes an enriched clinics.json
with a `nodalOfficer` object on each matched clinic.

Run:
    python3 embedNodalOfficers.py
"""

import json
import pandas as pd
from pathlib import Path

BASE = Path(__file__).parent
EXCEL_PATH = BASE / "Final list OOAT Nodal Officer -google sheet (18feb).xlsx"
CLINICS_IN  = BASE / "data" / "clinics.json"
CLINICS_OUT = BASE / "data" / "clinics.json"

# ── load nodal officers ──────────────────────────────────────────────────────
df = pd.read_excel(EXCEL_PATH, header=1)
df.columns = ["sn", "district", "location", "nodal_officer", "contact", "status", "training"]
df = df.dropna(subset=["sn"])
df["sn"] = df["sn"].astype(int)
df["nodal_officer"] = df["nodal_officer"].fillna("").astype(str).str.strip()
df["contact"] = df["contact"].fillna("").astype(str).str.strip().str.replace(r'\.0$', '', regex=True)
df["training"] = df["training"].fillna("").astype(str).str.strip()

# normalise training status
def norm_training(t):
    t = t.upper().strip()
    if t == "T":
        return "Trained"
    elif t == "U":
        return "Un-Trained"
    return ""

df["training"] = df["training"].apply(norm_training)

# ── load clinics ─────────────────────────────────────────────────────────────
with open(CLINICS_IN) as f:
    data = json.load(f)

clinics = data["clinics"]

# build sn → clinic index (OOAT only)
ooat_by_sn = {}
for c in clinics:
    if c["facilityType"] == "OOAT":
        ooat_by_sn[c["sn"]] = c

# ── matching ─────────────────────────────────────────────────────────────────
matched = 0
skipped_no_officer = 0
skipped_no_match = 0

for _, row in df.iterrows():
    sn = row["sn"]
    officer_name = row["nodal_officer"]

    if not officer_name:
        skipped_no_officer += 1
        continue

    clinic = ooat_by_sn.get(sn)
    if not clinic:
        skipped_no_match += 1
        continue

    clinic["nodalOfficer"] = {
        "name": officer_name,
        "contact": row["contact"],
        "training": row["training"],
    }
    matched += 1

print(f"✓ Matched nodal officers : {matched}")
print(f"  Skipped (no officer)   : {skipped_no_officer}")
print(f"  Skipped (sn not found) : {skipped_no_match}")

# ── rebuild clinicsByDistrict ────────────────────────────────────────────────
data["clinicsByDistrict"] = {}
for c in clinics:
    data["clinicsByDistrict"].setdefault(c["district"], []).append(c)

# ── write out ────────────────────────────────────────────────────────────────
with open(CLINICS_OUT, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n✓ Written to {CLINICS_OUT}")
