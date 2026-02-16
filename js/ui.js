/**
 * UI components and interactions
 */

// Global state
let clinicsData = null;

/** Currently active designation filters (Set<string>).
 *  Empty set means "no filter – show all". */
let activeDesignations = new Set();

/**
 * Show distances (and counsellors) for the selected clinic in the sidebar.
 */
function showDistancesToDistrict(clinic) {
    const sidebar = document.getElementById('sidebar');
    const distances = calculateDistancesToDistrictClinics(clinic, clinicsData.clinics);

    // Update basic clinic info
    document.getElementById('selected-clinic-name').textContent = clinic.name;
    document.getElementById('clinic-district').textContent = clinic.district;

    const statusSpan = document.getElementById('clinic-status');
    statusSpan.textContent = clinic.status;
    statusSpan.className = `value status-badge ${clinic.status === 'Functional' ? 'functional' : 'non-functional'}`;

    document.getElementById('clinic-coords').textContent =
        `${clinic.latitude.toFixed(4)}, ${clinic.longitude.toFixed(4)}`;
    document.getElementById('distance-district').textContent = clinic.district;

    // ── Counsellors section ──────────────────────────────────────────────────
    const counsellorsSection = document.getElementById('counsellors-section');
    const counsellorsList    = document.getElementById('counsellors-list');
    const allCounsellors     = clinic.counsellors || [];

    // When a designation filter is active, only show matching counsellors
    const shown = activeDesignations.size > 0
        ? allCounsellors.filter(c => activeDesignations.has(c.designation))
        : allCounsellors;

    counsellorsList.innerHTML = '';

    if (shown.length === 0) {
        counsellorsList.innerHTML =
            `<p class="no-counsellors">${allCounsellors.length === 0
                ? 'No counsellors mapped to this clinic.'
                : 'No counsellors for the selected role filter.'}</p>`;
    } else {
        shown.forEach(c => {
            const color = getDesignationColor(c.designation);
            const card  = document.createElement('div');
            card.className = 'counsellor-card';
            card.style.setProperty('--card-color', color);
            card.innerHTML = `
                <div class="counsellor-dot"></div>
                <div class="counsellor-info">
                    <div class="counsellor-name">${c.name}</div>
                    <div class="counsellor-desig">${c.designation}</div>
                    ${c.contact ? `<div class="counsellor-contact">${c.contact}</div>` : ''}
                </div>`;
            counsellorsList.appendChild(card);
        });
    }

    counsellorsSection.style.display = 'block';

    // ── Distance list ────────────────────────────────────────────────────────
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
    const functional    = clinics.filter(c => c.status === 'Functional').length;
    const nonFunctional = clinics.length - functional;

    document.getElementById('total-clinics').textContent       = `${clinics.length} Clinics`;
    document.getElementById('functional-count').textContent     = `Functional: ${functional}`;
    document.getElementById('non-functional-count').textContent = `Non-Functional: ${nonFunctional}`;
}

/**
 * Populate the district filter dropdown
 */
function populateDistrictFilter(districts) {
    const select = document.getElementById('district-select');

    select.innerHTML = '<option value="all">All Districts</option>';

    Object.keys(districts).sort().forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = `${district} (${districts[district].length})`;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        filterByDistrict(e.target.value);
    });
}

/**
 * Build the designation filter chip bar.
 * designations: string[]
 */
function populateDesignationFilter(designations) {
    const container = document.getElementById('designation-chips');
    container.innerHTML = '';

    designations.forEach(desig => {
        const color = getDesignationColor(desig);
        const chip  = document.createElement('button');
        chip.className = 'desig-chip';
        chip.dataset.designation = desig;
        chip.style.background = color;
        chip.innerHTML = `<span class="chip-dot"></span>${desig}`;
        chip.title = `Filter by ${desig}`;

        chip.addEventListener('click', () => toggleDesignationFilter(desig, chip));
        container.appendChild(chip);
    });
}

/**
 * Toggle a designation chip on/off and update the map.
 */
function toggleDesignationFilter(designation, chipEl) {
    if (activeDesignations.has(designation)) {
        activeDesignations.delete(designation);
        chipEl.classList.remove('active');
    } else {
        activeDesignations.add(designation);
        chipEl.classList.add('active');
    }

    // Refresh marker colours + popups in place
    refreshMarkerColors(activeDesignations);

    // Update the legend
    updateLegend();

    // If sidebar is open, refresh the counsellors panel
    const sidebar = document.getElementById('sidebar');
    if (!sidebar.classList.contains('hidden') && selectedMarker) {
        showDistancesToDistrict(selectedMarker.clinicData);
    }
}

/**
 * Update the legend based on whether a designation filter is active.
 */
function updateLegend() {
    const statusItems = document.getElementById('legend-status-items');
    const desigItems  = document.getElementById('legend-designation-items');

    if (activeDesignations.size === 0) {
        statusItems.style.display = '';
        desigItems.style.display  = 'none';
        desigItems.innerHTML      = '';
    } else {
        statusItems.style.display = 'none';
        desigItems.style.display  = '';
        desigItems.innerHTML      = '';

        activeDesignations.forEach(desig => {
            const color = getDesignationColor(desig);
            const item  = document.createElement('div');
            item.className = 'legend-desig-item';
            item.innerHTML = `
                <span class="legend-desig-dot" style="background:${color};"></span>
                <span>${desig}</span>`;
            desigItems.appendChild(item);
        });

        // Always add the "no match" entry
        const noMatch = document.createElement('div');
        noMatch.className = 'legend-desig-item';
        noMatch.innerHTML = `
            <span class="legend-desig-dot" style="background:#d1d5db;"></span>
            <span style="color:#9ca3af;">No match</span>`;
        desigItems.appendChild(noMatch);
    }
}

/**
 * Filter clinics by district
 */
function filterByDistrict(district) {
    closeSidebar();

    const clinicsToShow = district === 'all'
        ? clinicsData.clinics
        : clinicsData.clinicsByDistrict[district] || [];

    addClinicsToMap(clinicsToShow, activeDesignations);
    updateStats(clinicsToShow);

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
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);

    map.on('click', function(e) {
        if (!e.originalEvent.target.closest('.leaflet-marker-icon, .leaflet-interactive')) {
            closeSidebar();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });
}
