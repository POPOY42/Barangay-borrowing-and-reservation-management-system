import mongoose from "mongoose";

const equipmentSchema = new mongoose.Schema(
    {
        equipmentName: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        totalQuantity: {
            type: Number,
            required: true,
            min: 0,
        },

        availableQuantity: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: ["available", "unavailable", "maintenance"],
            default: "available",
        },

        image: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const Equipment = mongoose.model("Equipment", equipmentSchema);

export default Equipment;