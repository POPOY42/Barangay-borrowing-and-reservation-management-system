import express from "express";
import {
    changePassword,
    getMyProfile,
    getNotificationPreferences,
    updateMyProfile,
    updateNotificationPreferences,
} from "../controllers/profile.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("resident"), getMyProfile);
router.patch("/", authMiddleware, roleMiddleware("resident"), updateMyProfile);
router.patch("/change-password", authMiddleware, roleMiddleware("resident"), changePassword);
router.get("/notifications", authMiddleware, roleMiddleware("resident"), getNotificationPreferences);
router.patch("/notifications", authMiddleware, roleMiddleware("resident"), updateNotificationPreferences);

export default router;
