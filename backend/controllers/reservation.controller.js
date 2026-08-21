import mongoose from "mongoose";
import Facility from "../models/Facility.model.js";
import Reservation from "../models/Reservation.model.js";
import User from "../models/User.model.js";
import {
    buildPagination,
    escapeRegex,
    parsePagination,
} from "../utils/queryHelpers.js";

const RESERVATION_STATUSES = [
    "pending",
    "approved",
    "rejected",
    "cancelled",
    "completed",
];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const RESIDENT_FIELDS = "firstName middleName lastName email phoneNumber purok houseNumber";
const FACILITY_FIELDS = "facilityName category location capacity status image";

const getManilaNow = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());
    const value = (type) => parts.find((part) => part.type === type)?.value;

    return {
        date: `${value("year")}-${value("month")}-${value("day")}`,
        time: `${value("hour")}:${value("minute")}`,
    };
};

const getManilaToday = () =>
    new Date(`${getManilaNow().date}T00:00:00.000Z`);

const parseReservationDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { error: "Reservation date must be a valid date." };
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return { error: "Reservation date must be a valid date." };
    }

    return { date, dateText: value };
};

const validateSchedule = ({ purpose, reservationDate, startTime, endTime }) => {
    if (typeof purpose !== "string" || !purpose.trim()) {
        return { error: "Purpose is required." };
    }

    const parsedDate = parseReservationDate(reservationDate);
    if (parsedDate.error) return parsedDate;

    if (!TIME_PATTERN.test(startTime || "") || !TIME_PATTERN.test(endTime || "")) {
        return { error: "Start time and end time must use HH:MM 24-hour format." };
    }

    if (endTime <= startTime) {
        return { error: "End time must be after start time." };
    }

    const now = getManilaNow();
    if (parsedDate.dateText < now.date) {
        return { error: "Reservation date cannot be in the past." };
    }
    if (parsedDate.dateText === now.date && startTime < now.time) {
        return { error: "Start time must be later than the current time." };
    }

    return {
        values: {
            purpose: purpose.trim(),
            reservationDate: parsedDate.date,
            startTime,
            endTime,
        },
    };
};

const findScheduleConflict = ({
    facility,
    reservationDate,
    startTime,
    endTime,
    statuses,
    excludeId,
}) => {
    const filter = {
        facility,
        reservationDate,
        status: { $in: statuses },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
    };
    if (excludeId) filter._id = { $ne: excludeId };
    return Reservation.exists(filter);
};

