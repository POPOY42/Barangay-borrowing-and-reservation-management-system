import Borrowing from "../models/Borrowing.model.js";
import Equipment from "../models/Equipment.model.js";
import User from "../models/User.model.js";
import Facility from "../models/Facility.model.js";
import Reservation from "../models/Reservation.model.js";
import Announcement from "../models/Announcement.model.js";

const getManilaToday = () => {
    const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

    return new Date(`${date}T00:00:00.000Z`);
};

const getResidentDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const [
            activeBorrowings,
            pendingRequests,
            upcomingReservations,
            availableEquipment,
        ] =
            await Promise.all([
                Borrowing.countDocuments({
                    user: userId,
                    status: "borrowed"
                }),
                Borrowing.countDocuments({
                    user: userId,
                    status: "pending"
                }),
                Reservation.countDocuments({
                    user: userId,
                    status: { $in: ["pending", "approved"] },
                    reservationDate: { $gte: getManilaToday() },
                }),
                Equipment.countDocuments({
                    status: "active",
                    availableQuantity: { $gt: 0 }
                }),
            ]);

        return res.status(200).json({
            activeBorrowings,
            pendingRequests,
            upcomingReservations,
            availableEquipment,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch resident dashboard statistics."
        });
    }
};

const getAdminDashboardStats = async (req, res) => {
    try {
        const [
            totalResidents,
            totalEquipment,
            availableEquipment,
            activeBorrowings,
            pendingBorrowings,
            activeFacilities,
            pendingReservations,
            activeReservations,
            publishedAnnouncements,
        ] = await Promise.all([
            User.countDocuments({ role: "resident" }),
            Equipment.countDocuments(),
            Equipment.countDocuments({ status: "active", availableQuantity: { $gt: 0 } }),
            Borrowing.countDocuments({ status: "borrowed" }),
            Borrowing.countDocuments({ status: "pending" }),
            Facility.countDocuments({ status: "active" }),
            Reservation.countDocuments({ status: "pending" }),
            Reservation.countDocuments({ status: "approved" }),
            Announcement.countDocuments({ status: "published" }),
        ]);

        return res.status(200).json({
            totalResidents,
            totalEquipment,
            availableEquipment,
            activeBorrowings,
            pendingBorrowings,
            activeFacilities,
            pendingReservations,
            activeReservations,
            publishedAnnouncements,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch admin dashboard statistics.",
        });
    }
};

export { getAdminDashboardStats, getResidentDashboardStats };
