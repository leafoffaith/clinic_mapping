"""
Geocode Govt Deaddiction and Rehabilitation centres.
Data sources:
  - ddrcIpdReport.pdf  (original)
  - newList.xlsx / Feb26 sheet  (updated Feb 2026)

Usage:
    export GOOGLE_MAPS_API_KEY="your_key_here"
    pip install googlemaps pandas openpyxl

    # Geocode only entries that are missing coordinates in ddrcGeocoded.csv
    python geocodeDdrc.py --new-only

    # Rebuild entire ddrcGeocoded.csv from scratch
    python geocodeDdrc.py

Output: ddrcGeocoded.csv  (review this before running the next pipeline step)
"""

import argparse
import csv
import os
import time

import googlemaps

API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")
if not API_KEY:
    raise SystemExit("Set GOOGLE_MAPS_API_KEY environment variable before running.")

gmaps = googlemaps.Client(key=API_KEY)

# ── Data from PDF ────────────────────────────────────────────────────────────
# Fields: sn, facility_type, district, name, beds, ipd_count, operational
# operational=False → "Non-Functional"  (matches existing OOAT status values)

# Updated Feb 2026 from newList.xlsx (Feb26 sheet)
# Removed: Amritsar Verka (Non-Functional, no longer in official list)
DEADDICTION = [
    (1,  "Amritsar",        "Swami Vivekananda Drug De-Addiction Centre, Govt Medical College & Hospital, Department of Psychiatry, Amritsar",  100, 32,  True),
    (2,  "Barnala",         "Govt Deaddiction Centre, Civil Hospital, Barnala",                                                                   15,  5,  True),
    (3,  "Bathinda",        "De-addiction Centre, District Hospital, Opp Civil Lines, Mansa Road, Bathinda",                                      80, 53,  True),
    (4,  "Faridkot",        "De-Addiction Centre, Guru Gobind Singh Medical College & Hospital, Faridkot",                                       100, 27,  True),
    (5,  "Faridkot",        "Govt Deaddiction Centre, Civil Hospital, Faridkot",                                                                  10,  0,  True),
    (6,  "Fatehgarh Sahib", "Govt Deaddiction Centre, Civil Hospital, Fatehgarh Sahib",                                                           10, 10,  True),
    (7,  "Fazilka",         "Govt Deaddiction Centre, Civil Hospital, Fazilka",                                                                   20,  6,  True),
    (8,  "Fazilka",         "Govt Deaddiction Centre, SDH Abohar, Fazilka",                                                                       20,  3,  True),
    (9,  "Ferozepur",       "Govt Deaddiction Centre, District Hospital, Ferozepur",                                                              20, 14,  True),
    (10, "Gurdaspur",       "Govt Deaddiction Centre, Civil Hospital, Babri, Gurdaspur",                                                          10,  2,  True),
    (11, "Gurdaspur",       "Mata Sulakhni Ji Sub Divisional Hospital, Batala, Gurdaspur",                                                        10,  7,  True),
    (12, "Hoshiarpur",      "Govt Deaddiction Centre, Civil Hospital, Hoshiarpur",                                                                15, 24,  True),
    (13, "Hoshiarpur",      "Govt Deaddiction Centre, SDH Dasuya, Hoshiarpur",                                                                    15, 11,  True),
    (14, "Jalandhar",       "Model De-Addiction Treatment Centre, Civil Hospital, Jalandhar",                                                    100, 22,  True),
    (15, "Jalandhar",       "Govt Deaddiction Centre, Nur Mahal, Jalandhar",                                                                      15,  2,  True),
    (16, "Kapurthala",      "Govt De-Addiction Centre, Navjeevan Kendra, Kapurthala",                                                             70, 32,  True),
    (17, "Kapurthala",      "Govt Deaddiction Centre, SDH Phagwara, Kapurthala",                                                                  20,  8,  True),
    (18, "Kapurthala",      "Govt De-Addiction Centre For Women, Navkiran Kendra, Civil Hospital, Kapurthala",                                    25,  6,  True),
    (19, "Ludhiana",        "Govt De-Addiction Centre, Civil Hospital, Ludhiana",                                                                 10,  2,  True),
    (20, "Ludhiana",        "Govt Deaddiction Centre, SDH Samrala, Ludhiana",                                                                     10, 10,  True),
    (21, "Ludhiana",        "Govt Deaddiction Centre, SDH Jagraon, Ludhiana",                                                                     10,  0,  True),
    (22, "Mansa",           "Govt District Level De-Addiction Centre, Mansa",                                                                     10,  4,  True),
    (23, "Malerkotla",      "Govt Deaddiction Centre, SDH Malerkotla",                                                                            30,  0,  True),
    (24, "Muktsar",         "Govt Deaddiction Centre, Civil Hospital, Muktsar Sahib",                                                             20,  1,  True),
    (25, "Muktsar",         "Govt Deaddiction Centre, SDH Malout, Muktsar",                                                                       20,  0,  True),
    (26, "Muktsar",         "Govt Deaddiction Centre, Civil Hospital, Gidderbaha, Muktsar Sahib",                                                 20,  0,  True),   # NEW Feb 2026
    (27, "Muktsar",         "Govt Deaddiction Centre, Civil Hospital, Badal, Muktsar Sahib",                                                      20,  0,  True),   # NEW Feb 2026
    (28, "Pathankot",       "Govt Deaddiction Centre, District Hospital, Pathankot",                                                              20, 11,  True),
    (29, "Patiala",         "Model De-Addiction Centre, Rajindra Medical College & Hospital, Patiala",                                            60,  7,  True),
    (30, "Patiala",         "Govt Deaddiction Centre, Civil Hospital, Rajpura, Patiala",                                                          10,  0,  True),
    (31, "Rupnagar",        "Drug De-Addiction Centre, Civil Hospital, Bela Chowk, Rupnagar",                                                     36, 10,  True),
    (32, "Rupnagar",        "Govt Deaddiction Centre, SDH Anandpur Sahib, Rupnagar",                                                              20,  0,  True),   # NEW Feb 2026
    (33, "Sangrur",         "Govt Deaddiction Centre, District Hospital, Sangrur",                                                                10, 14,  True),
    (34, "SAS Nagar",       "Govt De-Addiction Centre, Phase-6, SAS Nagar, Mohali",                                                               10, 12,  True),
    (35, "SBS Nagar",       "Drug De-Addiction Centre, Old Civil Hospital, SBS Nagar",                                                             50, 15,  True),
    (36, "Tarn Taran",      "Govt Deaddiction Centre, District Hospital, Tarn Taran",                                                             15,  8,  True),
    (37, "Tarn Taran",      "Govt Deaddiction Centre, SDH Patti, Tarn Taran",                                                                     15,  3,  True),
]

