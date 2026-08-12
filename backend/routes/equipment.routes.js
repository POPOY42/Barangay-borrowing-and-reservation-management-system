import express from "express"
import { createEquipment, 
         getAllEquipment,
         getEquipmentById,
         updateEquipment
} from "../controllers/equipment.controller.js"
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("admin"), createEquipment)
router.get("/", authMiddleware, getAllEquipment)
router.get("/:id", authMiddleware, getEquipmentById);
router.patch("/:id", authMiddleware, roleMiddleware("admin"), updateEquipment);

export default router;
