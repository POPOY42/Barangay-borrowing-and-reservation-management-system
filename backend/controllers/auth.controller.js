import User from "../models/User.model.js";
import Otp from "../models/Otp.model.js";

import sendEmail from "../services/email.service.js";
import generateOTP, { getOtpExpiration } from "../utils/generateOTP.js";

import jwt from "jsonwebtoken";

const sendVerificationOTP = async (user) => {
    const otp = generateOTP();

    const otpRecord = await Otp.create({
        user: user._id,
        otp,
        type: "email_verification",
        expiresAt: getOtpExpiration()
    });

    try {
        await sendEmail(
            user.email,
            "Barangay San Rafael email verification",
            `
                <h2>Barangay San Rafael</h2>
                <p>Borrowing and Reservation Management System</p>
                <p>Your email verification code is:</p>
                <h1>${otp}</h1>
                <p>This code will expire in <b>5 minutes</b>.</p>
                <hr>
                <p>If you did not request this, please ignore this email.</p>
            `
        );
    } catch (error) {
        await Otp.deleteOne({ _id: otpRecord._id }).catch((cleanupError) => {
            console.error("Failed to clean up an undelivered verification OTP.", {
                name: cleanupError?.name,
                message: cleanupError?.message,
            });
        });
        throw error;
    }
};

const register = async (req, res) => {
    try {
        const {
            firstName,
            middleName,
            lastName,
            email,
            password,
            confirmPassword
        } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required."
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(409).json({
                    message: "Email is already registered."
                });
            }

            const isFullRegistration =
                firstName &&
                lastName &&
                password &&
                confirmPassword;

            if (isFullRegistration) {
                if (password !== confirmPassword) {
                    return res.status(400).json({
                        message: "Passwords do not match."
                    });
                }

                existingUser.firstName = firstName;
                existingUser.middleName = middleName || "";
                existingUser.lastName = lastName;
                existingUser.password = password;

                await existingUser.save();
            }

            const existingOtp = await Otp.findOne({
                user: existingUser._id,
                type: "email_verification"
            });

            if (existingOtp) {
                const cooldownMs = 5 * 60 * 1000;

                const timeSinceCreated =
                    Date.now() - existingOtp.createdAt.getTime();

                if (timeSinceCreated < cooldownMs) {
                    const secondsLeft = Math.ceil(
                        (cooldownMs - timeSinceCreated) / 1000
                    );

                    return res.status(429).json({
                        message: `Please wait ${secondsLeft} seconds before requesting a new OTP.`
                    });
                }

                await Otp.deleteOne({
                    _id: existingOtp._id
                });

                await sendVerificationOTP(existingUser);

                return res.status(200).json({
                    message: "A new verification code has been sent to your email."
                });
            }

            await sendVerificationOTP(existingUser);

            return res.status(200).json({
                message: "OTP has been sent to your email."
            });
        }

        if (
            !firstName ||
            !lastName ||
            !password ||
            !confirmPassword
        ) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match."
            });
        }

        const newUser = new User({
            firstName,
            middleName: middleName || "",
            lastName,
            email,
            password
        });

        await newUser.save();

        await sendVerificationOTP(newUser);

        return res.status(201).json({
            message: "OTP has been sent to your email."
        });

    } catch (error) {
        console.error(error);
        if (error?.code === "EMAIL_DELIVERY_FAILED") {
            return res.status(503).json({
                message: "Unable to send verification email. Please try again."
            });
        }
        return res.status(500).json({
            message: "Failed to register account."
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
            await Otp.deleteOne({
                _id: otpRecord._id
            });

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

        await Otp.deleteOne({
            _id: otpRecord._id
        });

        return res.status(200).json({
            message: "Email verified successfully. You can now log in."
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to verify registration code."
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({ email })
            .select("+password");

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch || !user.isVerified) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (user.accountStatus === "inactive") {
            return res.status(403).json({
                message: "This account is inactive. Please contact the barangay administrator."
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to log in."
        });
    }
};  




const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required."
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "Email does not exist."
            });
        }

        const existingOtp = await Otp.findOne({
            user: user._id,
            type: "forgot_password"
        });

        if (existingOtp) {
            const cooldownMs = 5 * 60 * 1000;

            const timeSinceCreated =
                Date.now() - existingOtp.createdAt.getTime();

            if (timeSinceCreated < cooldownMs) {
                const secondsLeft = Math.ceil(
                    (cooldownMs - timeSinceCreated) / 1000
                );

                return res.status(429).json({
                    message: `Please wait ${secondsLeft} seconds before requesting another code.`
                });
            }

            await Otp.deleteOne({
                _id: existingOtp._id
            });
        }

        const otp = generateOTP();
        const otpRecord = await Otp.create({
            user: user._id,
            otp,
            type: "forgot_password",
            expiresAt: getOtpExpiration()
        });

        try {
            await sendEmail(
                user.email,
                "Barangay San Rafael password recovery code",
                `
                    <h2>Barangay San Rafael</h2>
                    <p>Borrowing and Reservation Management System</p>
                    <p>Your password recovery code is:</p>
                    <h1>${otp}</h1>
                    <p>This code will expire in <b>5 minutes</b>.</p>
                    <hr>
                    <p>If you did not request a password reset, please ignore this email.</p>
                `
            );
        } catch (error) {
            await Otp.deleteOne({ _id: otpRecord._id }).catch((cleanupError) => {
                console.error("Failed to clean up an undelivered password-reset OTP.", {
                    name: cleanupError?.name,
                    message: cleanupError?.message,
                });
            });
            throw error;
        }

        return res.status(200).json({
            message: "Password reset code has been sent to your email."
        });

    } catch (error) {
        console.error(error);
        if (error?.code === "EMAIL_DELIVERY_FAILED") {
            return res.status(503).json({
                message: "Unable to send password reset email. Please try again."
            });
        }
        return res.status(500).json({
            message: "Failed to send password reset code."
        });
    }
};


const resetPassword = async (req, res) => {
    try {
        const {
            email,
            otp,
            password,
            confirmPassword
        } = req.body;

        if (!email || !otp || !password || !confirmPassword) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters."
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired reset request."
            });
        }

        const otpRecord = await Otp.findOne({
            user: user._id,
            type: "forgot_password"
        });

        if (!otpRecord) {
            return res.status(400).json({
                message: "Reset code not found. Please request a new one."
            });
        }

        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteOne({
                _id: otpRecord._id
            });

            return res.status(400).json({
                message: "Reset code has expired. Please request a new one."
            });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({
                message: "Invalid reset code."
            });
        }

        user.password = password;

        await user.save();

        await Otp.deleteOne({
            _id: otpRecord._id
        });

        return res.status(200).json({
            message: "Password reset successfully. You can now log in."
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to reset password."
        });
    }
};
export {
    register,
    verifyRegisterOTP,
    login,
    forgotPassword,
    resetPassword
};