# Updated Feb 2026 from newList.xlsx (Feb26 sheet)
# Removed: Mansa rehab (Non-Functional, no longer in official list)
# Note: Moga Red Cross, Jalandhar Vill Shekha, Ludhiana Rani Jhansi Chowk,
#       Patiala Badonger Road, SAS Nagar Sector 66 are now classified as
#       "Deaddiction & Rehabilitation" but kept here for geocoding reference.
REHABILITATION = [
    (1,  "Amritsar",        "Govt Drug Rehabilitation Centre, Dhobi Ghat, Circular Road, Near GMC, Amritsar",                           50,  6,  True),
    (2,  "Barnala",         "Govt Drug Rehabilitation Center, Sohal Patti, Khuddi Road, Barnala",                                        50,  6,  True),
    (3,  "Bathinda",        "Govt Drug Counseling And Rehabilitation Centre, Growth Centre, Mansa Road, Bathinda",                       60, 22,  True),
    (4,  "Faridkot",        "Govt Drug Rehabilitation Centre, Arayanwala Road, Faridkot",                                                50,  7,  True),
    (5,  "Fatehgarh Sahib", "Govt Drug Rehabilitation Center, Near Patiala By-Pass, Vill Bahman Majra, Fatehgarh Sahib",               100,  8,  True),
    (6,  "Fazilka",         "Govt Drug Rehabilitation Center, Jattiwali, Fazilka",                                                       75,  0,  True),
    (7,  "Gurdaspur",       "Govt Rehabilitation Centre, Vill Jeevanwal, Babbri, Gurdaspur",                                             20, 14,  True),
    (8,  "Hoshiarpur",      "Drug Rehabilitation Center, Mohalla Fatehgarh, Hoshiarpur",                                                100,101,  True),
    (9,  "Jalandhar",       "Drug Rehabilitation Center, Vill Shekha, Near Lamba Pind, Jalandhar",                                       50, 22,  True),
    (10, "Kapurthala",      "Govt Drug Rehabilitation Centre, Nav Nirman Kendra, Kapurthala",                                            50,  0,  False),
    (11, "Ludhiana",        "Govt Drug Rehabilitation Centre, Near Rani Jhansi Chowk, Jagraon, Ludhiana",                               60, 14,  True),
    (12, "Moga",            "Govt Drug Rehabilitation Centre, Vill Janer, Moga",                                                         69, 44,  True),
    (13, "Patiala",         "Govt Drug Rehabilitation Centre, Badonger Road, Near Khalsa College, Patiala",                             30,  1,  True),
    (14, "Sangrur",         "Govt Rehabilitation Centres, Ghabdan, Near Mahavir Chowk, Sangrur",                                        70, 28,  True),
    (15, "SAS Nagar",       "Govt Rehabilitation Centre, Sector 66, SAS Nagar, Mohali",                                                100, 23,  True),
    (16, "Muktsar",         "Govt Drug Rehabilitation Center, Vpo Theri, Near Malout, Muktsar",                                          50,  2,  True),
    (17, "Tarn Taran",      "Govt Drug Rehabilitation Center, Vill Tharu, Tarn Taran",                                                  100,  2,  True),
    (18, "Tarn Taran",      "Govt Drug Rehabilitation Center, Vill Bhagupur, Tarn Taran",                                                50,  0,  True),
]

