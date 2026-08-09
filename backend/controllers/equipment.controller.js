import Equipment from "../models/Equipment.model.js";

const createEquipment = async (req,res) => {
    try {

        const {equipmentName, 
               category,
               description,
               totalQuantity,
               status,
               image
        } = req.body

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

        const equipment = await Equipment.create({
            equipmentName,
            category,
            description,
            totalQuantity: quantity,
            availableQuantity: quantity,
            status,
            image
        });

        return res.status(201).json({
            message: "Equipment added successfully.",
            equipment
        });

    } 

    catch (error) {
        return res.status(500).json({
            message: "failed to add equipment"
        })
    }
}



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


export {
    createEquipment,
    getAllEquipment,
    getEquipmentById
}