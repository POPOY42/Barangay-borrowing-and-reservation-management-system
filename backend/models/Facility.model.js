import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema(
    {
        facilityName: {
            type: String,
            required: [true, "Facility name is required."],
            trim: true,
        },
        category: {
            type: String,
            required: [true, "Category is required."],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        location: {
            type: String,
            trim: true,
            default: "",
        },
        capacity: {
            type: Number,
            min: 1,
            validate: {
                validator: (value) => value === undefined || Number.isInteger(value),
                message: "Capacity must be a whole number.",
            },
        },
        status: {
            type: String,
            enum: ["active", "inactive", "maintenance"],
            default: "active",
        },
        image: {
            type: String,
            default: "",
        },
        imagePublicId: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

facilitySchema.index(
    { facilityName: 1 },
    { unique: true, collation: { locale: "en", strength: 2 } }
);
facilitySchema.index({ status: 1 });

const Facility = mongoose.model("Facility", facilitySchema);

export default Facility;
