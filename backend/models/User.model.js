import mongoose from "mongoose";
import bcrypt from "bcrypt";

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
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address."],
        },
        phoneNumber: {
            type: String,
            trim: true,
            match: [/^(09|\+639)\d{9}$/, "Please enter a valid PH phone number."],
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
            minlength: [6, "Password must be at least 6 characters."],
            select: false,
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
    { timestamps: true }
);

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;