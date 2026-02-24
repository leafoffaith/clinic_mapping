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
            fetch('data/punjabDistricts.geojson')
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

        // Build UI controls before rendering markers
        populateDistrictFilter(clinicsData.clinicsByDistrict);

        const facilityTypes = [...new Set(clinicsData.clinics.map(c => c.facilityType).filter(Boolean))].sort();
        populateFacilityTypeFilter(facilityTypes);

        // Apply ?view= param from landing page before first render
        const viewParam = new URLSearchParams(window.location.search).get('view');
        const titleEl = document.getElementById('nav-page-title');
        if (viewParam === 'ooat') {
            activeFacilityTypes.add('OOAT');
            if (titleEl) titleEl.textContent = 'OOAT Clinics';
        } else if (viewParam === 'ddrc') {
            activeFacilityTypes.add('Deaddiction');
            activeFacilityTypes.add('Rehabilitation');
            if (titleEl) titleEl.textContent = 'DDRC Centres';
        }
        if (activeFacilityTypes.size > 0) {
            document.querySelectorAll('[data-facility-type]').forEach(chip => {
                if (activeFacilityTypes.has(chip.dataset.facilityType)) chip.classList.add('active');
            });
        }

        // Render markers respecting the pre-filter
        const initialClinics = getFilteredClinics();
        addClinicsToMap(initialClinics, activeDesignations);
        updateStats(initialClinics);

        // Designation chips (Counsellor roles — OOAT only)
        const designations = (clinicsData.metadata && clinicsData.metadata.designations)
            ? clinicsData.metadata.designations
            : [...new Set(clinicsData.clinics.flatMap(c => (c.counsellors || []).map(x => x.designation)))].sort();
        populateDesignationFilter(designations);

        // Set up event listeners
        setupEventListeners();

        const counsellorCount = clinicsData.clinics.reduce((n, c) => n + (c.counsellors || []).length, 0);
        console.log(`Loaded ${clinicsData.clinics.length} clinics across ${Object.keys(clinicsData.clinicsByDistrict).length} districts`);
        console.log(`Mapped ${counsellorCount} counsellors | Designations: ${designations.join(', ')}`);

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
