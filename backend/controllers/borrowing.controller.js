import mongoose from "mongoose";
import Borrowing from "../models/Borrowing.model.js";
import Equipment from "../models/Equipment.model.js";
import { parsePagination } from "../utils/queryHelpers.js";


const createBorrowing = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            equipment,
            quantity,
            purpose,
            borrowDate,
            returnDate
        } = req.body;

        const parsedQuantity = Number(quantity);
        const parsedBorrowDate = new Date(borrowDate);
        const parsedReturnDate = new Date(returnDate);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!equipment) {
            return res.status(400).json({
                message: "Equipment is required."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(equipment)) {
            return res.status(400).json({
                message: "Invalid equipment ID."
            });
        }

        if (
            !Number.isInteger(parsedQuantity) ||
            parsedQuantity < 1
        ) {
            return res.status(400).json({
                message:
                    "Quantity must be a valid whole number greater than 0."
            });
        }

        if (!purpose?.trim()) {
            return res.status(400).json({
                message: "Purpose is required."
            });
        }

        if (Number.isNaN(parsedBorrowDate.getTime())) {
            return res.status(400).json({
                message: "Borrow date is invalid."
            });
        }

        if (Number.isNaN(parsedReturnDate.getTime())) {
            return res.status(400).json({
                message: "Return date is invalid."
            });
        }

        if (parsedBorrowDate < today) {
            return res.status(400).json({
                message: "Borrow date cannot be in the past."
            });
        }

        if (parsedReturnDate <= parsedBorrowDate) {
            return res.status(400).json({
                message: "Return date must be after borrow date."
            });
        }

        const equipmentData =
            await Equipment.findById(equipment);

        if (!equipmentData) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        if (equipmentData.status !== "active") {
            return res.status(400).json({
                message:
                    "Equipment is currently unavailable for borrowing."
            });
        }

        if (parsedQuantity > equipmentData.availableQuantity) {
            return res.status(400).json({
                message: `Only ${equipmentData.availableQuantity} unit(s) are currently available.`
            });
        }

        const activeBorrowing = await Borrowing.findOne({
            user: userId,
            equipment,
            status: { $in: ["pending", "approved", "borrowed"] }
        });

        if (activeBorrowing) {
            return res.status(400).json({
                message:
                    "You already have an active borrowing request for this equipment."
            });
        }

        const borrowing = await Borrowing.create({
            user: userId,
            equipment,
            quantity: parsedQuantity,
            purpose: purpose.trim(),
            borrowDate: parsedBorrowDate,
            returnDate: parsedReturnDate
        });

        return res.status(201).json({
            message:
                `Your borrowing request for ${equipmentData.equipmentName} ` +
                "has been submitted successfully and is awaiting admin approval.",
            borrowing
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to create borrowing request."
        });
    }
};


const getMyBorrowings = async (req, res) => {
    try {
        const userId = req.user._id;

        const pagination = parsePagination(req.query);
        const status = req.query.status?.trim() || "";

        if (pagination.error) {
            return res.status(400).json({
                message: pagination.error
            });
        }

        const { page, limit, skip } = pagination;

        const validStatuses = [
            "pending",
            "approved",
            "rejected",
            "cancelled",
            "borrowed",
            "returned"
        ];

        if (
            status &&
            !validStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid borrowing status."
            });
        }

        const filter = {
            user: userId
        };

        if (status) {
            filter.status = status;
        }

        const [borrowings, totalItems] =
            await Promise.all([
                Borrowing.find(filter)
                    .populate("equipment")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),

                Borrowing.countDocuments(filter)
            ]);

        const totalPages =
            Math.ceil(totalItems / limit);

        return res.status(200).json({
            borrowings,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                limit
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch borrowing requests."
        });
    }
};


const getGroupedMyBorrowings = async (req, res) => {
    try {
        const userId = req.user._id;
        const pagination = parsePagination(req.query);
        if (pagination.error) {
            return res.status(400).json({
                message: pagination.error
            });
        }

        const { page, limit, skip } = pagination;
        const [result] = await Borrowing.aggregate([
            { $match: { user: userId } },
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $group: {
                    _id: "$equipment",
                    latestBorrowingId: { $first: "$_id" },
                    latestCreatedAt: { $first: "$createdAt" },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { latestCreatedAt: -1, _id: -1 } },
            {
                $facet: {
                    groups: [
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    metadata: [
                        { $count: "totalItems" }
                    ]
                }
            }
        ]);

        const groups = result?.groups || [];
        const latestBorrowings = await Borrowing.find({
            _id: { $in: groups.map((group) => group.latestBorrowingId) }
        }).populate("equipment");
        const borrowingById = new Map(
            latestBorrowings.map((borrowing) => [borrowing._id.toString(), borrowing])
        );
        const borrowings = groups.map((group) => {
            const latestBorrowing = borrowingById.get(
                group.latestBorrowingId.toString()
            );

            return {
                latestBorrowing,
                equipmentId: group._id,
                equipment: latestBorrowing?.equipment || null,
                previousCount: Math.max(group.transactionCount - 1, 0)
            };
        });
        const totalItems = result?.metadata?.[0]?.totalItems || 0;

        return res.status(200).json({
            borrowings,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalItems / limit),
                totalItems,
                limit
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch grouped borrowing requests."
        });
    }
};


