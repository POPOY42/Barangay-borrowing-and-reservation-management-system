import express from "express";
import {
    approveReservation,
    cancelReservation,
    completeReservation,
    createReservation,
    getAllReservations,
    getGroupedMyReservations,
    getMyFacilityReservationHistory,
    getMyReservations,
    rejectReservation,
    updateReservation,
} from "../controllers/reservation.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/all", authMiddleware, roleMiddleware("admin"), getAllReservations);
router.post("/", authMiddleware, roleMiddleware("resident"), createReservation);
router.get("/", authMiddleware, roleMiddleware("resident"), getMyReservations);
router.get("/grouped", authMiddleware, roleMiddleware("resident"), getGroupedMyReservations);
router.get("/facility/:facilityId/history", authMiddleware, roleMiddleware("resident"), getMyFacilityReservationHistory);
router.patch("/:id/approve", authMiddleware, roleMiddleware("admin"), approveReservation);
router.patch("/:id/reject", authMiddleware, roleMiddleware("admin"), rejectReservation);
router.patch("/:id/complete", authMiddleware, roleMiddleware("admin"), completeReservation);
router.patch("/:id/cancel", authMiddleware, roleMiddleware("resident"), cancelReservation);
router.patch("/:id", authMiddleware, roleMiddleware("resident"), updateReservation);

export default router;