const createReservation = async (req, res) => {
    try {
        const allowedFields = [
            "facility",
            "purpose",
            "reservationDate",
            "startTime",
            "endTime",
        ];
        if (Object.keys(req.body || {}).some((field) => !allowedFields.includes(field))) {
            return res.status(400).json({
                message: "The request contains unsupported reservation fields.",
            });
        }

        const { facility } = req.body;
        if (!mongoose.Types.ObjectId.isValid(facility)) {
            return res.status(400).json({ message: "Invalid facility ID." });
        }

        const schedule = validateSchedule(req.body);
        if (schedule.error) return res.status(400).json({ message: schedule.error });

        const facilityRecord = await Facility.findById(facility);
        if (!facilityRecord) {
            return res.status(404).json({ message: "Facility not found." });
        }
        if (facilityRecord.status !== "active") {
            return res.status(400).json({
                message: "Facility is currently unavailable for reservations.",
            });
        }

        const activeReservation = await Reservation.exists({
            user: req.user._id,
            facility: facilityRecord._id,
            status: { $in: ["pending", "approved"] },
        });
        if (activeReservation) {
            return res.status(400).json({
                message:
                    "You already have an active reservation request for this facility.",
            });
        }

        const conflict = await findScheduleConflict({
            facility: facilityRecord._id,
            ...schedule.values,
            statuses: ["pending", "approved"],
        });
        if (conflict) {
            return res.status(400).json({
                message: "This facility already has an overlapping reservation.",
            });
        }

        const reservation = await Reservation.create({
            user: req.user._id,
            facility: facilityRecord._id,
            ...schedule.values,
            status: "pending",
        });
        await reservation.populate("facility", FACILITY_FIELDS);

        return res.status(201).json({
            message: "Reservation request submitted successfully.",
            reservation,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create reservation." });
    }
};

const getMyReservations = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) {
            return res.status(400).json({ message: pagination.error });
        }

        const status = typeof req.query.status === "string"
            ? req.query.status.trim()
            : "";
        const type = typeof req.query.type === "string"
            ? req.query.type.trim()
            : "";
        if (status && !RESERVATION_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid reservation status." });
        }
        if (type && type !== "upcoming") {
            return res.status(400).json({ message: "Invalid reservation type." });
        }

        const filter = { user: req.user._id };
        if (type === "upcoming") {
            filter.status = { $in: ["pending", "approved"] };
            filter.reservationDate = { $gte: getManilaToday() };
        } else if (status) {
            filter.status = status;
        }

        const [reservations, totalItems] = await Promise.all([
            Reservation.find(filter)
                .populate("facility", FACILITY_FIELDS)
                .sort(type === "upcoming"
                    ? { reservationDate: 1, startTime: 1, createdAt: -1 }
                    : { createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            Reservation.countDocuments(filter),
        ]);

        return res.status(200).json({
            reservations,
            pagination: buildPagination(
                pagination.page,
                pagination.limit,
                totalItems
            ),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to fetch reservations." });
    }
};

const getGroupedMyReservations = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) {
            return res.status(400).json({ message: pagination.error });
        }

        const [result] = await Reservation.aggregate([
            { $match: { user: req.user._id } },
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $group: {
                    _id: "$facility",
                    latestReservationId: { $first: "$_id" },
                    latestCreatedAt: { $first: "$createdAt" },
                    transactionCount: { $sum: 1 },
                },
            },
            { $sort: { latestCreatedAt: -1, _id: -1 } },
            {
                $facet: {
                    groups: [
                        { $skip: pagination.skip },
                        { $limit: pagination.limit },
                    ],
                    metadata: [{ $count: "totalItems" }],
                },
            },
        ]);

        const groups = result?.groups || [];
        const latestReservations = await Reservation.find({
            _id: { $in: groups.map((group) => group.latestReservationId) },
        }).populate("facility", FACILITY_FIELDS);
        const reservationById = new Map(
            latestReservations.map((reservation) => [
                reservation._id.toString(),
                reservation,
            ])
        );
        const reservations = groups.map((group) => {
            const latestReservation = reservationById.get(
                group.latestReservationId.toString()
            );

            return {
                latestReservation,
                facilityId: group._id,
                facility: latestReservation?.facility || null,
                previousCount: Math.max(group.transactionCount - 1, 0),
            };
        });
        const totalItems = result?.metadata?.[0]?.totalItems || 0;

        return res.status(200).json({
            reservations,
            pagination: buildPagination(
                pagination.page,
                pagination.limit,
                totalItems
            ),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch grouped reservations.",
        });
    }
};

const getMyFacilityReservationHistory = async (req, res) => {
    try {
        const { facilityId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(facilityId)) {
            return res.status(400).json({ message: "Invalid facility ID." });
        }

        const reservations = await Reservation.find({
            user: req.user._id,
            facility: facilityId,
        })
            .populate("facility", FACILITY_FIELDS)
            .sort({ createdAt: -1, _id: -1 });

        return res.status(200).json({ reservations });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch facility reservation history.",
        });
    }
};

const updateReservation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid reservation ID." });
        }

        const allowedFields = ["purpose", "reservationDate", "startTime", "endTime"];
        const requestFields = Object.keys(req.body || {});
        if (
            requestFields.length === 0 ||
            requestFields.some((field) => !allowedFields.includes(field))
        ) {
            return res.status(400).json({
                message: "Only purpose, reservation date, start time, and end time can be updated.",
            });
        }

        const reservation = await Reservation.findById(id);
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found." });
        }
        if (reservation.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "You are not allowed to edit this reservation.",
            });
        }
        if (reservation.status !== "pending") {
            return res.status(400).json({
                message: "Only pending reservation requests can be edited.",
            });
        }

        const dateText = reservation.reservationDate.toISOString().slice(0, 10);
        const schedule = validateSchedule({
            purpose: req.body.purpose ?? reservation.purpose,
            reservationDate: req.body.reservationDate ?? dateText,
            startTime: req.body.startTime ?? reservation.startTime,
            endTime: req.body.endTime ?? reservation.endTime,
        });
        if (schedule.error) return res.status(400).json({ message: schedule.error });

        const facility = await Facility.findById(reservation.facility);
        if (!facility) {
            return res.status(404).json({ message: "Facility not found." });
        }
        if (facility.status !== "active") {
            return res.status(400).json({
                message: "Facility is currently unavailable for reservations.",
            });
        }

        if (await findScheduleConflict({
            facility: reservation.facility,
            ...schedule.values,
            statuses: ["pending", "approved"],
            excludeId: reservation._id,
        })) {
            return res.status(400).json({
                message: "This facility already has an overlapping reservation.",
            });
        }

        Object.assign(reservation, schedule.values);
        await reservation.save();
        await reservation.populate("facility", FACILITY_FIELDS);

        return res.status(200).json({
            message: "Reservation request updated successfully.",
            reservation,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update reservation." });
    }
};

