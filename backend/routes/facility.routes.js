import express from "express";
import {
    createFacility,
    deleteFacility,
    getFacilities,
    getFacilityById,
    updateFacility,
} from "../controllers/facility.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    upload.single("image"),
    createFacility
);
router.get("/", authMiddleware, getFacilities);
router.get("/:id", authMiddleware, getFacilityById);
router.patch(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    upload.single("image"),
    updateFacility
);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteFacility);

export default router;
