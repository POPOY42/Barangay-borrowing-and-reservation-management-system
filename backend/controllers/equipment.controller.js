import mongoose from "mongoose";
import Equipment from "../models/Equipment.model.js";
import Borrowing from "../models/Borrowing.model.js";


const createEquipment = async (req, res) => {
    try {
        const {
            equipmentName,
            category,
            description,
            totalQuantity,
            status,
            image
        } = req.body;

        if (Object.hasOwn(req.body, "availableQuantity")) {
            return res.status(400).json({
                message: "Available quantity is managed by the system."
            });
        }

        if (Object.hasOwn(req.body, "maintenanceQuantity")) {
            return res.status(400).json({
                message: "New equipment must start with zero units under maintenance."
            });
        }

        if (!equipmentName?.trim()) {
            return res.status(400).json({
                message: "Equipment name is required."
            });
        }

        if (!category?.trim()) {
            return res.status(400).json({
                message: "Category is required."
            });
        }

        if (
            totalQuantity === undefined ||
            totalQuantity === null ||
            totalQuantity === ""
        ) {
            return res.status(400).json({
                message: "Total quantity is required."
            });
        }

        const quantity = Number(totalQuantity);

        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({
                message: "Total quantity must be a valid whole number."
            });
        }

        if (
            status !== undefined &&
            !["active", "inactive"].includes(status)
        ) {
            return res.status(400).json({
                message: "Status must be either active or inactive."
            });
        }

        if (
            description !== undefined &&
            typeof description !== "string"
        ) {
            return res.status(400).json({
                message: "Description must be a valid text."
            });
        }

        if (
            image !== undefined &&
            typeof image !== "string"
        ) {
            return res.status(400).json({
                message: "Image must be a valid URL or path."
            });
        }

        const equipment = await Equipment.create({
            equipmentName: equipmentName.trim(),
            category: category.trim(),
            description: description?.trim() || "",
            totalQuantity: quantity,
            availableQuantity: quantity,
            maintenanceQuantity: 0,
            status: status ?? "active",
            image: image ?? ""
        });

        return res.status(201).json({
            message: "Equipment added successfully.",
            equipment
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to add equipment."
        });
    }
};


const getAllEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.find()
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Equipment retrieved successfully.",
            equipment
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to retrieve equipment."
        });
    }
};


const getEquipmentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid equipment ID."
            });
        }

        const equipment = await Equipment.findById(id);

        if (!equipment) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        return res.status(200).json({
            message: "Equipment retrieved successfully.",
            equipment
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to retrieve equipment."
        });
    }
};


const updateEquipment = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            equipmentName,
            category,
            description,
            totalQuantity,
            maintenanceQuantity,
            status,
            image
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid equipment ID."
            });
        }

        if (Object.hasOwn(req.body, "availableQuantity")) {
            return res.status(400).json({
                message: "Available quantity is managed by the system."
            });
        }

        const equipment = await Equipment.findById(id);

        if (!equipment) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        if (
            equipmentName !== undefined &&
            (
                typeof equipmentName !== "string" ||
                !equipmentName.trim()
            )
        ) {
            return res.status(400).json({
                message: "Equipment name must be a valid text."
            });
        }

        if (
            category !== undefined &&
            (
                typeof category !== "string" ||
                !category.trim()
            )
        ) {
            return res.status(400).json({
                message: "Category must be a valid text."
            });
        }

        if (
            description !== undefined &&
            typeof description !== "string"
        ) {
            return res.status(400).json({
                message: "Description must be a valid text."
            });
        }

        if (status !== undefined) {
            const validStatuses = ["active", "inactive"];

            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Status must be either active or inactive."
                });
            }
        }

        let parsedTotalQuantity;

        if (totalQuantity !== undefined) {
            if (
                totalQuantity === null ||
                totalQuantity === ""
            ) {
                return res.status(400).json({
                    message: "Total quantity cannot be empty."
                });
            }

            parsedTotalQuantity = Number(totalQuantity);

            if (
                !Number.isInteger(parsedTotalQuantity) ||
                parsedTotalQuantity < 0
            ) {
                return res.status(400).json({
                    message: "Total quantity must be a valid whole number."
                });
            }
        }

        let parsedMaintenanceQuantity;

        if (maintenanceQuantity !== undefined) {
            if (
                maintenanceQuantity === null ||
                maintenanceQuantity === ""
            ) {
                return res.status(400).json({
                    message: "Maintenance quantity cannot be empty."
                });
            }

            parsedMaintenanceQuantity =
                Number(maintenanceQuantity);

            if (
                !Number.isInteger(parsedMaintenanceQuantity) ||
                parsedMaintenanceQuantity < 0
            ) {
                return res.status(400).json({
                    message: "Maintenance quantity must be a valid whole number."
                });
            }
        }

        if (
            image !== undefined &&
            typeof image !== "string"
        ) {
            return res.status(400).json({
                message: "Image must be a valid URL or path."
            });
        }

        const borrowedRecords = await Borrowing.find({
            equipment: equipment._id,
            status: "borrowed"
        }).select("quantity");

        const borrowedQuantity = borrowedRecords.reduce(
            (total, borrowing) => {
                return total + borrowing.quantity;
            },
            0
        );

        const nextTotalQuantity =
            parsedTotalQuantity ??
            equipment.totalQuantity;

        const nextMaintenanceQuantity =
            parsedMaintenanceQuantity ??
            equipment.maintenanceQuantity ??
            0;

        if (
            nextMaintenanceQuantity + borrowedQuantity >
            nextTotalQuantity
        ) {
            return res.status(400).json({
                message:
                    "Total quantity cannot be lower than the combined borrowed and maintenance quantities."
            });
        }

        const nextAvailableQuantity =
            nextTotalQuantity -
            nextMaintenanceQuantity -
            borrowedQuantity;

        equipment.totalQuantity =
            nextTotalQuantity;

        equipment.maintenanceQuantity =
            nextMaintenanceQuantity;

        equipment.availableQuantity =
            nextAvailableQuantity;

        if (equipmentName !== undefined) {
            equipment.equipmentName =
                equipmentName.trim();
        }

        if (category !== undefined) {
            equipment.category =
                category.trim();
        }

        if (description !== undefined) {
            equipment.description =
                description.trim();
        }

        if (status !== undefined) {
            equipment.status = status;
        }

        if (image !== undefined) {
            equipment.image = image;
        }

        await equipment.save();

        return res.status(200).json({
            message: "Equipment updated successfully.",
            equipment
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to update equipment."
        });
    }
};


const deleteEquipment = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid equipment ID."
            });
        }

        const equipment = await Equipment.findById(id);

        if (!equipment) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        const existingBorrowing =
            await Borrowing.findOne({
                equipment: equipment._id
            });

        if (existingBorrowing) {
            return res.status(400).json({
                message:
                    "Equipment cannot be deleted because it already has borrowing records."
            });
        }

        await equipment.deleteOne();

        return res.status(200).json({
            message: "Equipment deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete equipment."
        });
    }
};


export {
    createEquipment,
    getAllEquipment,
    getEquipmentById,
    updateEquipment,
    deleteEquipment
};