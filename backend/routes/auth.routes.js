import express from "express";
import { register,
         verifyRegisterOTP,
         login,
         forgotPassword,
         resetPassword
 } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/register/verify", verifyRegisterOTP);
router.post("/login", login)

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);



export default router;