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
            validate: {
                validator: Number.isInteger,
                message: "Total quantity must be a whole number.",
            },
        },

        availableQuantity: {
            type: Number,
            required: true,
            min: 0,
            validate: 
                {
                    validator: Number.isInteger,
                    message: "Available quantity must be a whole number.",
                }
        },

        maintenanceQuantity: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: "Maintenance quantity must be a whole number.",
            },
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
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
    {
        timestamps: true,
    }
);

equipmentSchema.pre("validate", function () {
    if (this.maintenanceQuantity > this.totalQuantity) {
        this.invalidate(
            "maintenanceQuantity",
            "Maintenance quantity cannot exceed total quantity."
        );
    }
});

const Equipment = mongoose.model("Equipment", equipmentSchema);

export default Equipment;
