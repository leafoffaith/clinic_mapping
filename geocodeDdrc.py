"""
Geocode Govt Deaddiction and Rehabilitation centres from the IPD report PDF.
Data extracted from: ddrcIpdReport.pdf

Usage:
    export GOOGLE_MAPS_API_KEY="your_key_here"
    pip install googlemaps
    python geocodeDdrc.py

Output: ddrcGeocoded.csv  (review this before running the next pipeline step)
"""

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

DEADDICTION = [
    (1,  "Amritsar",    "Swami Vivekananda Drug De-Addiction Centre, Govt Medical College & Hospital, Department of Psychiatry, Amritsar",                    50, 32,  True),
    (2,  "Amritsar",    "Govt Ayurvedic And Yoga De-Addiction Centre, Verka, Amritsar",                                                                         5,  0,  False),
    (3,  "Barnala",     "Govt Deaddiction Centre, Civil Hospital, Barnala",                                                                                     10,  5,  True),
    (4,  "Bathinda",    "De-addiction Centre, District Hospital, Opp Civil Lines, Mansa Road, Bathinda",                                                        50, 53,  True),
    (5,  "Faridkot",    "De-Addiction Centre, Guru Gobind Singh Medical College & Hospital, Faridkot",                                                          50, 27,  True),
    (6,  "Faridkot",    "Govt Deaddiction Centre, Civil Hospital, Faridkot",                                                                                    10,  0,  True),
    (7,  "Fatehgarh Sahib", "Govt Deaddiction Centre, Civil Hospital, Fatehgarh Sahib",                                                                        10, 10,  True),
    (8,  "Fazilka",     "Govt Deaddiction Centre, Civil Hospital, Fazilka",                                                                                     10,  6,  True),
    (9,  "Fazilka",     "Govt Deaddiction Centre, SDH Abohar, Fazilka",                                                                                        10,  3,  True),
    (10, "Ferozepur",   "Govt Deaddiction Centre, District Hospital, Ferozepur",                                                                               10, 14,  True),
    (11, "Gurdaspur",   "Govt Deaddiction Centre, Civil Hospital, Babri, Gurdaspur",                                                                           10,  2,  True),
    (12, "Gurdaspur",   "Mata Sulakhni Ji Sub Divisional Hospital, Batala, Gurdaspur",                                                                         10,  7,  True),
    (13, "Hoshiarpur",  "Govt Deaddiction Centre, Civil Hospital, Hoshiarpur",                                                                                 10, 24,  True),
    (14, "Hoshiarpur",  "Govt Deaddiction Centre, SDH Dasuya, Hoshiarpur",                                                                                     10, 11,  True),
    (15, "Jalandhar",   "Model De-Addiction Treatment Centre, Civil Hospital, Jalandhar",                                                                       50, 22,  True),
    (16, "Jalandhar",   "Govt Deaddiction Centre, Nur Mahal, Jalandhar",                                                                                       10,  2,  True),
    (17, "Kapurthala",  "Govt De-Addiction Centre, Navjeevan Kendra, Kapurthala",                                                                              30, 32,  True),
    (18, "Kapurthala",  "Govt Deaddiction Centre, SDH Phagwara, Kapurthala",                                                                                   15,  8,  True),
    (19, "Kapurthala",  "Govt De-Addiction Centre For Women, Navkiran Kendra, Civil Hospital, Kapurthala",                                                     25,  6,  True),
    (20, "Ludhiana",    "Govt De-Addiction Centre, Civil Hospital, Ludhiana",                                                                                  10,  2,  True),
    (21, "Ludhiana",    "Govt Deaddiction Centre, SDH Samrala, Ludhiana",                                                                                      10, 10,  True),
    (22, "Ludhiana",    "Govt Deaddiction Centre, SDH Jagraon, Ludhiana",                                                                                      10,  0,  True),
    (23, "Mansa",       "Govt District Level De-Addiction Centre, Mansa",                                                                                      10,  4,  True),
    (24, "Malerkotla",  "Govt Deaddiction Centre, SDH Malerkotla",                                                                                             10,  0,  True),
    (25, "Moga",        "Red Cross Drug De-addiction Centre, Janer, Moga",                                                                                     30, 14,  True),
    (26, "Muktsar",     "Govt Deaddiction Centre, Civil Hospital, Muktsar Sahib",                                                                              10,  1,  True),
    (27, "Muktsar",     "Govt Deaddiction Centre, SDH Malout, Muktsar",                                                                                        10,  0,  True),
    (28, "Pathankot",   "Govt Deaddiction Centre, District Hospital, Pathankot",                                                                               20, 11,  True),
    (29, "Patiala",     "Model De-Addiction Centre, Rajindra Medical College & Hospital, Patiala",                                                             50,  7,  True),
    (30, "Patiala",     "Govt Deaddiction Centre, Civil Hospital, Rajpura, Patiala",                                                                           10,  0,  True),
    (31, "Rupnagar",    "Drug De-Addiction Centre, Civil Hospital, Bela Chowk, Rupnagar",                                                                      10, 10,  True),
    (32, "Sangrur",     "Govt Deaddiction Centre, District Hospital, Sangrur",                                                                                 10, 14,  True),
    (33, "SAS Nagar",   "Govt De-Addiction Centre, Phase-6, SAS Nagar, Mohali",                                                                               10, 12,  True),
    (34, "SBS Nagar",   "Drug De-Addiction Centre, Old Civil Hospital, SBS Nagar",                                                                             25, 15,  True),
    (35, "Tarn Taran",  "Govt Deaddiction Centre, District Hospital, Tarn Taran",                                                                              20,  8,  True),
    (36, "Tarn Taran",  "Govt Deaddiction Centre, SDH Patti, Tarn Taran",                                                                                      20,  3,  True),
]

