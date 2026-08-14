import mongoose from "mongoose";

const borrowingSchema = new mongoose.Schema(

    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        equipment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Equipment",
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Quantity must be a whole number."
            }
        },
        purpose: {
            type: String,
            required: true,
            trim: true
        },
        borrowDate: {
            type: Date,
            required: true,
        },
        returnDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "borrowed", "returned"],
            default: "pending"
        },
        actualReturnDate: {
            type: Date,
            default: null
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

const Borrowing = mongoose.model("Borrowing", borrowingSchema);

export default Borrowing;