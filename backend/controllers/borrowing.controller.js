import mongoose from "mongoose";
import Borrowing from "../models/Borrowing.model.js";
import Equipment from "../models/Equipment.model.js";

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

        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a valid whole number greater than 0."
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

        const equipmentData = await Equipment.findById(equipment);

        if (!equipmentData) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        if (equipmentData.status !== "active") {
            return res.status(400).json({
                message: "Equipment is currently unavailable for borrowing."
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
            message: `Your borrowing request for ${equipmentData.equipmentName} has been submitted successfully and is awaiting admin approval.`,
            borrowing
        });

    } catch {
        return res.status(500).json({
            message: "Failed to create borrowing request."
        });
    }
};


const getMyBorrowings = async (req,res) =>{
    try {
        const userId = req.user._id;

        const borrowings = await Borrowing.find({
            user: userId
        }).populate("equipment")

        return res.status(200).json({
            borrowings
        })

    } 
    catch (error) {
        return res.status(500).json({
            message: "Failed to fetch borrowing requests"
        })
    }
}

const getAllBorrowings = async (req,res) => {
    try {
        const borrowings = await Borrowing.find()
            .populate("user")
            .populate("equipment")
            .sort({ createdAt: -1 })

        return res.status(200).json({
            borrowings
        })
    }
     catch (error) {
        return res.status(500).json({
            message: "Failed to fetch borrowings"
        })
    }
}



const approveBorrowing = async (req,res) => {
    try {
        const { id } = req.params;

        const borrowing = await Borrowing.findById(id);

        if(!borrowing){
            return res.status(404).json({
                message: "Borrowing not found"
            })
        }

        if(borrowing.status !== "pending"){
            return res.status(400).json({
                message: "Only pending borrowing requests can be approved."
            })
        }

        const equipmentData = await Equipment.findById(borrowing.equipment);

        if(!equipmentData){
            return res.status(404).json({
                message: "Equipment not found"
            })
        }

        if (equipmentData.status !== "active") {
            return res.status(400).json({
                message: "Equipment is currently unavailable."
            });
        }

        if(borrowing.quantity > equipmentData.availableQuantity){
            return res.status(400).json({
                message: `Cannot approve this request. Only ${equipmentData.availableQuantity} unit(s) are currently available.`
            })
        }

        borrowing.status = "approved"
        await borrowing.save();

        return res.status(200).json({
            message: "Borrowing request approved successfully.",
            borrowing
        })
    } 
    catch (error) {
        return res.status(500).json({
            message: "Failed to approve borrowing request."
        })
    }
}


const rejectBorrowing = async (req,res) =>{
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const borrowing = await Borrowing.findById(id);

        if(!borrowing){
            return res.status(404).json({
                message: "Borrowing not found."
            })
        }

        if (borrowing.status !== "pending") {
            return res.status(400).json({
                message: "Only pending borrowing requests can be rejected."
            });
        }

        if(!rejectionReason?.trim()){
            return res.status(400).json({
                message: "Rejection reason is required."
            })
        }

        borrowing.status = "rejected";
        borrowing.rejectionReason = rejectionReason.trim();
        await borrowing.save();

        return res.status(200).json({
            message: "Borrowing request rejected successfully.",
            borrowing
        })
    } 
    catch (error) {
        return res.status(500).json({
            message: "Failed to reject borrowing request."
        })
    }
}


const markAsBorrowed = async (req,res) => {
    try {
        const { id } = req.params;

        const borrowing = await Borrowing.findById(id);

        if(!borrowing){
            return res.status(404).json({
                message: "Borrowing not found."
            })
        }

        if (borrowing.status !== "approved") {
            return res.status(400).json({
                message: "Only approved borrowing requests can be marked as borrowed."
            });
        }

        const equipmentData = await Equipment.findById(borrowing.equipment);

        if (!equipmentData) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        if (equipmentData.status !== "active") {
            return res.status(400).json({
                message: "Equipment is currently unavailable."
            });
        }

        if (borrowing.quantity > equipmentData.availableQuantity) {
            return res.status(400).json({
                message: `Only ${equipmentData.availableQuantity} unit(s) are currently available.`
            });
        }

        equipmentData.availableQuantity -= borrowing.quantity;
        borrowing.status = "borrowed";

        await equipmentData.save();
        await borrowing.save();

        return res.status(200).json({
            message: "Borrowing request approved successfully. The resident may now claim the equipment at the barangay.",
            borrowing
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to mark borrowing as borrowed."
        });
    }
}



const markAsReturned = async (req, res) => {
    try {
        const { id } = req.params;

        const borrowing = await Borrowing.findById(id);

        if (!borrowing) {
            return res.status(404).json({
                message: "Borrowing not found."
            });
        }

        if (borrowing.status !== "borrowed") {
            return res.status(400).json({
                message: "Only borrowed equipment can be marked as returned."
            });
        }

        const equipmentData = await Equipment.findById(borrowing.equipment);

        if (!equipmentData) {
            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        equipmentData.availableQuantity += borrowing.quantity;

        borrowing.status = "returned";
        borrowing.actualReturnDate = new Date();

        await equipmentData.save();
        await borrowing.save();

        return res.status(200).json({
            message: "Equipment returned successfully.",
            borrowing
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to mark borrowing as returned."
        });
    }
};



const cancelBorrowing = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const borrowing = await Borrowing.findById(id);

        if (!borrowing) {
            return res.status(404).json({
                message: "Borrowing not found."
            });
        }

        if (borrowing.user.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "You are not allowed to cancel this borrowing request."
            });
        }

        if (borrowing.status !== "pending") {
            return res.status(400).json({
                message: "Only pending borrowing requests can be cancelled."
            });
        }

        borrowing.status = "cancelled";

        await borrowing.save();

        return res.status(200).json({
            message: "Borrowing request cancelled successfully.",
            borrowing
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to cancel borrowing request."
        });
    }
};

export {
    createBorrowing,
    getMyBorrowings,
    getAllBorrowings,
    approveBorrowing,
    rejectBorrowing,
    markAsBorrowed,
    markAsReturned,
    cancelBorrowing
};