import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import providerRoutes from "./routes/providerRoutes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigins = process.env.CLIENT_URL?.split(",").map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});
app.use("/api/providers", providerRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  response.status(status).json({
    message: status < 500 ? error.message : "Something went wrong. Please try again.",
  });
});

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required. Copy server/.env.example to server/.env and configure it.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  app.listen(port, "0.0.0.0", () => console.log(`LocalFix API listening on port ${port}`));
}

start().catch((error) => {
  console.error(`Unable to start LocalFix: ${error.message}`);
  process.exit(1);
});