const cancelReservation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid reservation ID." });
        }

        const reservation = await Reservation.findById(id);
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found." });
        }
        if (reservation.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "You are not allowed to cancel this reservation.",
            });
        }
        if (reservation.status !== "pending") {
            return res.status(400).json({
                message: "Only pending reservation requests can be cancelled.",
            });
        }

        reservation.status = "cancelled";
        await reservation.save();

        return res.status(200).json({
            message: "Reservation request cancelled successfully.",
            reservation,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to cancel reservation." });
    }
};

const getAllReservations = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (pagination.error) {
            return res.status(400).json({ message: pagination.error });
        }

        const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
        const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
        const statusGroups = {
            active: ["pending", "approved"],
            history: ["rejected", "cancelled", "completed"],
        };

        if (status && !RESERVATION_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid reservation status." });
        }
        if (type && !Object.hasOwn(statusGroups, type)) {
            return res.status(400).json({ message: "Invalid reservation type." });
        }

        const filter = {};
        if (status) filter.status = status;
        else if (type) filter.status = { $in: statusGroups[type] };

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");
            const [userIds, facilityIds] = await Promise.all([
                User.find({
                    role: "resident",
                    $or: [
                        { firstName: regex },
                        { middleName: regex },
                        { lastName: regex },
                        { email: regex },
                    ],
                }).distinct("_id"),
                Facility.find({
                    $or: [
                        { facilityName: regex },
                        { category: regex },
                        { location: regex },
                    ],
                }).distinct("_id"),
            ]);
            filter.$or = [
                { user: { $in: userIds } },
                { facility: { $in: facilityIds } },
                { purpose: regex },
            ];
        }

        const [reservations, totalItems] = await Promise.all([
            Reservation.find(filter)
                .populate("user", RESIDENT_FIELDS)
                .populate("facility", FACILITY_FIELDS)
                .populate("reviewedBy", "firstName lastName")
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            Reservation.countDocuments(filter),
        ]);

        return res.status(200).json({
            reservations,
            pagination: buildPagination(pagination.page, pagination.limit, totalItems),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to fetch reservations." });
    }
};

const approveReservation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid reservation ID." });
        }

        const reservation = await Reservation.findById(id);
        if (!reservation) return res.status(404).json({ message: "Reservation not found." });
        if (reservation.status !== "pending") {
            return res.status(400).json({ message: "Only pending reservations can be approved." });
        }

        const facility = await Facility.findById(reservation.facility);
        if (!facility) return res.status(404).json({ message: "Facility not found." });
        if (facility.status !== "active") {
            return res.status(400).json({ message: "Facility is currently unavailable." });
        }

        if (await findScheduleConflict({
            facility: reservation.facility,
            reservationDate: reservation.reservationDate,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            statuses: ["approved"],
            excludeId: reservation._id,
        })) {
            return res.status(400).json({
                message: "This reservation conflicts with an approved reservation.",
            });
        }

        reservation.status = "approved";
        reservation.reviewedBy = req.user._id;
        reservation.reviewedAt = new Date();
        reservation.rejectionReason = "";
        await reservation.save();

        return res.status(200).json({
            message: "Reservation approved successfully.",
            reservation,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to approve reservation." });
    }
};

const rejectReservation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid reservation ID." });
        }
        if (typeof req.body.rejectionReason !== "string" || !req.body.rejectionReason.trim()) {
            return res.status(400).json({ message: "Rejection reason is required." });
        }

        const reservation = await Reservation.findById(id);
        if (!reservation) return res.status(404).json({ message: "Reservation not found." });
        if (reservation.status !== "pending") {
            return res.status(400).json({ message: "Only pending reservations can be rejected." });
        }

        reservation.status = "rejected";
        reservation.rejectionReason = req.body.rejectionReason.trim();
        reservation.reviewedBy = req.user._id;
        reservation.reviewedAt = new Date();
        await reservation.save();

        return res.status(200).json({
            message: "Reservation rejected successfully.",
            reservation,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to reject reservation." });
    }
};

const completeReservation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid reservation ID." });
        }

        const reservation = await Reservation.findById(id);
        if (!reservation) return res.status(404).json({ message: "Reservation not found." });
        if (reservation.status !== "approved") {
            return res.status(400).json({ message: "Only approved reservations can be completed." });
        }

        reservation.status = "completed";
        reservation.completedAt = new Date();
        await reservation.save();

        return res.status(200).json({
            message: "Reservation completed successfully.",
            reservation,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to complete reservation." });
    }
};

export {
    approveReservation,
    cancelReservation,
    completeReservation,
    createReservation,
    getAllReservations,
    getGroupedMyReservations,
    getMyFacilityReservationHistory,
    getMyReservations,
    rejectReservation,
    updateReservation,
    validateSchedule,
};
