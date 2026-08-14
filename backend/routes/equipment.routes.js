import express from "express"
import { createEquipment, 
         getAllEquipment,
         getEquipmentById,
         updateEquipment,
         deleteEquipment
} from "../controllers/equipment.controller.js"
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("admin"), createEquipment)
router.get("/", authMiddleware, getAllEquipment)
router.get("/:id", authMiddleware, getEquipmentById);
router.patch("/:id", authMiddleware, roleMiddleware("admin"), updateEquipment);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteEquipment);


export default router;
