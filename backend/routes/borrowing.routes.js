import express from "express";

import {
    createBorrowing,
    getMyBorrowings,
    getGroupedMyBorrowings,
    getMyEquipmentBorrowingHistory,
    updateBorrowingRequest,
    getAllBorrowings,
    approveBorrowing,
    rejectBorrowing,
    markAsBorrowed,
    markAsReturned,
    cancelBorrowing
}from "../controllers/borrowing.controller.js"

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("resident"), createBorrowing)
router.get("/", authMiddleware, roleMiddleware("resident"), getMyBorrowings)
router.get("/all", authMiddleware, roleMiddleware("admin"), getAllBorrowings)
router.get("/grouped", authMiddleware, roleMiddleware("resident"), getGroupedMyBorrowings)
router.get("/equipment/:equipmentId/history", authMiddleware, roleMiddleware("resident"), getMyEquipmentBorrowingHistory)
router.patch("/:id", authMiddleware, roleMiddleware("resident"), updateBorrowingRequest)
router.patch("/:id/approve", authMiddleware, roleMiddleware("admin"), approveBorrowing)
router.patch("/:id/reject", authMiddleware, roleMiddleware("admin"), rejectBorrowing)
router.patch("/:id/borrow", authMiddleware, roleMiddleware("admin"), markAsBorrowed)
router.patch("/:id/return", authMiddleware, roleMiddleware("admin"), markAsReturned)
router.patch("/:id/cancel", authMiddleware, roleMiddleware("resident"), cancelBorrowing)

export default router;
