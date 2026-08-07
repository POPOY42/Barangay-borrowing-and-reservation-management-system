import { Routes, Route, Navigate } from "react-router-dom";

import Register from "../pages/auth/Register";
import VerifyOTP from "../pages/auth/VerifyOTP";
import Login from "../pages/auth/Login";

import AdminDashboard from "../pages/admin/AdminDashboard";
import ResidentDashboard from "../pages/resident/ResidentDashboard";

const AppRoutes = () => {
    return (
        <Routes>
            <Route
                path="/"
                element={<Navigate to="/login" replace />}
            />

            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/login" element={<Login />} />

            <Route
                path="/admin/dashboard"
                element={<AdminDashboard />}
            />

            <Route
                path="/resident/dashboard"
                element={<ResidentDashboard />}
            />
        </Routes>
    );
};

export default AppRoutes;