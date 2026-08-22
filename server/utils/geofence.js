/**
 * Geofencing & Haversine Distance Utility (Prompt 6.2)
 */

const OFFICE_LATITUDE = 12.9716;
const OFFICE_LONGITUDE = 77.5946;
const GEOFENCE_RADIUS_METERS = 100.0;

/**
 * Calculates the great-circle distance between two geographic points using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 in decimal degrees
 * @param {number} lon1 Longitude of point 1 in decimal degrees
 * @param {number} lat2 Latitude of point 2 in decimal degrees (default: office lat)
 * @param {number} lon2 Longitude of point 2 in decimal degrees (default: office lon)
 * @returns {number} Distance in meters
 */
function calculateHaversineDistance(lat1, lon1, lat2 = OFFICE_LATITUDE, lon2 = OFFICE_LONGITUDE) {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks if the given coordinates fall within the office geofence radius.
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @param {number} radius Radius threshold in meters (default: 100m)
 * @returns {{ is_within_geofence: boolean, distance_meters: number }}
 */
function isWithinOfficeGeofence(lat, lon, radius = GEOFENCE_RADIUS_METERS) {
  const distance = calculateHaversineDistance(lat, lon);
  return {
    is_within_geofence: distance <= radius,
    distance_meters: Math.round(distance * 100) / 100
  };
}

module.exports = {
  calculateHaversineDistance,
  isWithinOfficeGeofence,
  OFFICE_LATITUDE,
  OFFICE_LONGITUDE,
  GEOFENCE_RADIUS_METERS
};
