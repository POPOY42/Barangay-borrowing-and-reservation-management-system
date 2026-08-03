import express from "express";
import { register,
         verifyRegisterOTP
 } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/register", verifyRegisterOTP);


export default router;