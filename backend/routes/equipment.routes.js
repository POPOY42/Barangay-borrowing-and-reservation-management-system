import express from "express"
import { createEquipment, 
         getAllEquipment,
         getEquipmentById,
         updateEquipment,
         deleteEquipment
} from "../controllers/equipment.controller.js"
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import upload from "../middleware/upload.middleware.js";
const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("admin"), upload.single("image"), createEquipment)
router.get("/", authMiddleware, getAllEquipment)
router.get("/:id", authMiddleware, getEquipmentById);
router.patch("/:id", authMiddleware, roleMiddleware("admin"), upload.single("image"), updateEquipment);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteEquipment);


export default router;
