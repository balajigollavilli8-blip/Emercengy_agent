
import uvicorn
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from model import ProviderRegisterRequest
from tools import (
    get_categories,
    search_nearby_providers,
    toggle_availability,
    register_new_provider,
)

app = FastAPI(
    title="LocalFix - On-Demand Local Service Provider API",
    description="Problem-first hyperlocal service discovery with direct expert contact",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# REST API Endpoints
# ---------------------------------------------------------

@app.get("/api/categories")
def api_get_categories():
    return get_categories()


@app.get("/api/providers/nearby")
def api_get_nearby_providers(
    lat: float = Query(17.3850, description="User latitude"),
    lng: float = Query(78.4867, description="User longitude"),
    categorySlug: Optional[str] = Query(None),
    problem: Optional[str] = Query(None),
    radiusKm: float = Query(15.0, ge=1.0, le=100.0),
    search: str = Query(""),
    onlyAvailable: bool = Query(True),
):
    providers = search_nearby_providers(
        lat=lat,
        lng=lng,
        category_slug=categorySlug,
        problem_slug=problem,
        radius_km=radiusKm,
        search_query=search,
        only_available=onlyAvailable,
    )
    return {"count": len(providers), "data": providers}


@app.post("/api/providers/{provider_id}/toggle-availability")
def api_toggle_provider(provider_id: str):
    updated = toggle_availability(provider_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Provider not found")
    return updated


@app.post("/api/providers/register")
def api_register_provider(payload: ProviderRegisterRequest):
    new_pro = register_new_provider(payload)
    return {"message": "Provider registered successfully", "provider": new_pro}


# ---------------------------------------------------------
# Frontend Web Application UI (Served at "/")
# ---------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def serve_frontend():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LocalFix — Direct Local Service Providers</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <!-- Header -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-20">
    <div class="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-2xl font-extrabold text-indigo-600 tracking-tight">LocalFix</span>
          <span class="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full">Direct Connect</span>
        </div>
        <p class="text-xs text-slate-500">Zero middlemen. Find nearby available technicians & call directly.</p>
      </div>
      <div class="flex items-center gap-3">
        <div id="locBadge" class="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">
          📍 Detecting GPS...
        </div>
        <button onclick="useDefaultCity()" class="text-xs text-indigo-600 hover:underline font-medium">
          Reset Location
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-7">
    <!-- Step 1: Categories -->
    <section class="mb-7">
      <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        1. Select a Service Category
      </h2>
      <div id="categoryGrid" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>
    </section>

    <!-- Step 2: Specific Problem & Search Filters -->
    <section class="mb-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h2 id="problemHeader" class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        2. Select Your Specific Service Problem
      </h2>
      <div id="problemPills" class="flex flex-wrap gap-2 mb-5"></div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-slate-500 mb-1">
            Search by Technician Name, Shop, or Area
          </label>
          <input
            id="searchInput"
            type="text"
            placeholder="e.g., Ramesh, Banjara Hills, SparkSafe..."
            oninput="loadProviders()"
            class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-xs font-semibold text-slate-500">
              Radius: <span id="radiusValue" class="text-indigo-600 font-bold">15 km</span>
            </label>
            <label class="text-xs text-slate-600 flex items-center gap-1 cursor-pointer">
              <input id="onlyAvailableToggle" type="checkbox" checked onchange="loadProviders()" class="accent-indigo-600" />
              Available Only
            </label>
          </div>
          <input
            id="radiusSlider"
            type="range"
            min="2"
            max="50"
            value="15"
            oninput="document.getElementById('radiusValue').innerText = this.value + ' km'; loadProviders();"
            class="w-full accent-indigo-600 mt-1"
          />
        </div>
      </div>
    </section>

    <!-- Step 3: Results Directory -->
    <section>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-bold text-slate-800">
          Nearby Professionals (<span id="proCount">0</span>)
        </h2>
        <span class="text-xs text-slate-500">Sorted by closest distance & rating</span>
      </div>
      <div id="providersGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </section>
  </main>

  <script>
    let categories = [];
    let selectedCategory = null;
    let selectedProblem = "";
    let userCoords = { lat: 17.3850, lng: 78.4867 };

    function useDefaultCity() {
      userCoords = { lat: 17.3850, lng: 78.4867 };
      document.getElementById("locBadge").innerText = `📍 Hyderabad Center (${userCoords.lat.toFixed(3)}, ${userCoords.lng.toFixed(3)})`;
      loadProviders();
    }

    function initLocation() {
      if (!navigator.geolocation) {
        useDefaultCity();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          document.getElementById("locBadge").innerText = `📍 GPS (${userCoords.lat.toFixed(3)}, ${userCoords.lng.toFixed(3)})`;
          loadProviders();
        },
        () => useDefaultCity(),
        { timeout: 5000 }
      );
    }

    async function loadCategories() {
      const res = await fetch("/api/categories");
      categories = await res.json();
      if (categories.length > 0) {
        selectedCategory = categories[0];
      }
      renderCategories();
      renderProblems();
      loadProviders();
    }

    function renderCategories() {
      const grid = document.getElementById("categoryGrid");
      grid.innerHTML = categories.map(cat => {
        const active = selectedCategory && selectedCategory.slug === cat.slug;
        return `
          <button
            onclick="selectCategory('${cat.slug}')"
            class="p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              active
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300'
            }"
          >
            <span class="text-2xl mb-1">${cat.icon}</span>
            <div>
              <div class="font-bold text-sm">${cat.name}</div>
              <div class="text-[11px] ${active ? 'text-indigo-100' : 'text-slate-400'} line-clamp-1">${cat.description}</div>
            </div>
          </button>
        `;
      }).join("");
    }

    function selectCategory(slug) {
      selectedCategory = categories.find(c => c.slug === slug);
      selectedProblem = "";
      renderCategories();
      renderProblems();
      loadProviders();
    }

    function renderProblems() {
      if (!selectedCategory) return;
      document.getElementById("problemHeader").innerText =
        `2. What problem do you need help with in ${selectedCategory.name}?`;

      const container = document.getElementById("problemPills");
      const allBtn = `
        <button
          onclick="selectProblem('')"
          class="px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
            selectedProblem === ''
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }"
        >
          All ${selectedCategory.name} Issues
        </button>
      `;

      const probBtns = selectedCategory.problems.map(p => `
        <button
          onclick="selectProblem('${p.slug}')"
          class="px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
            selectedProblem === p.slug
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }"
        >
          ${p.title}
        </button>
      `).join("");

      container.innerHTML = allBtn + probBtns;
    }

    function selectProblem(probSlug) {
      selectedProblem = probSlug;
      renderProblems();
      loadProviders();
    }

    async function toggleProStatus(proId) {
      await fetch(`/api/providers/${proId}/toggle-availability`, { method: "POST" });
      loadProviders();
    }

    function copyNumber(num, btnId) {
      navigator.clipboard.writeText(num);
      const btn = document.getElementById(btnId);
      btn.innerText = "Copied!";
      setTimeout(() => { btn.innerText = "Copy"; }, 1800);
    }

    async function loadProviders() {
      if (!selectedCategory) return;
      const radiusKm = document.getElementById("radiusSlider").value;
      const search = document.getElementById("searchInput").value;
      const onlyAvailable = document.getElementById("onlyAvailableToggle").checked;

      const params = new URLSearchParams({
        lat: userCoords.lat,
        lng: userCoords.lng,
        categorySlug: selectedCategory.slug,
        problem: selectedProblem,
        radiusKm: radiusKm,
        search: search,
        onlyAvailable: onlyAvailable
      });

      const res = await fetch(`/api/providers/nearby?${params}`);
      const result = await res.json();
      const pros = result.data || [];
      document.getElementById("proCount").innerText = pros.length;

      const grid = document.getElementById("providersGrid");
      if (pros.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full bg-white rounded-xl border border-slate-200 p-10 text-center">
            <p class="text-slate-700 font-semibold">No technicians found within ${radiusKm} km.</p>
            <p class="text-xs text-slate-400 mt-1">Try increasing the radius slider or clicking "Reset Location" in the top bar.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = pros.map(p => `
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start gap-2">
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-lg font-bold text-slate-900">${p.fullName}</h3>
                  <button
                    onclick="toggleProStatus('${p.id}')"
                    title="Click to simulate technician toggling availability"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                      p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                    }"
                  >
                    ● ${p.isAvailable ? 'Available Now' : 'Busy / Offline'}
                  </button>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">${p.businessName || ''}</p>
              </div>
              <span class="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md shrink-0">
                ${p.distanceKm} km away
              </span>
            </div>

            <div class="flex items-center gap-3 mt-3 text-xs text-slate-600">
              <span class="font-bold text-amber-600">★ ${p.rating.toFixed(1)} (${p.reviewCount})</span>
              <span>•</span>
              <span>${p.experienceYears} yrs exp</span>
              <span>•</span>
              <span>📍 ${p.address.area}, ${p.address.city}</span>
            </div>

            <div class="flex flex-wrap gap-1.5 mt-3">
              ${p.specialties.map(s => `
                <span class="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded capitalize font-medium">
                  ${s.replace(/-/g, ' ')}
                </span>
              `).join("")}
            </div>
          </div>

          <div class="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <div>
                <span class="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Direct Contact Number</span>
                <span class="font-mono text-sm font-bold text-slate-900">${p.phoneNumber}</span>
              </div>
              <button
                id="copy-${p.id}"
                onclick="copyNumber('${p.phoneNumber}', 'copy-${p.id}')"
                class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold ml-3 px-2 py-1 rounded hover:bg-indigo-50"
              >
                Copy
              </button>
            </div>

            <a
              href="tel:${p.phoneNumber}"
              class="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition shadow-sm"
            >
              📞 Call Expert
            </a>
          </div>
        </div>
      `).join("");
    }

    initLocation();
    loadCategories();
  </script>
</body>
</html>
    """


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)