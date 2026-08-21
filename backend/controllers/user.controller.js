import mongoose from "mongoose";
import User from "../models/User.model.js";
import {
    buildPagination,
    escapeRegex,
    parsePagination,
} from "../utils/queryHelpers.js";

const RESIDENT_FIELDS = [
    "firstName",
    "middleName",
    "lastName",
    "email",
    "phoneNumber",
    "birthday",
    "houseNumber",
    "purok",
    "role",
    "accountStatus",
    "isVerified",
    "createdAt",
    "updatedAt",
].join(" ");

const getResidents = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) {
            return res.status(400).json({ message: pagination.error });
        }

        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
        const filter = { role: "resident" };
        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");
            filter.$or = [
                { firstName: regex },
                { middleName: regex },
                { lastName: regex },
                { email: regex },
                { phoneNumber: regex },
                { purok: regex },
                { houseNumber: regex },
            ];
        }

        const [residents, totalItems] = await Promise.all([
            User.find(filter)
                .select(RESIDENT_FIELDS)
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            User.countDocuments(filter),
        ]);

        return res.status(200).json({
            residents,
            pagination: buildPagination(pagination.page, pagination.limit, totalItems),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to retrieve residents." });
    }
};

const getResidentById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid resident ID." });
        }

        const resident = await User.findOne({
            _id: req.params.id,
            role: "resident",
        }).select(RESIDENT_FIELDS);
        if (!resident) {
            return res.status(404).json({ message: "Resident not found." });
        }

        return res.status(200).json({ resident });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to retrieve resident." });
    }
};

const updateResidentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid resident ID." });
        }
        if (!Object.hasOwn(req.body || {}, "accountStatus") ||
            !["active", "inactive"].includes(req.body.accountStatus)) {
            return res.status(400).json({
                message: "Account status must be active or inactive.",
            });
        }
        if (Object.keys(req.body).some((field) => field !== "accountStatus")) {
            return res.status(400).json({
                message: "Only account status can be updated through this endpoint.",
            });
        }

        const resident = await User.findOne({ _id: id, role: "resident" });
        if (!resident) {
            return res.status(404).json({ message: "Resident not found." });
        }

        resident.accountStatus = req.body.accountStatus;
        await resident.save();

        return res.status(200).json({
            message: `Resident account marked as ${resident.accountStatus}.`,
            resident: {
                id: resident._id,
                accountStatus: resident.accountStatus,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update resident status." });
    }
};

export { getResidentById, getResidents, updateResidentStatus };
