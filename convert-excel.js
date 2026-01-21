const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const excelPath = path.join(__dirname, '3. Geo-tagging of OOAT Clinics _ Lattitude and Longitude (Coordinates).xlsx');
const workbook = XLSX.readFile(excelPath);

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON
const rawData = XLSX.utils.sheet_to_json(sheet);

// Process and clean the data
const clinics = [];
const clinicsByDistrict = {};

rawData.forEach((row, index) => {
    // Skip rows without essential data (note: "District " has trailing space in Excel)
    if (!row['District '] || !row['Latitude'] || !row['Longitude']) {
        return;
    }

    const district = String(row['District ']).trim();
    const name = String(row['Name of OOAT Clinics'] || '').trim();
    const latitude = parseFloat(row['Latitude']);
    const longitude = parseFloat(row['Longitude']);
    const remarks = String(row['Remarks, if any'] || '').trim();

    // Determine status
    let status = 'Unknown';
    if (remarks.toLowerCase().includes('non') && remarks.toLowerCase().includes('functional')) {
        status = 'Non-Functional';
    } else if (remarks.toLowerCase().includes('functional')) {
        status = 'Functional';
    }

    const clinic = {
        sn: row['SN'] || index + 1,
        district: district,
        name: name,
        latitude: latitude,
        longitude: longitude,
        status: status
    };

    clinics.push(clinic);

    // Group by district
    if (!clinicsByDistrict[district]) {
        clinicsByDistrict[district] = [];
    }
    clinicsByDistrict[district].push(clinic);
});

// Create output object
const output = {
    clinics: clinics,
    clinicsByDistrict: clinicsByDistrict,
    metadata: {
        total: clinics.length,
        districts: Object.keys(clinicsByDistrict).length,
        functional: clinics.filter(c => c.status === 'Functional').length,
        nonFunctional: clinics.filter(c => c.status === 'Non-Functional').length,
        generatedAt: new Date().toISOString()
    }
};

// Write to JSON file
const outputPath = path.join(__dirname, 'data', 'clinics.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Converted ${clinics.length} clinics across ${Object.keys(clinicsByDistrict).length} districts`);
console.log(`Functional: ${output.metadata.functional}, Non-Functional: ${output.metadata.nonFunctional}`);
console.log(`Output written to: ${outputPath}`);
