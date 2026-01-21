# Punjab OOAT Clinics Mapper 🏥

Interactive map visualization of Outpatient Opioid Assisted Treatment (OOAT) centers across Punjab, India.

## Features

✨ **Interactive District Map**: View all 22 Punjab districts with boundaries
📍 **507 OOAT Clinics**: Precise locations with status indicators
📏 **Distance Calculator**: Click any clinic to see distances to all other clinics in the same district
🎨 **Visual Status Indicators**: Color-coded markers (Green = Functional, Orange = Other status)
🔍 **District Filtering**: Filter clinics by specific districts
📱 **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Option 1: Use the Complete HTML File (Easiest)

1. Open `punjab-ooat-mapper-complete.html` in a text editor
2. Replace `YOUR_API_KEY` with your Google Maps API key (line at the bottom)
3. Save and open in a web browser or deploy to GitHub Pages/Netlify

### Option 2: Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload `punjab-ooat-mapper-complete.html` and rename it to `index.html`
3. Get a Google Maps API key:
   - Go to https://console.cloud.google.com/
   - Enable "Maps JavaScript API"
   - Create credentials (API key)
   - Restrict it to your domain for security
4. Edit `index.html` and replace `YOUR_API_KEY` with your actual key
5. Go to repository Settings → Pages → Deploy from main branch
6. Your map will be live at `https://yourusername.github.io/repo-name/`

### Option 3: Deploy to Netlify

1. Create account at https://netlify.com
2. Drag and drop `punjab-ooat-mapper-complete.html` (renamed to `index.html`)
3. Update Google Maps API key in the deployed file
4. Site goes live instantly with a custom URL

## Getting a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps JavaScript API**
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. **Important**: Restrict your API key:
   - Click on the created API key
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domain (e.g., `yourusername.github.io/*`)
   - Under "API restrictions", select "Restrict key" and choose "Maps JavaScript API"

## File Structure

```
punjab-ooat-mapper-complete.html  # Complete standalone HTML file with embedded data
ooat_clinics.json                  # Raw clinic data (for reference)
punjab_districts.geojson           # District boundaries (for reference)
```

## Data

- **Total Clinics**: 507 OOAT centers
- **Districts**: 22 Punjab districts
- **Data Source**: Geo-tagging of OOAT Clinics (Latitude and Longitude Coordinates)

### Top Districts by Clinic Count:
1. Ludhiana - 52 clinics
2. Amritsar - 40 clinics
3. Jalandhar - 35 clinics
4. Gurdaspur - 33 clinics
5. Hoshiarpur - 29 clinics

## How to Use

1. **View All Clinics**: Open the map to see all OOAT clinics across Punjab
2. **Filter by District**: Use the dropdown in the top-left to filter by specific districts
3. **Click a Clinic**: Click any clinic marker to see:
   - Clinic name and district
   - Distances to all other clinics in the same district
   - Sorted by proximity (nearest first)
4. **Navigate**: Click on a clinic in the distances list to jump to its location

## Customization

### Update Clinic Data

To update clinic data, modify the `EMBEDDED_CLINICS_DATA` array in the HTML file. Each clinic should have:

```javascript
{
  "id": 1,
  "name": "Clinic Name",
  "district": "District Name",
  "lat": 31.1234,
  "lng": 75.1234,
  "status": "Functional"
}
```

### Improve District Boundaries

The current boundaries are simplified rectangles. For production use, replace with accurate GeoJSON from:

- **DataMeet India**: https://projects.datameet.org/maps/
- **geoBoundaries**: https://www.geoboundaries.org/
- **OpenStreetMap**: Use Overpass API or downloaded extracts

Replace the `EMBEDDED_DISTRICTS_GEOJSON` in the HTML file.

### Customize Colors

Edit the color values in the CSS section:
- Primary gradient: `#667eea` and `#764ba2`
- Functional clinics: `#10b981` (green)
- Other status: `#f59e0b` (orange)
- Selected: `#ef4444` (red)

## Technical Details

### Technologies Used
- Google Maps JavaScript API
- Vanilla JavaScript (no frameworks required)
- CSS3 with responsive design
- Haversine formula for distance calculations

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design

### Performance
- Handles 500+ markers efficiently
- Lazy rendering with clustering possible for larger datasets
- Embedded data (no external API calls except Google Maps)

## Troubleshooting

**Map not loading?**
- Check that you've replaced `YOUR_API_KEY` with a valid Google Maps API key
- Ensure the API key has "Maps JavaScript API" enabled
- Check browser console for errors

**Markers not showing?**
- Verify clinic data has valid `lat` and `lng` values
- Check browser console for JavaScript errors

**District boundaries missing?**
- The included boundaries are simplified
- For production, use accurate GeoJSON data

## Future Enhancements

- [ ] Add search functionality for clinic names
- [ ] Export distance calculations to CSV
- [ ] Add routing/directions between clinics
- [ ] Implement marker clustering for better performance
- [ ] Add facility type filtering (beyond just district)
- [ ] Include facility contact information
- [ ] Add analytics dashboard

## License

This visualization tool is provided as-is for public health purposes. 

The clinic data is assumed to be from official government sources and used for public health awareness.

## Support

For questions or issues, please create an issue in the GitHub repository.

---

**Note on District Boundaries**: The current implementation uses simplified rectangular boundaries for demonstration. For production deployment, please replace with accurate administrative boundaries from official sources.

**Google Maps API Costs**: The Maps JavaScript API has a free tier of $200/month (which covers ~28,000 map loads). Monitor your usage in Google Cloud Console.
