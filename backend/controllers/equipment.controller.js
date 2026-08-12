import Equipment from "../models/Equipment.model.js";

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

        if (totalQuantity === undefined || totalQuantity === null || totalQuantity === "") {
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

        if (status !== undefined && !["active", "inactive"].includes(status)) {
            return res.status(400).json({
                message: "Status must be either active or inactive."
            });
        }

        if (description !== undefined && typeof description !== "string") {
            return res.status(400).json({
                message: "Description must be a valid text."
            });
        }

        if (image !== undefined && typeof image !== "string") {
            return res.status(400).json({
                message: "Image must be a valid URL or path."
            });
        }

        const equipment = await Equipment.create({
            equipmentName,
            category,
            description,
            totalQuantity: quantity,
            availableQuantity: quantity,
            maintenanceQuantity: 0,
            status,
            image
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
        const equipment = await Equipment.find();

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

    } catch {
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
            (typeof equipmentName !== "string" || !equipmentName.trim())
        ) {
            return res.status(400).json({
                message: "Equipment name must be a valid text."
            });
        }

        if (
            category !== undefined &&
            (typeof category !== "string" || !category.trim())
        ) {
            return res.status(400).json({
                message: "Category must be a valid text."
            });
        }

        if (description !== undefined && typeof description !== "string") {
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
            if (totalQuantity === null || totalQuantity === "") {
                return res.status(400).json({
                    message: "Total quantity cannot be empty."
                });
            }

            parsedTotalQuantity = Number(totalQuantity);

            if (!Number.isInteger(parsedTotalQuantity) || parsedTotalQuantity < 0) {
                return res.status(400).json({
                    message: "Total quantity must be a valid whole number."
                });
            }
        }

        let parsedMaintenanceQuantity;

        if (maintenanceQuantity !== undefined) {
            if (maintenanceQuantity === null || maintenanceQuantity === "") {
                return res.status(400).json({
                    message: "Maintenance quantity cannot be empty."
                });
            }

            parsedMaintenanceQuantity = Number(maintenanceQuantity);

            if (
                !Number.isInteger(parsedMaintenanceQuantity) ||
                parsedMaintenanceQuantity < 0
            ) {
                return res.status(400).json({
                    message: "Maintenance quantity must be a valid whole number."
                });
            }
        }

        if (image !== undefined && typeof image !== "string") {
            return res.status(400).json({
                message: "Image must be a valid URL or path."
            });
        }

        const nextTotalQuantity =
            parsedTotalQuantity ?? equipment.totalQuantity;
        const nextMaintenanceQuantity =
            parsedMaintenanceQuantity ?? equipment.maintenanceQuantity ?? 0;

        if (nextMaintenanceQuantity > nextTotalQuantity) {
            return res.status(400).json({
                message: "Total quantity cannot be lower than maintenance quantity."
            });
        }

        equipment.totalQuantity = nextTotalQuantity;
        equipment.maintenanceQuantity = nextMaintenanceQuantity;
        equipment.availableQuantity =
            nextTotalQuantity - nextMaintenanceQuantity;

        if (equipmentName !== undefined) {
            equipment.equipmentName = equipmentName;
        }

        if (category !== undefined) {
            equipment.category = category;
        }

        if (description !== undefined) {
            equipment.description = description;
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

    } catch {
        return res.status(500).json({
            message: "Failed to update equipment."
        });
    }
};


export {
    createEquipment,
    getAllEquipment,
    getEquipmentById,
    updateEquipment
}
