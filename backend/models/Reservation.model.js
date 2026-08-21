import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
            required: true,
        },
        purpose: {
            type: String,
            required: true,
            trim: true,
        },
        reservationDate: {
            type: Date,
            required: true,
        },
        startTime: {
            type: String,
            required: true,
            match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must use HH:MM 24-hour format."],
        },
        endTime: {
            type: String,
            required: true,
            match: [/^([01]\d|2[0-3]):[0-5]\d$/, "End time must use HH:MM 24-hour format."],
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "cancelled", "completed"],
            default: "pending",
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: "",
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

reservationSchema.index({ user: 1, status: 1 });
reservationSchema.index({ user: 1, facility: 1, status: 1 });
reservationSchema.index({ facility: 1, reservationDate: 1, status: 1 });
reservationSchema.index({ createdAt: -1 });

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
