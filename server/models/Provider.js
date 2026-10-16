import mongoose from "mongoose";

const categories = ["plumbing", "electrical", "hvac", "carpentry"];

const providerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value) => /^\+?[0-9]{10,15}$/.test(value.replace(/[\s()-]/g, "")),
        message: "Enter a valid phone number with 10 to 15 digits.",
      },
    },
    categorySlug: { type: String, required: true, enum: categories },
    specialties: { type: [{ type: String, trim: true }], default: [] },
    experienceYears: { type: Number, min: 0, max: 70, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
    isAvailable: { type: Boolean, default: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coordinates) =>
            coordinates.length === 2 &&
            coordinates[0] >= -180 && coordinates[0] <= 180 &&
            coordinates[1] >= -90 && coordinates[1] <= 90,
          message: "Location must contain valid [longitude, latitude] coordinates.",
        },
      },
    },
  },
  { timestamps: true }
);

providerSchema.index({ location: "2dsphere" });
providerSchema.index({ categorySlug: 1, isAvailable: 1 });

export default mongoose.model("Provider", providerSchema);