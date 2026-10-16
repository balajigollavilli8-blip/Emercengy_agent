import { useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowRight, BadgeCheck, Bolt, Check, ChevronDown, CircleAlert,
  Clock3, Hammer, LocateFixed, MapPin, Menu, Phone, Plus, Search, ShieldCheck,
  SlidersHorizontal, Star, Thermometer, Wrench, X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;
const DEFAULT_LOCATION = { lat: 17.385, lng: 78.4867, label: "Hyderabad, India" };
const CATEGORIES = [
  { slug: "plumbing", name: "Plumbing", icon: Wrench, note: "Leaks, drains, pipes", tint: "sage" },
  { slug: "electrical", name: "Electrical", icon: Bolt, note: "Power, wiring, switches", tint: "yellow" },
  { slug: "hvac", name: "Heating & cooling", icon: Thermometer, note: "AC, cooling, appliances", tint: "blue" },
  { slug: "carpentry", name: "Carpentry", icon: Hammer, note: "Locks, doors, furniture", tint: "rose" },
];
const PROBLEMS = {
  plumbing: [["leaking-pipe", "Leaking pipe"], ["clogged-drain", "Blocked drain"], ["water-heater", "Water heater"], ["low-water-pressure", "Low water pressure"]],
  electrical: [["power-outage", "Power outage"], ["mcb-tripping", "Breaker tripping"], ["switchboard-repair", "Switchboard"], ["inverter-setup", "Inverter / UPS"]],
  hvac: [["ac-not-cooling", "AC not cooling"], ["gas-refill", "AC gas refill"], ["fridge-repair", "Fridge repair"], ["washing-machine", "Washing machine"]],
  carpentry: [["lock-jammed", "Lockout / jammed lock"], ["door-hinge", "Door or window"], ["furniture-repair", "Furniture repair"]],
};
const CATEGORIES_BY_SLUG = Object.fromEntries(CATEGORIES.map((category) => [category.slug, category.name]));

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const result = isJson ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const fallbackMessage = response.status === 404
      ? "The LocalFix API isn't connected to this site yet."
      : response.status >= 500
        ? "The LocalFix service is temporarily unavailable."
        : "Could not complete the request.";
    throw new Error(result.message || fallbackMessage);
  }
  return result;
}