# ── Geocoding ────────────────────────────────────────────────────────────────

OUTPUT_FILE = "ddrcGeocoded.csv"
FIELDNAMES  = ["sn", "facility_type", "district", "name", "latitude", "longitude",
               "confidence", "beds", "ipd_count", "status"]

def geocode_row(sn, district, name, beds, ipd_count, operational, facility_type):
    query = f"{name}, {district}, Punjab, India"
    try:
        results = gmaps.geocode(query)
    except Exception as e:
        print(f"  ERROR geocoding '{name}': {e}")
        return None

    if not results:
        print(f"  NO RESULT: {name}")
        return None

    loc  = results[0]["geometry"]["location"]
    conf = results[0]["geometry"]["location_type"]
    status = "Functional" if operational else "Non-Functional"
    print(f"  [{conf}] {name[:60]}")
    return {
        "sn":            sn,
        "facility_type": facility_type,
        "district":      district,
        "name":          name,
        "latitude":      round(loc["lat"], 6),
        "longitude":     round(loc["lng"], 6),
        "confidence":    conf,
        "beds":          beds,
        "ipd_count":     ipd_count,
        "status":        status,
    }


def run(new_only=False):
    """
    new_only=True  → geocode only rows in OUTPUT_FILE that have confidence=PENDING,
                     then patch those rows in-place and save.
    new_only=False → geocode everything from scratch (full rebuild).
    """
    if new_only:
        # Load existing rows; geocode only PENDING ones
        existing = []
        with open(OUTPUT_FILE, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                existing.append(r)

        pending = [r for r in existing if r.get("confidence") == "PENDING"]
        if not pending:
            print("No PENDING entries found — nothing to geocode.")
            return

        print(f"=== Geocoding {len(pending)} new entries ===")
        for r in pending:
            result = geocode_row(
                r["sn"], r["district"], r["name"],
                int(r["beds"] or 0), int(r["ipd_count"] or 0),
                r["status"] == "Functional", r["facility_type"]
            )
            if result:
                r.update({
                    "latitude":   result["latitude"],
                    "longitude":  result["longitude"],
                    "confidence": result["confidence"],
                })
            time.sleep(0.1)

        with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
            writer.writeheader()
            writer.writerows(existing)

        print(f"\nDone. {len(pending)} new entries geocoded in {OUTPUT_FILE}")
        return

    # Full rebuild
    rows = []

    print("=== Geocoding Deaddiction Centres ===")
    for sn, district, name, beds, ipd, operational in DEADDICTION:
        row = geocode_row(sn, district, name, beds, ipd, operational, "Deaddiction")
        if row:
            rows.append(row)
        time.sleep(0.1)  # stay well under rate limit

    print("\n=== Geocoding Rehabilitation Centres ===")
    for sn, district, name, beds, ipd, operational in REHABILITATION:
        row = geocode_row(sn, district, name, beds, ipd, operational, "Rehabilitation")
        if row:
            rows.append(row)
        time.sleep(0.1)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone. {len(rows)} rows written to {OUTPUT_FILE}")
    low_conf = [r for r in rows if r["confidence"] not in ("ROOFTOP", "RANGE_INTERPOLATED")]
    if low_conf:
        print(f"⚠  {len(low_conf)} low-confidence results (GEOMETRIC_CENTER or APPROXIMATE) — review these:")
        for r in low_conf:
            print(f"   Row {r['sn']} [{r['facility_type']}] {r['district']}: {r['name'][:60]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--new-only",
        action="store_true",
        help="Geocode only PENDING entries in existing ddrcGeocoded.csv (saves API quota)"
    )
    args = parser.parse_args()
    run(new_only=args.new_only)
