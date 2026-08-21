import mongoose from "mongoose";
import Borrowing from "../models/Borrowing.model.js";
import Equipment from "../models/Equipment.model.js";
import Reservation from "../models/Reservation.model.js";
import { buildPagination, parsePagination } from "../utils/queryHelpers.js";

const BORROWING_STATUSES = [
    "pending",
    "approved",
    "borrowed",
    "returned",
    "rejected",
    "cancelled",
];
const RESERVATION_STATUSES = [
    "pending",
    "approved",
    "rejected",
    "cancelled",
    "completed",
];

const parseDateFilter = (dateFrom, dateTo, { endExclusive = false } = {}) => {
    const parse = (value, label) => {
        if (value === undefined || value === "") return {};
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return { error: `${label} must use YYYY-MM-DD format.` };
        }
        const date = new Date(`${value}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
            return { error: `${label} must be a valid date.` };
        }
        return { date };
    };

    const from = parse(dateFrom, "Date from");
    const to = parse(dateTo, "Date to");
    if (from.error) return from;
    if (to.error) return to;
    if (from.date && to.date && from.date > to.date) {
        return { error: "Date from cannot be after date to." };
    }

    const range = {};
    if (from.date) range.$gte = from.date;
    if (to.date) {
        if (endExclusive) {
            const nextDay = new Date(to.date);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            range.$lt = nextDay;
        } else {
            range.$lte = to.date;
        }
    }

    return { range };
};

const statusSummary = (rows, statuses) => {
    const summary = { total: 0 };
    statuses.forEach((status) => {
        summary[status] = 0;
    });
    rows.forEach((row) => {
        summary[row._id] = row.count;
        summary.total += row.count;
    });
    return summary;
};

const getBorrowingReport = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) return res.status(400).json({ message: pagination.error });

        const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
        if (status && !BORROWING_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid borrowing status." });
        }
        const dates = parseDateFilter(req.query.dateFrom, req.query.dateTo, {
            endExclusive: true,
        });
        if (dates.error) return res.status(400).json({ message: dates.error });

        const filter = {};
        if (status) filter.status = status;
        if (Object.keys(dates.range).length) filter.createdAt = dates.range;

        const [records, totalItems, summaryRows] = await Promise.all([
            Borrowing.find(filter)
                .populate("user", "firstName middleName lastName email phoneNumber purok houseNumber")
                .populate("equipment", "equipmentName category image status")
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            Borrowing.countDocuments(filter),
            Borrowing.aggregate([
                { $match: filter },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);

        return res.status(200).json({
            summary: statusSummary(summaryRows, BORROWING_STATUSES),
            records,
            pagination: buildPagination(pagination.page, pagination.limit, totalItems),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to generate borrowing report." });
    }
};

const getReservationReport = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) return res.status(400).json({ message: pagination.error });

        const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
        const facility = typeof req.query.facility === "string" ? req.query.facility.trim() : "";
        if (status && !RESERVATION_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid reservation status." });
        }
        if (facility && !mongoose.Types.ObjectId.isValid(facility)) {
            return res.status(400).json({ message: "Invalid facility ID." });
        }

        const dates = parseDateFilter(req.query.dateFrom, req.query.dateTo);
        if (dates.error) return res.status(400).json({ message: dates.error });

        const filter = {};
        if (status) filter.status = status;
        if (facility) filter.facility = new mongoose.Types.ObjectId(facility);
        if (Object.keys(dates.range).length) filter.reservationDate = dates.range;

        const [records, totalItems, summaryRows] = await Promise.all([
            Reservation.find(filter)
                .populate("user", "firstName middleName lastName email phoneNumber purok houseNumber")
                .populate("facility", "facilityName category location capacity status image")
                .sort({ reservationDate: -1, startTime: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            Reservation.countDocuments(filter),
            Reservation.aggregate([
                { $match: filter },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);

        return res.status(200).json({
            summary: statusSummary(summaryRows, RESERVATION_STATUSES),
            records,
            pagination: buildPagination(pagination.page, pagination.limit, totalItems),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to generate reservation report." });
    }
};

const getEquipmentReport = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) return res.status(400).json({ message: pagination.error });

        const [records, totalItems, totals] = await Promise.all([
            Equipment.find()
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            Equipment.countDocuments(),
            Equipment.aggregate([
                {
                    $group: {
                        _id: null,
                        totalEquipmentTypes: { $sum: 1 },
                        activeEquipmentTypes: {
                            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
                        },
                        inactiveEquipmentTypes: {
                            $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
                        },
                        totalUnits: { $sum: "$totalQuantity" },
                        availableUnits: { $sum: "$availableQuantity" },
                        maintenanceUnits: { $sum: { $ifNull: ["$maintenanceQuantity", 0] } },
                        borrowedUnits: {
                            $sum: {
                                $max: [
                                    0,
                                    {
                                        $subtract: [
                                            "$totalQuantity",
                                            {
                                                $add: [
                                                    "$availableQuantity",
                                                    { $ifNull: ["$maintenanceQuantity", 0] },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
                { $project: { _id: 0 } },
            ]),
        ]);

        const emptySummary = {
            totalEquipmentTypes: 0,
            activeEquipmentTypes: 0,
            inactiveEquipmentTypes: 0,
            totalUnits: 0,
            availableUnits: 0,
            maintenanceUnits: 0,
            borrowedUnits: 0,
        };

        return res.status(200).json({
            summary: totals[0] || emptySummary,
            records,
            pagination: buildPagination(pagination.page, pagination.limit, totalItems),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to generate equipment report." });
    }
};

export { getBorrowingReport, getEquipmentReport, getReservationReport };
