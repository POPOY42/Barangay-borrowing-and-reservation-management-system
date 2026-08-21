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
            default: "",
            validate: {
                validator: (value) => !value || /^(09|\+639)\d{9}$/.test(value),
                message: "Please enter a valid PH phone number.",
            },
        },
        birthday: {
            type: Date,
            default: null,
        },
        houseNumber: {
            type: String,
            trim: true,
            default: "",
        },
        purok: {
            type: String,
            trim: true,
            default: "",
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
        accountStatus: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        notificationPreferences: {
            borrowingUpdates: {
                type: Boolean,
                default: true,
            },
            reservationUpdates: {
                type: Boolean,
                default: true,
            },
            announcements: {
                type: Boolean,
                default: true,
            },
        },
    },
    { timestamps: true }
);

UserSchema.index({ role: 1, accountStatus: 1 });

UserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;