function App() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationStatus, setLocationStatus] = useState("Finding your location...");
  const [category, setCategory] = useState("plumbing");
  const [specialty, setSpecialty] = useState("");
  const [radius, setRadius] = useState(15);
  const [area, setArea] = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [ownedProvider, setOwnedProvider] = useState(null);
  const [areaLoading, setAreaLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Using Hyderabad");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude, label: "Your current location" });
        setLocationStatus("GPS location found");
      },
      () => setLocationStatus("Using Hyderabad · GPS unavailable"),
      { timeout: 7000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      const params = new URLSearchParams({ lng: String(location.lng), lat: String(location.lat), radius: String(radius), category });
      if (specialty) params.set("specialty", specialty);
      try {
        const result = await request(`/providers/search?${params}`, { signal: controller.signal });
        setProviders(result.data || []);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setProviders([]);
          setSearchError(requestError.name === "TypeError" ? "Can't reach LocalFix. Check your connection and try again." : requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [location, radius, category, specialty, searchAttempt]);

  function selectCategory(slug) {
    setCategory(slug);
    setSpecialty("");
  }

  async function locateArea(event) {
    event.preventDefault();
    const query = area.trim();
    if (!query) return;
    setAreaLoading(true);
    setError("");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
      const matches = await response.json();
      if (!matches.length) throw new Error("We couldn't find that area. Try a nearby city or neighborhood.");
      setLocation({ lat: Number(matches[0].lat), lng: Number(matches[0].lon), label: matches[0].display_name.split(",").slice(0, 2).join(",") });
      setLocationStatus("Area selected");
    } catch (lookupError) {
      setError(lookupError.message || "Area lookup failed. Try again or use GPS.");
    } finally {
      setAreaLoading(false);
    }
  }

  function useGps() {
    setLocationStatus("Finding your location...");
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude, label: "Your current location" });
        setLocationStatus("GPS location found");
      },
      () => setLocationStatus("Location permission unavailable"),
      { timeout: 8000 }
    );
  }

  async function toggleAvailability() {
    if (!ownedProvider) return;
    try {
      const result = await request(`/providers/${ownedProvider._id}/availability`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !ownedProvider.isAvailable }),
      });
      setOwnedProvider(result.provider);
    } catch (toggleError) {
      setError(toggleError.message);
    }
  }

  function providerRegistered(provider) {
    setOwnedProvider(provider);
    setModalOpen(false);
    setCategory(provider.categorySlug);
    setSpecialty("");
    setLocation({ lat: provider.location.coordinates[1], lng: provider.location.coordinates[0], label: "Your service area" });
    setLocationStatus("Profile location");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="LocalFix home"><span className="brand-mark"><Wrench size={19} strokeWidth={2.6} /></span><span>localfix<span className="brand-period">.</span></span></a>
        <div className="header-location"><span className="live-dot" /><span>{locationStatus}</span><span className="location-divider">/</span><span className="truncate max-w-44">{location.label}</span></div>
        <button className="provider-entry" onClick={() => setModalOpen(true)}><Plus size={16} /> <span>For technicians</span></button>
      </header>

      <main id="top" className="page-shell">
        <section className="intro-row">
          <div className="intro-copy">
            <p className="eyebrow"><span className="eyebrow-line" />NEARBY HELP, RIGHT NOW</p>
            <h1>Something broken?<br /><span>Get it fixed.</span></h1>
            <p className="intro-description">Find an available local pro. Call directly, get help moving.</p>
          </div>
          <div className="response-stamp"><Clock3 size={15} /><span>Find help in<br /><strong>under 15 seconds</strong></span><ArrowDownRight className="stamp-arrow" size={18} /></div>
        </section>

        <section className="location-panel" aria-label="Search location and radius">
          <form onSubmit={locateArea} className="area-form">
            <MapPin size={18} className="location-icon" />
            <label className="area-input-wrap"><span>YOUR AREA</span><input value={area} onChange={(event) => setArea(event.target.value)} placeholder="Enter area or city" aria-label="Area or city" /></label>
            <button className="area-submit" type="submit" disabled={areaLoading} aria-label="Search area">{areaLoading ? <span className="spinner small" /> : <ArrowRight size={18} />}</button>
          </form>
          <button className="gps-button" onClick={useGps}><LocateFixed size={16} /><span>Use my location</span></button>
          <div className="radius-control"><SlidersHorizontal size={16} /><label htmlFor="radius">WITHIN <strong>{radius} KM</strong></label><input id="radius" type="range" min="2" max="50" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /><span className="radius-limit">50</span></div>
        </section>

        {error && <div className="alert-line" role="alert"><CircleAlert size={17} />{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}

        <section className="service-section" aria-labelledby="services-heading">
          <div className="section-heading"><div><p className="eyebrow">01 / TELL US WHAT'S WRONG</p><h2 id="services-heading">What do you need fixed?</h2></div><span className="step-note">Pick a service</span></div>
          <div className="category-grid">
            {CATEGORIES.map(({ slug, name, icon: Icon, note, tint }, index) => (
              <button key={slug} onClick={() => selectCategory(slug)} className={`category-tile tint-${tint} ${category === slug ? "is-selected" : ""}`} aria-pressed={category === slug}>
                <span className="category-index">0{index + 1}</span><span className="category-icon"><Icon size={22} strokeWidth={1.8} /></span><span className="category-name">{name}</span><span className="category-note">{note}</span><ArrowRight className="category-arrow" size={17} />
              </button>
            ))}
          </div>
          <div className="problem-row"><div className="problem-label"><span className="problem-marker" />THE PROBLEM</div><div className="problem-options">
            {PROBLEMS[category].map(([slug, label]) => <button key={slug} onClick={() => setSpecialty(specialty === slug ? "" : slug)} className={`problem-chip ${specialty === slug ? "problem-active" : ""}`} aria-pressed={specialty === slug}>{label}{specialty === slug && <Check size={13} />}</button>)}
          </div></div>
        </section>

        <section className="results-section" aria-labelledby="results-heading">
          <div className="results-heading"><div><p className="eyebrow">02 / READY TO HELP</p><h2 id="results-heading">Available near you <span className="result-count">{loading ? "..." : searchError ? "!" : String(providers.length).padStart(2, "0")}</span></h2></div><span className="sort-note"><span className="live-dot" />Closest first</span></div>
          {loading ? <div className="loading-state"><span className="spinner" />Looking for nearby experts...</div> : searchError ? <div className="empty-state" role="alert"><CircleAlert size={23} /><div><strong>Nearby search is unavailable.</strong><span>{searchError}</span></div><button onClick={() => setSearchAttempt((attempt) => attempt + 1)}>Try again <ArrowRight size={15} /></button></div> : providers.length ? <div className="provider-list">{providers.map((provider) => <ProviderCard key={provider._id} provider={provider} />)}</div> : <div className="empty-state"><Search size={23} /><div><strong>No available pros in this radius.</strong><span>Try a wider search or choose a different problem.</span></div><button onClick={() => setRadius(Math.min(50, radius + 10))}>Expand search <ArrowRight size={15} /></button></div>}
        </section>

        <footer className="page-footer"><span>LOCALFIX <span className="brand-period">●</span> LOCAL EXPERTS, DIRECTLY</span><button onClick={() => setModalOpen(true)}>Are you a technician? <ArrowRight size={14} /></button><span className="footer-note"><ShieldCheck size={13} /> Call and confirm details with your pro.</span></footer>
      </main>

      {ownedProvider && <div className="manage-bar"><div><span className={`availability-light ${ownedProvider.isAvailable ? "on" : "off"}`} /><div><strong>Your LocalFix listing</strong><span>{ownedProvider.isAvailable ? "Visible to people nearby" : "Not showing in search"}</span></div></div><button onClick={toggleAvailability} className={`manage-toggle ${ownedProvider.isAvailable ? "busy" : "available"}`}>{ownedProvider.isAvailable ? "Go busy" : "Available now"}</button><button className="manage-close" onClick={() => setOwnedProvider(null)} aria-label="Close listing controls"><X size={16} /></button></div>}
      {modalOpen && <RegistrationModal onClose={() => setModalOpen(false)} onRegistered={providerRegistered} />}
    </div>
  );
}

