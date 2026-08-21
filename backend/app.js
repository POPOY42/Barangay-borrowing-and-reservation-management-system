import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import equipmentRoutes from "./routes/equipment.routes.js"
import borrowingRoutes from "./routes/borrowing.routes.js"
import dashboardRoutes from "./routes/dashboard.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import facilityRoutes from "./routes/facility.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import userRoutes from "./routes/user.routes.js";
import reportRoutes from "./routes/report.routes.js";
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/equipment", equipmentRoutes)
app.use("/api/borrowing", borrowingRoutes)
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error?.name === "MulterError") {
        return res.status(400).json({ message: "Invalid image upload." });
    }

    if (error?.message === "Only JPG, PNG, and WEBP images are allowed.") {
        return res.status(400).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: "An unexpected server error occurred." });
});

export default app;
