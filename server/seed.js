import dotenv from "dotenv";
import mongoose from "mongoose";
import Provider from "./models/Provider.js";

dotenv.config();

const sampleProviders = [
  { fullName: "Ramesh Kumar", phone: "+919876543210", categorySlug: "plumbing", specialties: ["leaking-pipe", "clogged-drain", "water-heater"], experienceYears: 9, rating: 4.8, coordinates: [78.4482, 17.4126] },
  { fullName: "Syed Irfan", phone: "+919123456789", categorySlug: "plumbing", specialties: ["water-heater", "leaking-pipe"], experienceYears: 6, rating: 4.6, coordinates: [78.3915, 17.4483] },
  { fullName: "Vikram Goud", phone: "+919988776655", categorySlug: "electrical", specialties: ["power-outage", "mcb-tripping", "switchboard-repair"], experienceYears: 12, rating: 4.9, coordinates: [78.4983, 17.4399] },
  { fullName: "Anil Sharma", phone: "+919700112233", categorySlug: "electrical", specialties: ["power-outage", "mcb-tripping"], experienceYears: 7, rating: 4.7, coordinates: [78.4138, 17.4849] },
  { fullName: "Mohammed Farooq", phone: "+919440055667", categorySlug: "hvac", specialties: ["ac-not-cooling", "gas-refill", "fridge-repair"], experienceYears: 10, rating: 4.8, coordinates: [78.4483, 17.4375] },
  { fullName: "Srinivas Chary", phone: "+919391122446", categorySlug: "carpentry", specialties: ["lock-jammed", "door-hinge", "furniture-repair"], experienceYears: 14, rating: 4.9, coordinates: [78.4815, 17.4021] },
];

async function seed() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required.");
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all(sampleProviders.map(({ coordinates, ...provider }) =>
    Provider.updateOne(
      { phone: provider.phone },
      { $setOnInsert: { ...provider, location: { type: "Point", coordinates } } },
      { upsert: true }
    )
  ));
  console.log(`Seeded ${sampleProviders.length} sample providers around Hyderabad.`);
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());