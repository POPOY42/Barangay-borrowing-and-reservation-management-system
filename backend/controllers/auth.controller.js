import User from "../models/User.model.js";
import Otp from "../models/Otp.model.js";

import sendEmail from "../services/email.service.js";
import generateOTP from "../utils/generateOTP.js";

import jwt from "jsonwebtoken";

const register = async (req, res) => {
    console.log("register hit")
    try {
        const {
            firstName,
            middleName,
            lastName,
            email,
            password,
            confirmPassword
        } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {

            if (existingUser.isVerified) {
                return res.status(409).json({
                    message: "Email is already registered."
                });
            }

            const existingOtp = await Otp.findOne({
                user: existingUser._id,
                type: "email_verification"
            });

            let isResend = false;

            if (existingOtp) {
                isResend = true;

                const cooldownMs = 5 * 60 * 1000;
                const timeSinceCreated = Date.now() - existingOtp.createdAt.getTime();

                if (timeSinceCreated < cooldownMs) {
                    const secondsLeft = Math.ceil((cooldownMs - timeSinceCreated) / 1000);
                    return res.status(429).json({
                        message: `Please wait ${secondsLeft} seconds before requesting a new OTP.`
                    });
                }

                await Otp.deleteOne({ _id: existingOtp._id });
            }

            const otp = generateOTP();

            await Otp.create({
                user: existingUser._id,
                otp,
                type: "email_verification",
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });

            await sendEmail(
                existingUser.email,
                "Email Verification",
                `
                    <h2>Welcome to Barangay Borrowing System</h2>
                    <p>Your verification code is:</p>
                    <h1>${otp}</h1>
                    <p>This code will expire in <b>5 minutes</b>.</p>
                    <hr>
                    <p>If you did not request this, please ignore this email.</p>
                `
            );

            return res.status(201).json({
                message: isResend
                    ? "A new verification code has been sent to your email."
                    : "OTP has been sent to your email."
            });
        }

        const newUser = new User({
            firstName,
            middleName,
            lastName,
            email,
            password,
        });

        await newUser.save();

        const otp = generateOTP();

        await Otp.create({
            user: newUser._id,
            otp,
            type: "email_verification",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendEmail(
            newUser.email,
            "Email Verification",
            `
                <h2>Welcome to Barangay Borrowing System</h2>
                <p>Your verification code is:</p>
                <h1>${otp}</h1>
                <p>This code will expire in <b>5 minutes</b>.</p>
                <hr>
                <p>If you did not request this, please ignore this email.</p>
            `
        );

        return res.status(201).json({
            message: "OTP has been sent to your email."
        });

    } catch (error) {

        console.log(error)
        return res.status(500).json({
            message: error.message
        });
    }
};

const verifyRegisterOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required."
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: "Account is already verified."
            });
        }

        const otpRecord = await Otp.findOne({
            user: user._id,
            type: "email_verification"
        });

        if (!otpRecord) {
            return res.status(400).json({
                message: "OTP not found. Please request a new one."
            });
        }

        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                message: "OTP has expired. Please request a new one."
            });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP."
            });
        }

        user.isVerified = true;
        await user.save();

        await Otp.deleteOne({ _id: otpRecord._id });

        return res.status(200).json({
            message: "Email verified successfully. You can now log in."
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            })
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch || !user.isVerified) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        )

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            }
        });
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message
        });
    }
}

export {
    register,
    verifyRegisterOTP,
    login
};