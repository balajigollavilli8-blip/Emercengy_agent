# LocalFix

LocalFix helps people find nearby, available repair technicians and call them directly. The repository contains a React/Vite + Tailwind client and an Express/Mongoose API, alongside the original Python app.

## Requirements

- Node.js 20 or newer
- MongoDB 6 or newer, local or MongoDB Atlas

## Run locally

1. In the repository root, run `npm install`, `npm --prefix server install`, and `npm --prefix client install`.
2. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` to your MongoDB connection string. For local MongoDB, the example URI works when MongoDB is running.
3. Run `npm run seed` to add sample technicians around Hyderabad. Seeding is safe to repeat.
4. Run `npm run dev`, then open the Vite URL printed in the terminal (usually `http://localhost:5173`). The API runs on port 4000.

Geolocation requires a secure context (HTTPS) or localhost. If location access is denied, search by area name; area lookup uses the OpenStreetMap Nominatim service. The technician registration form starts with Hyderabad coordinates; change them to the technician's service area before registering.

## API

- `POST /api/providers` registers a provider. Send `fullName`, `phone`, `categorySlug`, `specialties`, `experienceYears`, and `coordinates: [longitude, latitude]`.
- `PATCH /api/providers/:id/availability` sets `{ "isAvailable": true }` or `{ "isAvailable": false }`. With an empty body, it toggles the current status.
- `GET /api/providers/search?lng=78.4867&lat=17.385&radius=15&category=plumbing&specialty=leaking-pipe` searches available providers within 2–50 km.
- `GET /api/health` reports API and database connection status.

The MongoDB `2dsphere` index and the search pipeline's `$geoNear` stage are used for distance filtering and sorting. Categories are `plumbing`, `electrical`, `hvac`, and `carpentry`.

## Deploy

Create a MongoDB Atlas database and set its network access and database user credentials. Deploy `server/` as a Node web service (Render or Railway), set its build/install directory to `server`, start command to `npm start`, and configure `MONGO_URI`, `PORT` (provided by the host), and `CLIENT_URL` (the deployed client origin). Deploy `client/` as a static Vite site (Vercel, Netlify, or Render static site), set `VITE_API_URL` to `https://YOUR_API_HOST/api`, and use `npm run build` with `dist` as the publish directory. Allow the client origin in the API's `CLIENT_URL` setting. Set `MONGO_URI` in `server/.env` and run `npm run seed` from the repository root to seed the database once.

To preview locally over a public tunnel, run the app first and expose port 5173 with a tunnel such as `ngrok http 5173`. Geolocation works on the resulting HTTPS URL. For a public deployment, use a managed MongoDB instance and keep credentials in the hosting provider's environment settings, never in the client bundle.

The GitHub Actions workflow deploys the client to GitHub Pages on pushes to `feat/emergency-service-agent`. In the repository's **Settings > Pages**, select **GitHub Actions** as the build and deployment source if it is not already selected. The Pages URL serves the frontend only; set the repository Actions variable `VITE_API_URL` to the deployed API base URL (for example, `https://your-api-host.example.com/api`) to enable search and registration.