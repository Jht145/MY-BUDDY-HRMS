import os
import math
from dotenv import load_dotenv

load_dotenv()

# Office Geofence Defaults (Configurable via .env)
OFFICE_LAT = float(os.getenv("GEOFENCE_LATITUDE", "12.9716"))
OFFICE_LON = float(os.getenv("GEOFENCE_LONGITUDE", "77.5946"))
GEOFENCE_RADIUS_METERS = float(os.getenv("GEOFENCE_RADIUS_METERS", "100.0"))

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float = OFFICE_LAT, lon2: float = OFFICE_LON) -> float:
    """
    Calculate the great-circle distance between two points on the Earth's surface (in meters)
    using the Haversine formula.
    """
    R = 6371000.0  # Earth's radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = R * c
    return round(distance, 2)

def evaluate_geofence(latitude: float, longitude: float, radius_meters: float = GEOFENCE_RADIUS_METERS) -> tuple[float, bool]:
    """
    Evaluate if given coordinates are within the authorized office geofence radius.
    Returns: (distance_in_meters, is_within_geofence)
    """
    distance = calculate_haversine_distance(latitude, longitude)
    is_within = distance <= radius_meters
    return distance, is_within