function ProviderCard({ provider }) {
  const specialtyNames = provider.specialties.map((slug) =>
    Object.values(PROBLEMS).flat().find(([problemSlug]) => problemSlug === slug)?.[1] || slug.replaceAll("-", " ")
  );
  return (
    <article className="provider-card">
      <div className="provider-main"><div className="provider-avatar">{provider.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><div className="provider-identity"><div className="provider-name-row"><h3>{provider.fullName}</h3><BadgeCheck size={16} className="verified-icon" aria-label="Registered provider" /></div><p>{CATEGORIES_BY_SLUG[provider.categorySlug]} <span>·</span> {provider.experienceYears} yrs experience</p><div className="specialty-list">{specialtyNames.slice(0, 3).map((name) => <span key={name}>{name}</span>)}</div></div></div>
      <div className="provider-meta"><div className="rating"><Star size={15} fill="currentColor" /><strong>{Number(provider.rating || 4.5).toFixed(1)}</strong><span>rating</span></div><div className="distance"><MapPin size={14} /><strong>{Number(provider.distanceKm || 0).toFixed(1)} km</strong><span>away</span></div></div>
      <a className="call-button" href={`tel:${provider.phone.replace(/[\s()-]/g, "")}`} aria-label={`Call ${provider.fullName}`}><Phone size={17} fill="currentColor" /><span>Call expert</span><ArrowRight size={16} /></a>
    </article>
  );
}

function RegistrationModal({ onClose, onRegistered }) {
  const [form, setForm] = useState({ fullName: "", phone: "", categorySlug: "plumbing", specialties: [], experienceYears: "", lat: "17.385", lng: "78.4867" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const problems = PROBLEMS[form.categorySlug];
  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }
  function toggleProblem(slug) {
    setForm((current) => ({ ...current, specialties: current.specialties.includes(slug) ? current.specialties.filter((item) => item !== slug) : [...current.specialties, slug] }));
  }
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await request("/providers", {
        method: "POST",
        body: JSON.stringify({ ...form, experienceYears: Number(form.experienceYears), coordinates: [Number(form.lng), Number(form.lat)] }),
      });
      onRegistered(result.provider);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="register-modal" role="dialog" aria-modal="true" aria-labelledby="register-heading"><div className="modal-heading"><div><p className="eyebrow">JOIN YOUR NEIGHBORHOOD NETWORK</p><h2 id="register-heading">Get listed. Get calls.</h2></div><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button></div><p className="modal-description">Create your free listing. Turn availability on or off whenever work changes.</p>
    <form onSubmit={submit} className="register-form"><label>FULL NAME<input required name="fullName" value={form.fullName} onChange={update} placeholder="Your name" maxLength="100" /></label><label>PHONE NUMBER<input required name="phone" type="tel" value={form.phone} onChange={update} placeholder="+91 98765 43210" /></label><div className="form-split"><label>SERVICE<select name="categorySlug" value={form.categorySlug} onChange={(event) => setForm((current) => ({ ...current, categorySlug: event.target.value, specialties: [] }))}>{CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><label>YEARS OF EXPERIENCE<input required name="experienceYears" type="number" min="0" max="70" value={form.experienceYears} onChange={update} placeholder="e.g. 8" /></label></div><fieldset><legend>WHAT DO YOU FIX?</legend><div className="register-problems">{problems.map(([slug, label]) => <button type="button" key={slug} onClick={() => toggleProblem(slug)} className={form.specialties.includes(slug) ? "problem-chip problem-active" : "problem-chip"}>{label}{form.specialties.includes(slug) && <Check size={13} />}</button>)}</div></fieldset><div className="form-split"><label>LATITUDE<input required name="lat" type="number" step="any" min="-90" max="90" value={form.lat} onChange={update} /></label><label>LONGITUDE<input required name="lng" type="number" step="any" min="-180" max="180" value={form.lng} onChange={update} /></label></div><p className="coordinate-note"><MapPin size={13} /> Your service-area coordinates. Hyderabad is prefilled; edit to your location.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-register" type="submit" disabled={saving}>{saving ? "Creating your listing..." : "Create my listing"}<ArrowRight size={17} /></button></form>
    </section></div>;
}

export default App;