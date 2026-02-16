/**
 * Map initialization and control utilities
 */

// Map configuration
const MAP_CONFIG = {
    center: [31.1471, 75.3412], // Punjab center
    zoom: 8,
    minZoom: 7,
    maxZoom: 18
};

// Base marker colors (used when no designation filter is active)
const MARKER_COLORS = {
    functional: '#22c55e',      // Green
    nonFunctional: '#ef4444',   // Red
    selected: '#f97316'         // Orange (selected – distinct from designation colours)
};

/**
 * Designation → colour mapping.
 * Must stay in sync with the CSS custom properties in styles.css.
 */
const DESIGNATION_COLORS = {
    'Counsellor':                   '#3b82f6',  // blue
    'Clinical Psychologist':        '#a855f7',  // purple
    'Psychologist':                 '#8b5cf6',  // violet
    'Psychiatric Social Worker':    '#f59e0b',  // amber
    'Social Worker':                '#14b8a6',  // teal
};
const DESIGNATION_COLOR_DEFAULT = '#6b7280';    // gray for any other

/**
 * Return the hex colour for a given designation string.
 */
function getDesignationColor(designation) {
    return DESIGNATION_COLORS[designation] || DESIGNATION_COLOR_DEFAULT;
}

/**
 * Given a clinic and the currently active designation filters (Set of strings,
 * or null/empty for "show all"), return the fill colour for its marker.
 *
 * Logic:
 *   • No filter active  → status-based colour (green / red)
 *   • Filter active     → colour of the first matched designation found on the
 *                         clinic's counsellors list; grey if none match
 */
function getMarkerColor(clinic, activeDesignations) {
    if (!activeDesignations || activeDesignations.size === 0) {
        return clinic.status === 'Functional'
            ? MARKER_COLORS.functional
            : MARKER_COLORS.nonFunctional;
    }

    const counsellors = clinic.counsellors || [];
    for (const c of counsellors) {
        if (activeDesignations.has(c.designation)) {
            return getDesignationColor(c.designation);
        }
    }
    // Clinic has no counsellor matching the filter → muted grey
    return '#d1d5db';
}

// District boundary style
const DISTRICT_STYLE = {
    color: '#6366f1',
    weight: 2,
    opacity: 0.7,
    fillColor: '#6366f1',
    fillOpacity: 0.08
};

const DISTRICT_HOVER_STYLE = {
    weight: 3,
    fillOpacity: 0.15
};

// Global map variables
let map;
let markersLayer;
let districtsLayer;
let distanceLinesLayer;
let selectedMarker = null;
let allMarkers = [];

/**
 * Initialize the Leaflet map
 */
function initMap() {
    map = L.map('map', {
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom
    });

    // Add CartoDB Positron tiles (clean look for data viz)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Initialize layer groups
    districtsLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    distanceLinesLayer = L.layerGroup().addTo(map);
}

/**
 * Load district boundaries from GeoJSON
 */
function loadDistrictBoundaries(geojsonData) {
    L.geoJSON(geojsonData, {
        style: DISTRICT_STYLE,
        onEachFeature: function(feature, layer) {
            const districtName = feature.properties.dtname || feature.properties.name || 'Unknown';

            layer.bindTooltip(districtName, {
                permanent: false,
                direction: 'center',
                className: 'district-label'
            });

            layer.on('mouseover', function() {
                this.setStyle(DISTRICT_HOVER_STYLE);
            });

            layer.on('mouseout', function() {
                this.setStyle(DISTRICT_STYLE);
            });
        }
    }).addTo(districtsLayer);
}

/**
 * Build the popup HTML for a clinic, including counsellors list.
 * When a designation filter is active only those counsellors are shown;
 * otherwise all counsellors are shown.
 */