const getMyEquipmentBorrowingHistory = async (req, res) => {
    try {
        const { equipmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
            return res.status(400).json({ message: "Invalid equipment ID." });
        }

        const borrowings = await Borrowing.find({
            user: req.user._id,
            equipment: equipmentId
        })
            .populate("equipment")
            .sort({ createdAt: -1, _id: -1 });

        return res.status(200).json({ borrowings });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch equipment borrowing history."
        });
    }
};


const updateBorrowingRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const allowedFields = ["quantity", "purpose", "borrowDate", "returnDate"];
        const unsupportedFields = Object.keys(req.body).filter(
            (field) => !allowedFields.includes(field)
        );

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid borrowing ID." });
        }

        if (unsupportedFields.length > 0) {
            return res.status(400).json({
                message: "Only quantity, purpose, borrow date, and return date can be updated."
            });
        }

        const borrowing = await Borrowing.findById(id);

        if (!borrowing) {
            return res.status(404).json({ message: "Borrowing not found." });
        }

        if (borrowing.user.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "You are not allowed to edit this borrowing request."
            });
        }

        if (borrowing.status !== "pending") {
            return res.status(400).json({
                message: "Only pending borrowing requests can be edited."
            });
        }

        const nextQuantity = req.body.quantity === undefined
            ? borrowing.quantity
            : Number(req.body.quantity);
        const nextPurpose = req.body.purpose === undefined
            ? borrowing.purpose
            : req.body.purpose;
        const nextBorrowDate = new Date(req.body.borrowDate ?? borrowing.borrowDate);
        const nextReturnDate = new Date(req.body.returnDate ?? borrowing.returnDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a valid whole number greater than 0."
            });
        }

        if (typeof nextPurpose !== "string" || !nextPurpose.trim()) {
            return res.status(400).json({ message: "Purpose is required." });
        }

        if (Number.isNaN(nextBorrowDate.getTime())) {
            return res.status(400).json({ message: "Borrow date is invalid." });
        }

        if (Number.isNaN(nextReturnDate.getTime())) {
            return res.status(400).json({ message: "Return date is invalid." });
        }

        if (nextBorrowDate < today) {
            return res.status(400).json({ message: "Borrow date cannot be in the past." });
        }

        if (nextReturnDate <= nextBorrowDate) {
            return res.status(400).json({
                message: "Return date must be after borrow date."
            });
        }

        const equipment = await Equipment.findById(borrowing.equipment);

        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found." });
        }

        if (equipment.status !== "active") {
            return res.status(400).json({ message: "Equipment is currently unavailable." });
        }

        if (nextQuantity > equipment.availableQuantity) {
            return res.status(400).json({
                message: `Only ${equipment.availableQuantity} unit(s) are currently available.`
            });
        }

        borrowing.quantity = nextQuantity;
        borrowing.purpose = nextPurpose.trim();
        borrowing.borrowDate = nextBorrowDate;
        borrowing.returnDate = nextReturnDate;
        await borrowing.save();

        return res.status(200).json({
            message: "Borrowing request updated successfully.",
            borrowing
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to update borrowing request."
        });
    }
};


const getAllBorrowings = async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        const status = typeof req.query.status === "string"
            ? req.query.status.trim()
            : "";
        const type = typeof req.query.type === "string"
            ? req.query.type.trim()
            : "";

        if (pagination.error) {
            return res.status(400).json({
                message: pagination.error
            });
        }

        const { page, limit, skip } = pagination;

        const validStatuses = [
            "pending",
            "approved",
            "rejected",
            "cancelled",
            "borrowed",
            "returned"
        ];

        if (
            status &&
            !validStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid borrowing status."
            });
        }

        const statusGroups = {
            active: ["pending", "approved", "borrowed"],
            history: ["returned", "rejected", "cancelled"]
        };

        if (type && !Object.hasOwn(statusGroups, type)) {
            return res.status(400).json({
                message: "Invalid borrowing type."
            });
        }

        const filter = {};

        if (status) {
            filter.status = status;
        } else if (type) {
            filter.status = { $in: statusGroups[type] };
        }

        const [borrowings, totalItems] =
            await Promise.all([
                Borrowing.find(filter)
                    .populate(
                        "user",
                        "firstName middleName lastName email phoneNumber purok houseNumber accountStatus"
                    )
                    .populate("equipment")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),

                Borrowing.countDocuments(filter)
            ]);

        const totalPages =
            Math.ceil(totalItems / limit);

        return res.status(200).json({
            borrowings,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                limit
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch borrowings."
        });
    }
};


