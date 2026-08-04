import express from "express";
import { register,
         verifyRegisterOTP,
         login
 } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/register/verify", verifyRegisterOTP);
router.post("/login", login)


export default router;