function buildPopupHtml(clinic, activeDesignations) {
    const statusClass = clinic.status === 'Functional' ? 'functional' : 'non-functional';
    const counsellors = clinic.counsellors || [];

    // Decide which counsellors to show in the popup
    const shown = (activeDesignations && activeDesignations.size > 0)
        ? counsellors.filter(c => activeDesignations.has(c.designation))
        : counsellors;

    let counsellorHtml = '';
    if (shown.length > 0) {
        const rows = shown.map(c => {
            const col = getDesignationColor(c.designation);
            return `<div class="popup-counsellor" style="border-left:3px solid ${col};padding-left:5px;margin:3px 0;">
                        <span style="font-weight:600;font-size:0.82rem;">${c.name}</span><br>
                        <span style="font-size:0.75rem;color:#64748b;">${c.designation}</span>
                        ${c.contact ? `<br><span style="font-size:0.72rem;color:#94a3b8;">${c.contact}</span>` : ''}
                    </div>`;
        }).join('');
        counsellorHtml = `<div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:6px;">
                            <div style="font-size:0.78rem;font-weight:600;color:#334155;margin-bottom:4px;">
                                Counsellors / POCs
                            </div>
                            ${rows}
                          </div>`;
    }

    return `<div class="clinic-popup">
                <strong>${clinic.name}</strong><br>
                <span class="popup-district">${clinic.district}</span><br>
                <span class="popup-status ${statusClass}">${clinic.status}</span>
                ${counsellorHtml}
            </div>`;
}

/**
 * Create a clinic marker
 */
function createClinicMarker(clinic, activeDesignations) {
    const color = getMarkerColor(clinic, activeDesignations);

    const marker = L.circleMarker([clinic.latitude, clinic.longitude], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
    });

    marker.clinicData = clinic;
    marker.originalColor = color;

    marker.bindPopup(buildPopupHtml(clinic, activeDesignations), { maxWidth: 300 });

    marker.on('click', function() {
        handleMarkerClick(marker, clinic);
    });

    return marker;
}

/**
 * Add clinics to the map.
 * activeDesignations: Set<string> | null
 */
function addClinicsToMap(clinics, activeDesignations) {
    markersLayer.clearLayers();
    allMarkers = [];

    clinics.forEach(clinic => {
        const marker = createClinicMarker(clinic, activeDesignations);
        marker.addTo(markersLayer);
        allMarkers.push(marker);
    });
}

/**
 * Handle marker click - show distances
 */
function handleMarkerClick(marker, clinic) {
    // Reset previous selection
    if (selectedMarker) {
        resetMarkerStyle(selectedMarker);
    }

    // Clear previous distance lines
    distanceLinesLayer.clearLayers();

    // Highlight selected marker
    marker.setStyle({
        fillColor: MARKER_COLORS.selected,
        radius: 12
    });
    selectedMarker = marker;

    // Show distances + counsellors in sidebar
    showDistancesToDistrict(clinic);

    // Draw distance lines
    drawDistanceLines(clinic);
}

/**
 * Reset marker to original style
 */
function resetMarkerStyle(marker) {
    marker.setStyle({
        fillColor: marker.originalColor,
        radius: 8
    });
}

/**
 * Draw distance lines from selected clinic to others in district
 */
function drawDistanceLines(clinic) {
    if (!clinicsData) return;

    const distances = calculateDistancesToDistrictClinics(clinic, clinicsData.clinics);

    distances.forEach((item, index) => {
        const opacity = Math.max(0.15, 0.6 - (index * 0.03));

        const line = L.polyline([
            [clinic.latitude, clinic.longitude],
            [item.clinic.latitude, item.clinic.longitude]
        ], {
            color: '#3b82f6',
            weight: 2,
            opacity: opacity,
            dashArray: '5, 8'
        });

        line.bindTooltip(formatDistance(item.distance), {
            permanent: false,
            direction: 'center'
        });

        line.addTo(distanceLinesLayer);
    });
}

/**
 * Clear selection and distance display
 */
function clearSelection() {
    if (selectedMarker) {
        resetMarkerStyle(selectedMarker);
        selectedMarker = null;
    }
    distanceLinesLayer.clearLayers();
}

/**
 * Zoom to a specific clinic
 */
function zoomToClinic(clinic) {
    map.setView([clinic.latitude, clinic.longitude], 14);
}

/**
 * Fit map to show filtered clinics
 */
function fitMapToClinics(clinics) {
    if (clinics.length === 0) return;

    const bounds = clinics.map(c => [c.latitude, c.longitude]);
    map.fitBounds(bounds, { padding: [50, 50] });
}

/**
 * Refresh all marker colours after a designation filter change,
 * without clearing / re-adding markers (preserves popup state).
 */
function refreshMarkerColors(activeDesignations) {
    allMarkers.forEach(marker => {
        const color = getMarkerColor(marker.clinicData, activeDesignations);
        marker.originalColor = color;
        // Don't clobber the selected marker's style
        if (marker !== selectedMarker) {
            marker.setStyle({ fillColor: color });
        }
        // Rebuild popup with updated counsellor subset
        marker.setPopupContent(buildPopupHtml(marker.clinicData, activeDesignations));
    });
}
