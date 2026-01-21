/**
 * Main application entry point
 */

/**
 * Initialize the application
 */
async function init() {
    try {
        // Initialize map
        initMap();

        // Load data files
        const [clinicsResponse, districtsResponse] = await Promise.all([
            fetch('data/clinics.json'),
            fetch('data/punjab_districts.geojson')
        ]);

        if (!clinicsResponse.ok) {
            throw new Error('Failed to load clinic data');
        }
        if (!districtsResponse.ok) {
            throw new Error('Failed to load district boundaries');
        }

        clinicsData = await clinicsResponse.json();
        const districtsGeoJSON = await districtsResponse.json();

        // Load district boundaries first (so they appear behind markers)
        loadDistrictBoundaries(districtsGeoJSON);

        // Add clinic markers
        addClinicsToMap(clinicsData.clinics);

        // Update UI
        updateStats(clinicsData.clinics);
        populateDistrictFilter(clinicsData.clinicsByDistrict);

        // Set up event listeners
        setupEventListeners();

        console.log(`Loaded ${clinicsData.clinics.length} clinics across ${Object.keys(clinicsData.clinicsByDistrict).length} districts`);

    } catch (error) {
        console.error('Error initializing application:', error);
        showError('Failed to load clinic data. Please refresh the page and try again.');
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    const mapContainer = document.getElementById('map');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()">Retry</button>
        </div>
    `;
    mapContainer.appendChild(errorDiv);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
