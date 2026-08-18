import { Routes, Route, Navigate, Link } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";

import Register from "../pages/auth/Register";
import VerifyOTP from "../pages/auth/VerifyOTP";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/Forgot-password";
import ResetPassword from "../pages/auth/Reset-Password";

import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import Borrowings from "../pages/admin/borrowings/Borrowings";
import BorrowingHistory from "../pages/admin/borrowings/BorrowingHistory";
import Reservations from "../pages/admin/reservations/Reservations";
import Equipment from "../pages/admin/equipment/Equipment";
import AddEquipment from "../pages/admin/equipment/AddEquipment";
import EditEquipment from "../pages/admin/equipment/EditEquipment";
import Residents from "../pages/admin/Residents";
import BorrowingReports from "../pages/admin/reports/BorrowingReports";
import ReservationReports from "../pages/admin/reports/ReservationReports";
import EquipmentReports from "../pages/admin/reports/EquipmentReports";
import Announcements from "../pages/admin/Announcements";
import Settings from "../pages/admin/Settings";
import Profile from "../pages/admin/Profile";
import ResidentDashboard from "../pages/resident/ResidentDashboard";

const AppRoutes = () => {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <Navigate to="/login" replace />
                }
            />

            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRole="admin">
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route
                    index
                    element={<Navigate to="dashboard" replace />}
                />

                
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="borrowings/requests" element={<Borrowings />} />
                <Route path="borrowings/history" element={<BorrowingHistory />} />
                <Route path="reservations" element={<Reservations />} />
                <Route path="equipment" element={<Equipment />} />
                <Route path="equipment/add" element={<AddEquipment />} />
                <Route path="equipment/:id/edit" element={<EditEquipment />} />
                <Route path="residents" element={<Residents />} />
                <Route path="reports/borrowings" element={<BorrowingReports />}/>
                <Route path="reports/reservations" element={<ReservationReports />}/>
                <Route path="reports/equipment" element={<EquipmentReports />}/>
                <Route path="announcements" element={<Announcements />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
            </Route>

            <Route
                path="/resident/dashboard"
                element={
                    <ProtectedRoute allowedRole="resident">
                        <ResidentDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="*"
                element={
                    <main>
                        <h1>404 - Page Not Found</h1>
                        <Link to="/login">Return to login</Link>
                    </main>
                }
            />
        </Routes>
    );
};

export default AppRoutes;
