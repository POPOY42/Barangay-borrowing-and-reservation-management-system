import mongoose from "mongoose";
import Facility from "../models/Facility.model.js";
import Reservation from "../models/Reservation.model.js";
import cloudinary from "../config/cloudinary.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import {
    buildPagination,
    escapeRegex,
    parsePagination,
} from "../utils/queryHelpers.js";

const FACILITY_STATUSES = ["active", "inactive", "maintenance"];

const parseFacilityInput = (body, { partial = false } = {}) => {
    const allowedFields = [
        "facilityName",
        "category",
        "description",
        "location",
        "capacity",
        "status",
    ];
    const unsupportedFields = Object.keys(body).filter(
        (field) => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
        return { error: "The request contains unsupported facility fields." };
    }

    const values = {};

    for (const field of ["facilityName", "category"]) {
        if (!partial || Object.hasOwn(body, field)) {
            if (typeof body[field] !== "string" || !body[field].trim()) {
                return { error: `${field === "facilityName" ? "Facility name" : "Category"} is required.` };
            }
            values[field] = body[field].trim();
        }
    }

    for (const field of ["description", "location"]) {
        if (Object.hasOwn(body, field)) {
            if (typeof body[field] !== "string") {
                return { error: `${field === "description" ? "Description" : "Location"} must be valid text.` };
            }
            values[field] = body[field].trim();
        }
    }

    if (Object.hasOwn(body, "capacity")) {
        if (body.capacity === "" || body.capacity === null) {
            values.capacity = undefined;
        } else {
            const capacity = Number(body.capacity);
            if (!Number.isInteger(capacity) || capacity < 1) {
                return { error: "Capacity must be a whole number of at least 1." };
            }
            values.capacity = capacity;
        }
    }

    if (Object.hasOwn(body, "status")) {
        if (!FACILITY_STATUSES.includes(body.status)) {
            return { error: "Invalid facility status." };
        }
        values.status = body.status;
    }

    return { values };
};

const findDuplicateName = (facilityName, excludedId) => {
    const filter = {
        facilityName: {
            $regex: `^${escapeRegex(facilityName)}$`,
            $options: "i",
        },
    };

    if (excludedId) filter._id = { $ne: excludedId };
    return Facility.findOne(filter).select("_id");
};

const createFacility = async (req, res) => {
    let uploadedPublicId = "";

    try {
        const parsed = parseFacilityInput(req.body || {});
        if (parsed.error) return res.status(400).json({ message: parsed.error });

        if (await findDuplicateName(parsed.values.facilityName)) {
            return res.status(409).json({
                message: "A facility with this name already exists.",
            });
        }

        let image = "";
        if (req.file) {
            const uploadResult = await uploadToCloudinary(
                req.file.buffer,
                "barangay-facilities"
            );
            image = uploadResult.secure_url;
            uploadedPublicId = uploadResult.public_id;
        }

        const facility = await Facility.create({
            ...parsed.values,
            image,
            imagePublicId: uploadedPublicId,
        });

        return res.status(201).json({
            message: "Facility created successfully.",
            facility,
        });
    } catch (error) {
        if (uploadedPublicId) {
            await cloudinary.uploader.destroy(uploadedPublicId).catch(() => {});
        }
        if (error?.code === 11000) {
            return res.status(409).json({
                message: "A facility with this name already exists.",
            });
        }
        console.error(error);
        return res.status(500).json({ message: "Failed to create facility." });
    }
};

