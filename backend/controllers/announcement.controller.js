import mongoose from "mongoose";
import Announcement from "../models/Announcement.model.js";
import {
    buildPagination,
    escapeRegex,
    parsePagination,
} from "../utils/queryHelpers.js";

const STATUSES = ["published", "draft"];
const PRIORITIES = ["normal", "important"];

const validateAnnouncement = (body, { partial = false } = {}) => {
    const allowedFields = ["title", "content", "status", "priority"];
    const fields = Object.keys(body || {});
    if (fields.some((field) => !allowedFields.includes(field))) {
        return { error: "The request contains unsupported announcement fields." };
    }
    if (partial && fields.length === 0) {
        return { error: "Provide at least one announcement field to update." };
    }

    const values = {};
    for (const field of ["title", "content"]) {
        if (!partial || Object.hasOwn(body, field)) {
            if (typeof body[field] !== "string" || !body[field].trim()) {
                return { error: `${field === "title" ? "Title" : "Content"} is required.` };
            }
            values[field] = body[field].trim();
        }
    }

    if (Object.hasOwn(body, "status")) {
        if (!STATUSES.includes(body.status)) {
            return { error: "Status must be published or draft." };
        }
        values.status = body.status;
    }
    if (Object.hasOwn(body, "priority")) {
        if (!PRIORITIES.includes(body.priority)) {
            return { error: "Priority must be normal or important." };
        }
        values.priority = body.priority;
    }

    return { values };
};

const createAnnouncement = async (req, res) => {
    try {
        const parsed = validateAnnouncement(req.body || {});
        if (parsed.error) return res.status(400).json({ message: parsed.error });

        const status = parsed.values.status || "published";
        const announcement = await Announcement.create({
            ...parsed.values,
            status,
            publishedAt: status === "published" ? new Date() : null,
            createdBy: req.user._id,
        });

        return res.status(201).json({
            message: "Announcement created successfully.",
            announcement,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create announcement." });
    }
};

const getAnnouncements = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) {
            return res.status(400).json({ message: pagination.error });
        }

        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
        const requestedStatus = typeof req.query.status === "string"
            ? req.query.status.trim()
            : "";
        if (
            requestedStatus &&
            requestedStatus !== "all" &&
            !STATUSES.includes(requestedStatus)
        ) {
            return res.status(400).json({ message: "Invalid announcement status." });
        }

        const filter = {};
        if (req.user.role === "resident") {
            filter.status = "published";
        } else if (requestedStatus && requestedStatus !== "all") {
            filter.status = requestedStatus;
        }

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");
            filter.$or = [{ title: regex }, { content: regex }];
        }

        const [announcements, totalItems] = await Promise.all([
            Announcement.find(filter)
                .populate("createdBy", "firstName lastName")
                .sort({ priority: 1, publishedAt: -1, createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            Announcement.countDocuments(filter),
        ]);

        return res.status(200).json({
            announcements,
            pagination: buildPagination(pagination.page, pagination.limit, totalItems),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to retrieve announcements." });
    }
};

const getAnnouncementById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid announcement ID." });
        }

        const filter = { _id: req.params.id };
        if (req.user.role === "resident") filter.status = "published";
        const announcement = await Announcement.findOne(filter).populate(
            "createdBy",
            "firstName lastName"
        );
        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found." });
        }

        return res.status(200).json({ announcement });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to retrieve announcement." });
    }
};

const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid announcement ID." });
        }

        const parsed = validateAnnouncement(req.body || {}, { partial: true });
        if (parsed.error) return res.status(400).json({ message: parsed.error });

        const announcement = await Announcement.findById(id);
        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found." });
        }

        const wasPublished = announcement.status === "published";
        Object.assign(announcement, parsed.values);
        if (Object.hasOwn(parsed.values, "status")) {
            if (parsed.values.status === "draft") announcement.publishedAt = null;
            else if (!wasPublished) announcement.publishedAt = new Date();
        }
        await announcement.save();

        return res.status(200).json({
            message: "Announcement updated successfully.",
            announcement,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update announcement." });
    }
};

const deleteAnnouncement = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid announcement ID." });
        }

        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found." });
        }
        await announcement.deleteOne();

        return res.status(200).json({ message: "Announcement deleted successfully." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to delete announcement." });
    }
};

export {
    createAnnouncement,
    deleteAnnouncement,
    getAnnouncementById,
    getAnnouncements,
    updateAnnouncement,
};
