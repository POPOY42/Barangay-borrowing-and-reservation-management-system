import express from "express";
import {
    getAdminDashboardStats,
    getResidentDashboardStats,
} from "../controllers/dashboard.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

const router = express.Router();

router.get(
    "/admin",
    authMiddleware,
    roleMiddleware("admin"),
    getAdminDashboardStats
);

router.get(
    "/resident",
    authMiddleware,
    roleMiddleware("resident"),
    getResidentDashboardStats
);

export default router;
