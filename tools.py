
import math
import uuid
from typing import List, Optional
from model import CATEGORIES_DB, PROVIDERS_DB, ProviderRegisterRequest

def calculate_spherical_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculates accurate spherical earth distance in kilometers between two GPS coordinates.
    Matches MongoDB $geoNear spherical calculation.
    """
    earth_radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(earth_radius_km * c, 1)


def get_categories() -> List[dict]:
    """Returns all service categories and nested problem lists."""
    return CATEGORIES_DB


def search_nearby_providers(
    lat: float,
    lng: float,
    category_slug: Optional[str] = None,
    problem_slug: Optional[str] = None,
    radius_km: float = 15.0,
    search_query: str = "",
    only_available: bool = True,
) -> List[dict]:
    """
    Filters providers by category, exact problem specialty, availability, keyword,
    and spherical distance within radius_km. Sorted by proximity first, then rating.
    """
    results = []
    q = search_query.strip().lower()

    for pro in PROVIDERS_DB:
        # 1. Availability Filter
        if only_available and not pro.get("isAvailable", True):
            continue

        # 2. Category Filter
        if category_slug and pro["categorySlug"] != category_slug:
            continue

        # 3. Granular Problem Specialty Filter
        if problem_slug and problem_slug not in pro.get("specialties", []):
            continue

        # 4. Keyword Search Filter (Name, Business, or Neighborhood Area)
        if q:
            searchable_text = " ".join([
                pro.get("fullName", ""),
                pro.get("businessName", ""),
                pro.get("address", {}).get("area", ""),
                pro.get("address", {}).get("city", ""),
            ]).lower()
            if q not in searchable_text:
                continue

        # 5. Geospatial Distance Calculation
        pro_lng, pro_lat = pro["location"]["coordinates"]
        dist_km = calculate_spherical_distance_km(lat, lng, pro_lat, pro_lng)

        if dist_km <= radius_km:
            pro_with_distance = dict(pro)
            pro_with_distance["distanceKm"] = dist_km
            results.append(pro_with_distance)

    # Sort by closest distance first, then highest rating
    results.sort(key=lambda x: (x["distanceKm"], -x["rating"]))
    return results


def toggle_availability(provider_id: str) -> Optional[dict]:
    """Toggles a provider's real-time availability status."""
    for pro in PROVIDERS_DB:
        if pro["id"] == provider_id:
            pro["isAvailable"] = not pro["isAvailable"]
            return pro
    return None


def register_new_provider(payload: ProviderRegisterRequest) -> dict:
    """Adds a new verified local technician with GeoJSON coordinates."""
    new_pro = {
        "id": f"pro-{uuid.uuid4().hex[:6]}",
        "fullName": payload.fullName.strip(),
        "businessName": payload.businessName.strip() if payload.businessName else f"{payload.fullName}'s Services",
        "phoneNumber": payload.phoneNumber.strip(),
        "whatsappNumber": payload.phoneNumber.replace(" ", ""),
        "categorySlug": payload.categorySlug,
        "specialties": payload.specialties,
        "experienceYears": payload.experienceYears,
        "rating": 5.0,
        "reviewCount": 1,
        "isAvailable": True,
        "verified": True,
        "address": {"area": payload.area.strip(), "city": payload.city.strip()},
        "location": {"type": "Point", "coordinates": [payload.lng, payload.lat]},
    }
    PROVIDERS_DB.append(new_pro)
    return new_pro