REHABILITATION = [
    (1,  "Amritsar",    "Govt Drug Rehabilitation Centre, Dhobi Ghat, Circular Road, Near GMC, Amritsar",                                                      50,  6,  True),
    (2,  "Barnala",     "Govt Drug Rehabilitation Center, Sohal Patti, Khuddi Road, Barnala",                                                                  50,  6,  False),
    (3,  "Bathinda",    "Govt Drug Counseling And Rehabilitation Centre, Growth Centre, Mansa Road, Bathinda",                                                  50, 22,  True),
    (4,  "Faridkot",    "Govt Drug Rehabilitation Centre, Arayanwala Road, Faridkot",                                                                           50,  7,  True),
    (5,  "Fatehgarh Sahib", "Govt Drug Rehabilitation Center, Near Patiala By-Pass, Vill Bahman Majra, Fatehgarh Sahib",                                      50,  8,  True),
    (6,  "Fazilka",     "Govt Drug Rehabilitation Center, Jattiwali, Fazilka",                                                                                 50,  0,  True),
    (7,  "Gurdaspur",   "Govt Rehabilitation Centre, Vill Jeevanwal, Babbri, Gurdaspur",                                                                       50, 14,  True),
    (8,  "Hoshiarpur",  "Drug Rehabilitation Center, Mohalla Fatehgarh, Hoshiarpur",                                                                           50,101,  True),
    (9,  "Jalandhar",   "Drug Rehabilitation Center, Vill Shekha, Near Lamba Pind, Jalandhar",                                                                 30, 22,  True),
    (10, "Kapurthala",  "Govt Drug Rehabilitation Centre, Nav Nirman Kendra, Kapurthala",                                                                       50,  0,  False),
    (11, "Ludhiana",    "Govt Drug Rehabilitation Centre, Near Rani Jhansi Chowk, Jagraon, Ludhiana",                                                          50, 14,  True),
    (12, "Mansa",       "Govt Drug Rehabilitation Center, Thuthian Wali Road, Mansa",                                                                          15,  0,  False),
    (13, "Moga",        "Govt Drug Rehabilitation Centre, Vill Janer, Moga",                                                                                   25, 44,  True),
    (14, "Patiala",     "Govt Drug Rehabilitation Centre, Badonger Road, Near Khalsa College, Patiala",                                                        30,  1,  True),
    (15, "Sangrur",     "Govt Rehabilitation Centres, Ghabdan, Near Mahavir Chowk, Sangrur",                                                                   50, 28,  True),
    (16, "SAS Nagar",   "Govt Rehabilitation Centre, Sector 66, SAS Nagar, Mohali",                                                                            50, 23,  True),
    (17, "Muktsar",     "Govt Drug Rehabilitation Center, Vpo Theri, Near Malout, Muktsar",                                                                    50,  2,  True),
    (18, "Tarn Taran",  "Govt Drug Rehabilitation Center, Vill Tharu, Tarn Taran",                                                                             50,  2,  True),
    (19, "Tarn Taran",  "Govt Drug Rehabilitation Center, Vill Bhagupur, Tarn Taran",                                                                          50,  0,  True),
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


def run():
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

    print(f"\nDone. {len(rows)}/55 rows written to {OUTPUT_FILE}")
    low_conf = [r for r in rows if r["confidence"] not in ("ROOFTOP", "RANGE_INTERPOLATED")]
    if low_conf:
        print(f"⚠  {len(low_conf)} low-confidence results (GEOMETRIC_CENTER or APPROXIMATE) — review these:")
        for r in low_conf:
            print(f"   Row {r['sn']} [{r['facility_type']}] {r['district']}: {r['name'][:60]}")


if __name__ == "__main__":
    run()
