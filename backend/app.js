import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import equipmentRoutes from "./routes/equipment.routes.js"
import borrowingRoutes from "./routes/borrowing.routes.js"
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/equipment", equipmentRoutes)

export default app;