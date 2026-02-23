const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ── OOAT clinics from Excel ──────────────────────────────────────────────────

const excelPath = path.join(__dirname, '3. Geo-tagging of OOAT Clinics _ Lattitude and Longitude (Coordinates).xlsx');
const workbook = XLSX.readFile(excelPath);
const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

const clinics = [];
const clinicsByDistrict = {};

rawData.forEach((row, index) => {
    if (!row['District '] || !row['Latitude'] || !row['Longitude']) return;

    const district = String(row['District ']).trim();
    const name = String(row['Name of OOAT Clinics'] || '').trim();
    const latitude = parseFloat(row['Latitude']);
    const longitude = parseFloat(row['Longitude']);
    const remarks = String(row['Remarks, if any'] || '').trim();

    let status = 'Unknown';
    if (remarks.toLowerCase().includes('non') && remarks.toLowerCase().includes('functional')) {
        status = 'Non-Functional';
    } else if (remarks.toLowerCase().includes('functional')) {
        status = 'Functional';
    }

    const clinic = {
        sn: row['SN'] || index + 1,
        facilityType: 'OOAT',
        district,
        name,
        latitude,
        longitude,
        status
    };

    clinics.push(clinic);
    if (!clinicsByDistrict[district]) clinicsByDistrict[district] = [];
    clinicsByDistrict[district].push(clinic);
});

// ── Deaddiction & Rehabilitation centres from geocoded CSV ───────────────────
// Simple CSV parser that handles quoted fields (names may contain commas)
function parseCSVLine(line) {
    const result = [];
    let field = '';
    let inQuotes = false;
    for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { result.push(field); field = ''; }
        else { field += ch; }
    }
    result.push(field);
    return result;
}

const csvPath = path.join(__dirname, 'ddrc_geocoded.csv');
if (fs.existsSync(csvPath)) {
    const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n').map(l => l.replace(/\r$/, ''));
    const headers = parseCSVLine(lines[0]);

    lines.slice(1).forEach(line => {
        if (!line.trim()) return;   // skip blank lines
        const values = parseCSVLine(line);
        const row = Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));

        const district = row.district.trim();
        const clinic = {
            sn: parseInt(row.sn),
            facilityType: row.facility_type,   // "Deaddiction" or "Rehabilitation"
            district,
            name: row.name.trim(),
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            status: row.status.trim(),
            beds: parseInt(row.beds) || 0,
            ipd_count: parseInt(row.ipd_count) || 0
        };

        clinics.push(clinic);
        if (!clinicsByDistrict[district]) clinicsByDistrict[district] = [];
        clinicsByDistrict[district].push(clinic);
    });
    console.log(`Loaded DDRC/Rehab entries from ${csvPath}`);
} else {
    console.warn('ddrc_geocoded.csv not found — only OOAT clinics will be included.');
}

// ── Output ───────────────────────────────────────────────────────────────────

const byType = (type) => clinics.filter(c => c.facilityType === type).length;

const output = {
    clinics,
    clinicsByDistrict,
    metadata: {
        total: clinics.length,
        districts: Object.keys(clinicsByDistrict).length,
        functional: clinics.filter(c => c.status === 'Functional').length,
        nonFunctional: clinics.filter(c => c.status === 'Non-Functional').length,
        byFacilityType: {
            OOAT: byType('OOAT'),
            Deaddiction: byType('Deaddiction'),
            Rehabilitation: byType('Rehabilitation')
        },
        generatedAt: new Date().toISOString()
    }
};

const outputPath = path.join(__dirname, 'data', 'clinics.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Total: ${clinics.length} facilities across ${Object.keys(clinicsByDistrict).length} districts`);
console.log(`OOAT: ${output.metadata.byFacilityType.OOAT} | Deaddiction: ${output.metadata.byFacilityType.Deaddiction} | Rehab: ${output.metadata.byFacilityType.Rehabilitation}`);
console.log(`Functional: ${output.metadata.functional}, Non-Functional: ${output.metadata.nonFunctional}`);
console.log(`Output written to: ${outputPath}`);
