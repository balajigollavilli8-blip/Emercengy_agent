import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/Emercengy_agent/" : "/",
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/api": "http://localhost:4000" } },
});