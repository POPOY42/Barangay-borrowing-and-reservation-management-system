import { Routes, Route, Navigate, Link } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";

import Register from "../pages/auth/Register";
import VerifyOTP from "../pages/auth/VerifyOTP";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/Forgot-password";
import ResetPassword from "../pages/auth/Reset-Password";

import AdminLayout from "../layouts/AdminLayout";
import ResidentLayout from "../layouts/ResidentLayout";
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
import {
    About as AdminSettingsAbout,
    Appearance as AdminSettingsAppearance,
    ChangePassword as AdminChangePassword,
    Developers as AdminSettingsDevelopers,
    FAQ as AdminSettingsFAQ,
    HowToUse as AdminSettingsHowToUse,
    Notifications as AdminSettingsNotifications,
} from "../pages/admin/SettingsSubpages";
import Facilities from "../pages/admin/Facilities";
import AddFacility from "../pages/admin/AddFacility";
import EditFacility from "../pages/admin/EditFacility";
import ResidentDashboard from "../pages/resident/ResidentDashboard";
import ResidentEquipment from "../pages/resident/Equipment";
import MyBorrowings from "../pages/resident/MyBorrowings";
import ResidentReservations from "../pages/resident/Reservations";
import MyReservations from "../pages/resident/MyReservations";
import ResidentAnnouncements from "../pages/resident/Announcements";
import ResidentProfile from "../pages/resident/Profile";
import ResidentSettings from "../pages/resident/Settings";
import {
    About as ResidentSettingsAbout,
    Appearance as ResidentSettingsAppearance,
    ChangePassword as ResidentChangePassword,
    Contact as ResidentSettingsContact,
    Developers as ResidentSettingsDevelopers,
    FAQ as ResidentSettingsFAQ,
    HowToUse as ResidentSettingsHowToUse,
    Notifications as ResidentSettingsNotifications,
} from "../pages/resident/SettingsSubpages";

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
                <Route path="facilities" element={<Facilities />} />
                <Route path="facilities/add" element={<AddFacility />} />
                <Route path="facilities/:id/edit" element={<EditFacility />} />
                <Route path="equipment" element={<Equipment />} />
                <Route path="equipment/add" element={<AddEquipment />} />
                <Route path="equipment/:id/edit" element={<EditEquipment />} />
                <Route path="residents" element={<Residents />} />
                <Route path="reports/borrowings" element={<BorrowingReports />}/>
                <Route path="reports/reservations" element={<ReservationReports />}/>
                <Route path="reports/equipment" element={<EquipmentReports />}/>
                <Route path="announcements" element={<Announcements />} />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/change-password" element={<AdminChangePassword />} />
                <Route path="settings/notifications" element={<AdminSettingsNotifications />} />
                <Route path="settings/appearance" element={<AdminSettingsAppearance />} />
                <Route path="settings/how-to-use" element={<AdminSettingsHowToUse />} />
                <Route path="settings/faq" element={<AdminSettingsFAQ />} />
                <Route path="settings/about" element={<AdminSettingsAbout />} />
                <Route path="settings/developers" element={<AdminSettingsDevelopers />} />
                <Route path="profile" element={<Profile />} />
            </Route>

            <Route
                path="/resident"
                element={
                    <ProtectedRoute allowedRole="resident">
                        <ResidentLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ResidentDashboard />} />
                <Route path="equipment" element={<ResidentEquipment />} />
                <Route path="borrowings" element={<MyBorrowings />} />
                <Route path="reservations" element={<ResidentReservations />} />
                <Route path="my-reservations" element={<MyReservations />} />
                <Route path="announcements" element={<ResidentAnnouncements />} />
                <Route path="profile" element={<ResidentProfile />} />
                <Route path="settings" element={<ResidentSettings />} />
                <Route path="settings/change-password" element={<ResidentChangePassword />} />
                <Route path="settings/notifications" element={<ResidentSettingsNotifications />} />
                <Route path="settings/appearance" element={<ResidentSettingsAppearance />} />
                <Route path="settings/how-to-use" element={<ResidentSettingsHowToUse />} />
                <Route path="settings/faq" element={<ResidentSettingsFAQ />} />
                <Route path="settings/contact" element={<ResidentSettingsContact />} />
                <Route path="settings/about" element={<ResidentSettingsAbout />} />
                <Route path="settings/developers" element={<ResidentSettingsDevelopers />} />
            </Route>

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
