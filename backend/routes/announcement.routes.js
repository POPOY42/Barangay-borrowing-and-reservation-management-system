import express from "express";
import {
    createAnnouncement,
    deleteAnnouncement,
    getAnnouncementById,
    getAnnouncements,
    updateAnnouncement,
} from "../controllers/announcement.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("admin"), createAnnouncement);
router.get("/", authMiddleware, getAnnouncements);
router.get("/:id", authMiddleware, getAnnouncementById);
router.patch("/:id", authMiddleware, roleMiddleware("admin"), updateAnnouncement);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteAnnouncement);

export default router;
