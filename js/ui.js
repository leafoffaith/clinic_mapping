/**
 * UI components and interactions
 */

// Global state
let clinicsData = null;

/**
 * Show distances to other clinics in the same district
 */
function showDistancesToDistrict(clinic) {
    const sidebar = document.getElementById('sidebar');
    const distances = calculateDistancesToDistrictClinics(clinic, clinicsData.clinics);

    // Update sidebar content
    document.getElementById('selected-clinic-name').textContent = clinic.name;
    document.getElementById('clinic-district').textContent = clinic.district;

    const statusSpan = document.getElementById('clinic-status');
    statusSpan.textContent = clinic.status;
    statusSpan.className = `value status-badge ${clinic.status === 'Functional' ? 'functional' : 'non-functional'}`;

    document.getElementById('clinic-coords').textContent =
        `${clinic.latitude.toFixed(4)}, ${clinic.longitude.toFixed(4)}`;
    document.getElementById('distance-district').textContent = clinic.district;

    // Build distance list
    const distanceList = document.getElementById('distance-list');
    distanceList.innerHTML = '';

    if (distances.length === 0) {
        distanceList.innerHTML = '<p class="no-clinics">No other clinics in this district.</p>';
    } else {
        distances.forEach((item, index) => {
            const statusClass = item.clinic.status === 'Functional' ? 'functional' : 'non-functional';

            const distanceItem = document.createElement('div');
            distanceItem.className = 'distance-item';
            distanceItem.innerHTML = `
                <div class="distance-rank">${index + 1}</div>
                <div class="distance-details">
                    <span class="clinic-name">${item.clinic.name}</span>
                    <span class="status-badge ${statusClass}">${item.clinic.status}</span>
                </div>
                <div class="distance-value">${formatDistance(item.distance)}</div>
            `;

            distanceItem.addEventListener('click', () => {
                zoomToClinic(item.clinic);
            });

            distanceList.appendChild(distanceItem);
        });
    }

    // Show sidebar
    sidebar.classList.remove('hidden');
}

/**
 * Close the sidebar
 */
function closeSidebar() {
    document.getElementById('sidebar').classList.add('hidden');
    clearSelection();
}

/**
 * Update statistics display
 */
function updateStats(clinics) {
    const functional = clinics.filter(c => c.status === 'Functional').length;
    const nonFunctional = clinics.length - functional;

    document.getElementById('total-clinics').textContent = `${clinics.length} Clinics`;
    document.getElementById('functional-count').textContent = `Functional: ${functional}`;
    document.getElementById('non-functional-count').textContent = `Non-Functional: ${nonFunctional}`;
}

/**
 * Populate the district filter dropdown
 */
function populateDistrictFilter(districts) {
    const select = document.getElementById('district-select');

    // Clear existing options except "All Districts"
    select.innerHTML = '<option value="all">All Districts</option>';

    // Sort districts by name
    const sortedDistricts = Object.keys(districts).sort();

    sortedDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = `${district} (${districts[district].length})`;
        select.appendChild(option);
    });

    // Add change listener
    select.addEventListener('change', (e) => {
        filterByDistrict(e.target.value);
    });
}

/**
 * Filter clinics by district
 */
function filterByDistrict(district) {
    // Close sidebar when filtering
    closeSidebar();

    const clinicsToShow = district === 'all'
        ? clinicsData.clinics
        : clinicsData.clinicsByDistrict[district] || [];

    addClinicsToMap(clinicsToShow);
    updateStats(clinicsToShow);

    // Zoom to show filtered clinics
    if (district !== 'all' && clinicsToShow.length > 0) {
        fitMapToClinics(clinicsToShow);
    } else {
        map.setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Close sidebar button
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);

    // Close sidebar when clicking on map (but not on markers)
    map.on('click', function(e) {
        // Only close if clicking directly on map, not bubbled from marker
        if (!e.originalEvent.target.closest('.leaflet-marker-icon, .leaflet-interactive')) {
            closeSidebar();
        }
    });

    // Keyboard escape to close sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });
}
