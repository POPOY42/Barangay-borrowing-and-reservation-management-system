import express from "express";
import {
    getBorrowingReport,
    getEquipmentReport,
    getReservationReport,
} from "../controllers/report.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authMiddleware, roleMiddleware("admin"));
router.get("/borrowings", getBorrowingReport);
router.get("/reservations", getReservationReport);
router.get("/equipment", getEquipmentReport);

export default router;
