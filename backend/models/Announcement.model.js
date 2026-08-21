import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required."],
            trim: true,
        },
        content: {
            type: String,
            required: [true, "Content is required."],
            trim: true,
        },
        status: {
            type: String,
            enum: ["published", "draft"],
            default: "published",
        },
        publishedAt: {
            type: Date,
            default: null,
        },
        priority: {
            type: String,
            enum: ["normal", "important"],
            default: "normal",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

announcementSchema.index({ status: 1, publishedAt: -1 });

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
