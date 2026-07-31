    import mongoose from "mongoose";

    const UserSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, "First name is required."],
            trim: true,
        },

        middleName: {
            type: String,
            trim: true,
            default: "",
        },

        lastName: {
            type: String,
            required: [true, "Last name is required."],
            trim: true,
        },

        email: {
            type: String,
            required: [true, "Email is required."],
            unique: true,
            lowercase: true,
            trim: true,
        },

        phoneNumber: {
            type: String,
            trim: true,
        },

        houseNumber: {
            type: String,
            trim: true,
        },
        purok: {
            type: String,
            trim: true,
        },

        password: {
            type: String,
            required: [true, "Password is required."],
        },

        role: {
            type: String,
            enum: ["admin", "resident"],
            default: "resident",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },
    },
        {
        timestamps: true,
        }
    );

const User = mongoose.model("User", UserSchema);
export default User;