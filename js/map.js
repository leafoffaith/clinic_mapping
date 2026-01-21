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

// Marker colors
const MARKER_COLORS = {
    functional: '#22c55e',      // Green
    nonFunctional: '#ef4444',   // Red
    selected: '#3b82f6'         // Blue
};

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
 * Create a clinic marker
 */
function createClinicMarker(clinic) {
    const color = clinic.status === 'Functional'
        ? MARKER_COLORS.functional
        : MARKER_COLORS.nonFunctional;

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

    marker.bindPopup(`
        <div class="clinic-popup">
            <strong>${clinic.name}</strong><br>
            <span class="popup-district">${clinic.district}</span><br>
            <span class="popup-status ${clinic.status === 'Functional' ? 'functional' : 'non-functional'}">
                ${clinic.status}
            </span>
        </div>
    `);

    marker.on('click', function() {
        handleMarkerClick(marker, clinic);
    });

    return marker;
}

/**
 * Add clinics to the map
 */
function addClinicsToMap(clinics) {
    markersLayer.clearLayers();
    allMarkers = [];

    clinics.forEach(clinic => {
        const marker = createClinicMarker(clinic);
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

    // Show distances in sidebar
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
