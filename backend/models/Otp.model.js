import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["email_verification", "forgot_password"],
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
    },
    { timestamps: true }
);

otpSchema.index({ user: 1, type: 1 });

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;