const getFacilities = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) {
            return res.status(400).json({ message: pagination.error });
        }

        const search = typeof req.query.search === "string"
            ? req.query.search.trim()
            : "";
        const requestedStatus = typeof req.query.status === "string"
            ? req.query.status.trim()
            : "";

        if (requestedStatus && !FACILITY_STATUSES.includes(requestedStatus)) {
            return res.status(400).json({ message: "Invalid facility status." });
        }

        const filter = {};
        if (req.user.role === "resident") {
            filter.status = "active";
        } else if (requestedStatus) {
            filter.status = requestedStatus;
        }

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");
            filter.$or = [
                { facilityName: regex },
                { category: regex },
                { location: regex },
            ];
        }

        const [facilities, totalItems] = await Promise.all([
            Facility.find(filter)
                .select(req.user.role === "resident" ? "-imagePublicId" : "")
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            Facility.countDocuments(filter),
        ]);

        let responseFacilities = facilities;
        if (req.user.role === "resident" && facilities.length > 0) {
            const activeReservations = await Reservation.find({
                user: req.user._id,
                facility: { $in: facilities.map((facility) => facility._id) },
                status: { $in: ["pending", "approved"] },
            })
                .select("facility status")
                .lean();
            const reservationStatusByFacility = new Map();

            activeReservations.forEach((reservation) => {
                const facilityId = reservation.facility.toString();
                const currentStatus = reservationStatusByFacility.get(facilityId);

                if (!currentStatus || reservation.status === "approved") {
                    reservationStatusByFacility.set(facilityId, reservation.status);
                }
            });

            responseFacilities = facilities.map((facility) => ({
                ...facility.toObject(),
                reservationStatus:
                    reservationStatusByFacility.get(facility._id.toString()) || null,
            }));
        }

        return res.status(200).json({
            facilities: responseFacilities,
            pagination: buildPagination(
                pagination.page,
                pagination.limit,
                totalItems
            ),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to retrieve facilities." });
    }
};

const getFacilityById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid facility ID." });
        }

        const filter = { _id: req.params.id };
        if (req.user.role === "resident") filter.status = "active";
        const facility = await Facility.findOne(filter).select(
            req.user.role === "resident" ? "-imagePublicId" : ""
        );

        if (!facility) {
            return res.status(404).json({ message: "Facility not found." });
        }

        return res.status(200).json({ facility });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to retrieve facility." });
    }
};

const updateFacility = async (req, res) => {
    let uploadedPublicId = "";

    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid facility ID." });
        }

        const parsed = parseFacilityInput(req.body || {}, { partial: true });
        if (parsed.error) return res.status(400).json({ message: parsed.error });

        const facility = await Facility.findById(id);
        if (!facility) {
            return res.status(404).json({ message: "Facility not found." });
        }

        if (
            parsed.values.facilityName &&
            await findDuplicateName(parsed.values.facilityName, facility._id)
        ) {
            return res.status(409).json({
                message: "A facility with this name already exists.",
            });
        }

        let newImage = facility.image;
        if (req.file) {
            const uploadResult = await uploadToCloudinary(
                req.file.buffer,
                "barangay-facilities"
            );
            newImage = uploadResult.secure_url;
            uploadedPublicId = uploadResult.public_id;
        }

        const oldPublicId = facility.imagePublicId;
        Object.assign(facility, parsed.values);
        if (req.file) {
            facility.image = newImage;
            facility.imagePublicId = uploadedPublicId;
        }
        await facility.save();

        if (req.file && oldPublicId && oldPublicId !== uploadedPublicId) {
            await cloudinary.uploader.destroy(oldPublicId).catch((error) => {
                console.error("Failed to delete the old facility image:", error);
            });
        }

        return res.status(200).json({
            message: "Facility updated successfully.",
            facility,
        });
    } catch (error) {
        if (uploadedPublicId) {
            await cloudinary.uploader.destroy(uploadedPublicId).catch(() => {});
        }
        if (error?.code === 11000) {
            return res.status(409).json({
                message: "A facility with this name already exists.",
            });
        }
        console.error(error);
        return res.status(500).json({ message: "Failed to update facility." });
    }
};

const deleteFacility = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid facility ID." });
        }

        const facility = await Facility.findById(id);
        if (!facility) {
            return res.status(404).json({ message: "Facility not found." });
        }

        if (await Reservation.exists({ facility: facility._id })) {
            return res.status(400).json({
                message:
                    "Facility cannot be deleted because it already has reservation records. Mark it as inactive instead.",
            });
        }

        if (facility.imagePublicId) {
            await cloudinary.uploader.destroy(facility.imagePublicId);
        }
        await facility.deleteOne();

        return res.status(200).json({ message: "Facility deleted successfully." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to delete facility." });
    }
};

export {
    createFacility,
    deleteFacility,
    getFacilities,
    getFacilityById,
    updateFacility,
};
