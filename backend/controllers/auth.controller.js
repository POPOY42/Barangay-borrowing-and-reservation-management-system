import User from "../models/User.model";
import bcrypt from "bcrypt";
const register = async (req,res) => {
    try {
        const {
            firstName,
            middleName,
            lastName,
            email,
            password,
            confirmPassword
        } = req.body;

        const existingUser = await User.findOne({email})

        if(existingUser){
            return res.status(409).json({
                message: "Email is already registered"
            })
        }

        if(password !== confirmPassword){
            return res.status(400).json({
                message: "Password do not match"
            })
        }

        const hashedPassword = await bcrypt.hash(password,10);

        
    } 
    catch (error) {
        
    }
}