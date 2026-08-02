import User from "../models/User.model.js";
import bcrypt from "bcrypt";

import sendEmail from "../services/email.service.js";
import Otp from "../models/Otp.model.js";
import generateOTP from "../utils/generateOTP.js";

const register = async (req,res) => {

        console.log("REGISTER ROUTE HIT");
    try {
        const {
            firstName,
            middleName,
            lastName,
            email,
            password,
            confirmPassword
        } = req.body;

        const existingUser = await User.findOne({  email  })

        if(existingUser){
            return res.status(409).json({
                message: "Email is already registered"
            })
        }

        if(password !== confirmPassword){
            return res.status(400).json({
                message: "Passwords do not match"
            })
        }

        const hashedPassword = await bcrypt.hash(password,10);

        const newUser = new User({
            firstName,
            middleName,
            lastName,
            email,
            password: hashedPassword
        })

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

    } 
    catch (error) {
        return res.status(500).json({
            message: error.message
        })
    }
}

export {
    register,
}