const approveBorrowing = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid borrowing ID."
            });
        }

        const borrowing =
            await Borrowing.findById(id);

        if (!borrowing) {
            return res.status(404).json({
                message: "Borrowing not found."
            });
        }

        if (borrowing.status !== "pending") {
            return res.status(400).json({
                message:
                    "Only pending borrowing requests can be approved."
            });
        }

        const equipmentData =
            await Equipment.findById(
                borrowing.equipment
            );

        if (!equipmentData) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        if (equipmentData.status !== "active") {
            return res.status(400).json({
                message:
                    "Equipment is currently unavailable."
            });
        }

        if (
            borrowing.quantity >
            equipmentData.availableQuantity
        ) {
            return res.status(400).json({
                message:
                    `Cannot approve this request. Only ` +
                    `${equipmentData.availableQuantity} unit(s) ` +
                    "are currently available."
            });
        }

        borrowing.status = "approved";

        await borrowing.save();

        return res.status(200).json({
            message:
                "Borrowing request approved successfully. " +
                "The resident may claim the equipment at the barangay.",
            borrowing
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to approve borrowing request."
        });
    }
};


const rejectBorrowing = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid borrowing ID."
            });
        }

        const borrowing =
            await Borrowing.findById(id);

        if (!borrowing) {
            return res.status(404).json({
                message: "Borrowing not found."
            });
        }

        if (borrowing.status !== "pending") {
            return res.status(400).json({
                message:
                    "Only pending borrowing requests can be rejected."
            });
        }

        if (!rejectionReason?.trim()) {
            return res.status(400).json({
                message: "Rejection reason is required."
            });
        }

        borrowing.status = "rejected";
        borrowing.rejectionReason =
            rejectionReason.trim();

        await borrowing.save();

        return res.status(200).json({
            message:
                "Borrowing request rejected successfully.",
            borrowing
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to reject borrowing request."
        });
    }
};


const markAsBorrowed = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid borrowing ID."
            });
        }

        const borrowing =
            await Borrowing.findById(id);

        if (!borrowing) {
            return res.status(404).json({
                message: "Borrowing not found."
            });
        }

        if (borrowing.status !== "approved") {
            return res.status(400).json({
                message:
                    "Only approved borrowing requests can be marked as borrowed."
            });
        }

        const equipmentData =
            await Equipment.findById(
                borrowing.equipment
            );

        if (!equipmentData) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        if (equipmentData.status !== "active") {
            return res.status(400).json({
                message:
                    "Equipment is currently unavailable."
            });
        }

        if (
            borrowing.quantity >
            equipmentData.availableQuantity
        ) {
            return res.status(400).json({
                message:
                    `Cannot release this equipment. Only ` +
                    `${equipmentData.availableQuantity} unit(s) ` +
                    "are currently available."
            });
        }

        equipmentData.availableQuantity -=
            borrowing.quantity;

        borrowing.status = "borrowed";

        await equipmentData.save();
        await borrowing.save();

        return res.status(200).json({
            message:
                "Equipment has been released to the resident successfully.",
            borrowing
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                "Failed to mark borrowing as borrowed."
        });
    }
};


const markAsReturned = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid borrowing ID."
            });
        }

        const borrowing =
            await Borrowing.findById(id);

        if (!borrowing) {
            return res.status(404).json({
                message: "Borrowing not found."
            });
        }

        if (borrowing.status !== "borrowed") {
            return res.status(400).json({
                message:
                    "Only borrowed equipment can be marked as returned."
            });
        }

        const equipmentData =
            await Equipment.findById(
                borrowing.equipment
            );

        if (!equipmentData) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        equipmentData.availableQuantity +=
            borrowing.quantity;

        borrowing.status = "returned";
        borrowing.actualReturnDate =
            new Date();

        await equipmentData.save();
        await borrowing.save();

        return res.status(200).json({
            message:
                "Equipment returned successfully.",
            borrowing
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                "Failed to mark borrowing as returned."
        });
    }
};


const cancelBorrowing = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid borrowing ID."
            });
        }

        const borrowing =
            await Borrowing.findById(id);

        if (!borrowing) {
            return res.status(404).json({
                message: "Borrowing not found."
            });
        }

        if (
            borrowing.user.toString() !==
            userId.toString()
        ) {
            return res.status(403).json({
                message:
                    "You are not allowed to cancel this borrowing request."
            });
        }

        if (borrowing.status !== "pending") {
            return res.status(400).json({
                message:
                    "Only pending borrowing requests can be cancelled."
            });
        }

        borrowing.status = "cancelled";

        await borrowing.save();

        return res.status(200).json({
            message:
                "Borrowing request cancelled successfully.",
            borrowing
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                "Failed to cancel borrowing request."
        });
    }
};


export {
    createBorrowing,
    getMyBorrowings,
    getGroupedMyBorrowings,
    getMyEquipmentBorrowingHistory,
    updateBorrowingRequest,
    getAllBorrowings,
    approveBorrowing,
    rejectBorrowing,
    markAsBorrowed,
    markAsReturned,
    cancelBorrowing
};
