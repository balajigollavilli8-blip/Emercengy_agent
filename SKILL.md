
---
name: localfix-hyperlocal-service-locator
description: Problem-first geospatial discovery and direct-contact service provider platform for urgent household repairs.
---

# LocalFix Skill & System Specification

## 1. Purpose
Connect users experiencing urgent household breakdowns (plumbing leaks, electrical short circuits, HVAC failures, lockouts) directly with nearby, currently available technicians without middleman booking delays or platform commissions.

## 2. Core Operational Rules
1. **Problem-First Categorization**: Always map a user's issue to a primary `categorySlug` (`plumbing`, `electrical`, `ac-appliance`, `carpentry`) and a specific `problemSlug` (e.g., `leaking-pipe`, `power-outage`, `ac-not-cooling`, `lock-jammed`).
2. **Geospatial Proximity Filtering**: Use `search_nearby_providers` in `tools.py` to compute spherical distance in kilometers from the user's `(lat, lng)` coordinates within `radius_km` (default `15 km`, range `2 km` to `50 km`).
3. **Zero-Middleman Direct Contact**: Always display the technician's:
   - Full Name & Business Name
   - Distance in km (`distanceKm`)
   - Experience & Rating
   - Direct Phone Number (`phoneNumber`) with an instant `tel:` action link.