import express from "express";
import {
    getResidentById,
    getResidents,
    updateResidentStatus,
} from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/residents", authMiddleware, roleMiddleware("admin"), getResidents);
router.get("/residents/:id", authMiddleware, roleMiddleware("admin"), getResidentById);
router.patch(
    "/residents/:id/status",
    authMiddleware,
    roleMiddleware("admin"),
    updateResidentStatus
);

export default router;
