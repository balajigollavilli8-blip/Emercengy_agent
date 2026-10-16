
import os
import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------
# Pydantic Schemas (Data Models)
# ---------------------------------------------------------

class ProblemItem(BaseModel):
    title: str
    slug: str

class CategoryModel(BaseModel):
    name: str
    slug: str
    icon: str
    description: str
    problems: List[ProblemItem]

class AddressModel(BaseModel):
    area: str
    city: str

class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude]")

class ProviderModel(BaseModel):
    id: str
    fullName: str
    businessName: Optional[str] = None
    phoneNumber: str
    whatsappNumber: Optional[str] = None
    categorySlug: str
    specialties: List[str]
    experienceYears: int = 1
    rating: float = 5.0
    reviewCount: int = 0
    isAvailable: bool = True
    verified: bool = True
    address: AddressModel
    location: GeoPoint
    distanceKm: Optional[float] = None

class ProviderRegisterRequest(BaseModel):
    fullName: str
    businessName: Optional[str] = ""
    phoneNumber: str
    categorySlug: str
    specialties: List[str]
    experienceYears: int = 2
    area: str
    city: str = "Hyderabad"
    lat: float
    lng: float

    @field_validator("phoneNumber")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-()]", "", v)
        if not re.match(r"^\+?[0-9]{10,13}$", cleaned):
            raise ValueError("Invalid phone number format. Provide a 10 to 13 digit number.")
        return v

# ---------------------------------------------------------
# Initial Seed Data (Categories, Sub-Problems & Technicians)
# ---------------------------------------------------------

CATEGORIES_DB: List[dict] = [
    {
        "name": "Plumbing",
        "slug": "plumbing",
        "icon": "🔧",
        "description": "Emergency pipe leaks, drainage blockages, and bathroom fittings",
        "problems": [
            {"title": "Burst / Leaking Pipe", "slug": "leaking-pipe"},
            {"title": "Clogged Drain / Sink", "slug": "clogged-drain"},
            {"title": "Water Heater / Geyser Repair", "slug": "water-heater-repair"},
            {"title": "Low Water Pressure / Motor", "slug": "low-water-pressure"},
        ],
    },
    {
        "name": "Electrical",
        "slug": "electrical",
        "icon": "⚡",
        "description": "Short circuits, MCB tripping, inverter wiring, and appliance points",
        "problems": [
            {"title": "Power Outage / Short Circuit", "slug": "power-outage"},
            {"title": "MCB / Fuse Tripping", "slug": "mcb-tripping"},
            {"title": "Inverter / UPS Wiring", "slug": "inverter-setup"},
            {"title": "Fan / Switchboard Repair", "slug": "switchboard-repair"},
        ],
    },
    {
        "name": "AC & Appliance",
        "slug": "ac-appliance",
        "icon": "❄️",
        "description": "AC cooling failure, refrigerant refill, and washing machine repair",
        "problems": [
            {"title": "AC Not Cooling", "slug": "ac-not-cooling"},
            {"title": "AC Gas Refill", "slug": "gas-refill"},
            {"title": "Washing Machine Breakdown", "slug": "washing-machine-repair"},
            {"title": "Refrigerator Not Cooling", "slug": "fridge-repair"},
        ],
    },
    {
        "name": "Carpentry & Locks",
        "slug": "carpentry",
        "icon": "🪚",
        "description": "Door lockouts, jammed hinges, and urgent furniture repair",
        "problems": [
            {"title": "Door Lock Jammed / Lockout", "slug": "lock-jammed"},
            {"title": "Broken Door / Window Hinge", "slug": "door-hinge-repair"},
            {"title": "Furniture / Bed Repair", "slug": "furniture-repair"},
        ],
    },
]

PROVIDERS_DB: List[dict] = [
    {
        "id": "pro-101",
        "fullName": "Ramesh Kumar",
        "businessName": "RapidFlow Plumbing Services",
        "phoneNumber": "+91 98765 43210",
        "whatsappNumber": "+919876543210",
        "categorySlug": "plumbing",
        "specialties": ["leaking-pipe", "clogged-drain", "low-water-pressure"],
        "experienceYears": 9,
        "rating": 4.8,
        "reviewCount": 124,
        "isAvailable": True,
        "verified": True,
        "address": {"area": "Banjara Hills", "city": "Hyderabad"},
        "location": {"type": "Point", "coordinates": [78.4482, 17.4126]},
    },
    {
        "id": "pro-102",
        "fullName": "Syed Irfan",
        "businessName": "Metro Pipe & Sanitary Works",
        "phoneNumber": "+91 91234 56789",
        "whatsappNumber": "+919123456789",
        "categorySlug": "plumbing",
        "specialties": ["water-heater-repair", "leaking-pipe"],
        "experienceYears": 6,
        "rating": 4.6,
        "reviewCount": 68,
        "isAvailable": True,
        "verified": True,
        "address": {"area": "Madhapur", "city": "Hyderabad"},
        "location": {"type": "Point", "coordinates": [78.3915, 17.4483]},
    },
    {
        "id": "pro-103",
        "fullName": "Vikram Goud",
        "businessName": "SparkSafe Electricals",
        "phoneNumber": "+91 99887 76655",
        "whatsappNumber": "+919988776655",
        "categorySlug": "electrical",
        "specialties": ["power-outage", "mcb-tripping", "inverter-setup", "switchboard-repair"],
        "experienceYears": 12,
        "rating": 4.9,
        "reviewCount": 210,
        "isAvailable": True,
        "verified": True,
        "address": {"area": "Secunderabad", "city": "Hyderabad"},
        "location": {"type": "Point", "coordinates": [78.4983, 17.4399]},
    },
    {
        "id": "pro-104",
        "fullName": "Anil Sharma",
        "businessName": "PowerGrid Home Solutions",
        "phoneNumber": "+91 97001 12233",
        "whatsappNumber": "+919700112233",
        "categorySlug": "electrical",
        "specialties": ["power-outage", "inverter-setup"],
        "experienceYears": 7,
        "rating": 4.7,
        "reviewCount": 94,
        "isAvailable": True,
        "verified": True,
        "address": {"area": "Kukatpally", "city": "Hyderabad"},
        "location": {"type": "Point", "coordinates": [78.4138, 17.4849]},
    },
    {
        "id": "pro-105",
        "fullName": "Mohammed Farooq",
        "businessName": "CoolBreeze HVAC & Appliances",
        "phoneNumber": "+91 94400 55667",
        "whatsappNumber": "+919440055667",
        "categorySlug": "ac-appliance",
        "specialties": ["ac-not-cooling", "gas-refill", "fridge-repair"],
        "experienceYears": 10,
        "rating": 4.8,
        "reviewCount": 156,
        "isAvailable": True,
        "verified": True,
        "address": {"area": "Ameerpet", "city": "Hyderabad"},
        "location": {"type": "Point", "coordinates": [78.4483, 17.4375]},
    },
    {
        "id": "pro-106",
        "fullName": "Srinivas Chary",
        "businessName": "QuickLock & Woodcraft",
        "phoneNumber": "+91 93911 22446",
        "whatsappNumber": "+919391122446",
        "categorySlug": "carpentry",
        "specialties": ["lock-jammed", "door-hinge-repair", "furniture-repair"],
        "experienceYears": 14,
        "rating": 4.9,
        "reviewCount": 182,
        "isAvailable": True,
        "verified": True,
        "address": {"area": "Himayatnagar", "city": "Hyderabad"},
        "location": {"type": "Point", "coordinates": [78.4815, 17.4021]},
    },
]