/**
 * Distance calculation utilities using the Haversine formula
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate the great-circle distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}

/**
 * Calculate distances from one clinic to all other clinics in the same district
 * @param {Object} sourceClinic - The selected clinic
 * @param {Array} allClinics - All clinics data
 * @returns {Array} Array of {clinic, distance} objects, sorted by distance
 */
function calculateDistancesToDistrictClinics(sourceClinic, allClinics) {
    const districtClinics = allClinics.filter(
        c => c.district === sourceClinic.district && c.sn !== sourceClinic.sn
    );

    const distances = districtClinics.map(clinic => ({
        clinic: clinic,
        distance: haversineDistance(
            sourceClinic.latitude,
            sourceClinic.longitude,
            clinic.latitude,
            clinic.longitude
        )
    }));

    distances.sort((a, b) => a.distance - b.distance);

    return distances;
}

/**
 * Format distance for display
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string
 */
function formatDistance(km) {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(2)} km`;
}
