import { Router } from "express";
import mongoose from "mongoose";
import Provider from "../models/Provider.js";

const router = Router();
const categories = ["plumbing", "electrical", "hvac", "carpentry"];

router.post("/", async (request, response, next) => {
  try {
    const body = request.body && typeof request.body === "object" ? request.body : {};
    const {
      fullName = body.name,
      phone,
      categorySlug = body.category,
      specialties = [],
      experienceYears = body.experience ?? 0,
      coordinates = body.location?.coordinates,
    } = body;

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return response.status(400).json({ message: "Provide coordinates as [longitude, latitude]." });
    }

    const provider = await Provider.create({
      fullName,
      phone,
      categorySlug,
      specialties,
      experienceYears,
      location: { type: "Point", coordinates },
    });
    return response.status(201).json({ message: "Your profile is live.", provider });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return response.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

router.patch("/:id/availability", async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: "Invalid provider ID." });
    }

    const body = request.body && typeof request.body === "object" ? request.body : {};
    if (Object.hasOwn(body, "isAvailable") && typeof body.isAvailable !== "boolean") {
      return response.status(400).json({ message: "isAvailable must be a boolean." });
    }

    let provider;
    if (typeof body.isAvailable === "boolean") {
      provider = await Provider.findByIdAndUpdate(
        request.params.id,
        { isAvailable: body.isAvailable },
        { new: true, runValidators: true }
      );
    } else {
      provider = await Provider.findById(request.params.id);
      if (provider) {
        provider.isAvailable = !provider.isAvailable;
        await provider.save();
      }
    }

    if (!provider) return response.status(404).json({ message: "Provider not found." });
    return response.json({ provider });
  } catch (error) {
    return next(error);
  }
});

router.get("/search", async (request, response, next) => {
  try {
    const lng = Number(request.query.lng);
    const lat = Number(request.query.lat);
    const radius = Number(request.query.radius ?? 15);
    const { category, specialty } = request.query;

    if (!Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isFinite(lat) || lat < -90 || lat > 90) {
      return response.status(400).json({ message: "Valid lng and lat coordinates are required." });
    }
    if (!Number.isFinite(radius) || radius < 2 || radius > 50) {
      return response.status(400).json({ message: "Radius must be between 2 and 50 km." });
    }
    if (category && !categories.includes(category)) {
      return response.status(400).json({ message: "Unknown service category." });
    }
    if (specialty !== undefined && (typeof specialty !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(specialty))) {
      return response.status(400).json({ message: "Specialty must be a valid problem slug." });
    }

    const query = { isAvailable: true };
    if (category) query.categorySlug = category;
    if (specialty) query.specialties = specialty;

    const providers = await Provider.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          maxDistance: radius * 1000,
          spherical: true,
          query,
        },
      },
      { $sort: { distanceMeters: 1, rating: -1 } },
      {
        $project: {
          fullName: 1,
          phone: 1,
          categorySlug: 1,
          specialties: 1,
          experienceYears: 1,
          rating: 1,
          isAvailable: 1,
          location: 1,
          distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] },
        },
      },
    ]);

    return response.json({ count: providers.length, data: providers });
  } catch (error) {
    return next(error);
  }
});

export default router;