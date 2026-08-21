import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArchive, FiArrowRight, FiBell, FiCalendar, FiCheckCircle, FiClock, FiHome, FiPackage, FiUsers } from "react-icons/fi";
import { getAnnouncements } from "../../services/announcementService";
import { getAllBorrowings } from "../../services/borrowingService";
import { getAdminDashboardStats } from "../../services/dashboardService";
import { getEquipmentReport } from "../../services/reportService";
import { getAllReservations } from "../../services/reservationService";
import "../../css/admin/dashboard.css";

const STAT_CARDS = [
    ["totalResidents", "Total Residents", FiUsers, "/admin/residents"],
    ["totalEquipment", "Equipment Types", FiPackage, "/admin/equipment"],
    ["availableEquipment", "Available Equipment", FiCheckCircle, "/admin/equipment"],
    ["activeBorrowings", "Active Borrowings", FiArchive, "/admin/borrowings/requests"],
    ["pendingBorrowings", "Pending Borrowings", FiClock, "/admin/borrowings/requests"],
    ["activeFacilities", "Active Facilities", FiHome, "/admin/facilities"],
    ["pendingReservations", "Pending Reservations", FiCalendar, "/admin/reservations"],
    ["activeReservations", "Approved Reservations", FiCheckCircle, "/admin/reservations"],
    ["publishedAnnouncements", "Published Announcements", FiBell, "/admin/announcements"],
];

const formatName = (user) => [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") || "Unavailable resident";
const formatDate = (value, options = {}) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", ...options }).format(date);
};

const DashboardSection = ({ title, subtitle, path, children, loading, error, emptyMessage, onRetry, icon: Icon }) => <article className="admin-dashboard-section"><header><span className="admin-dashboard-section-icon"><Icon /></span><div><h2>{title}</h2><p>{subtitle}</p></div><Link to={path}>View All<FiArrowRight /></Link></header>{loading ? <div className="admin-dashboard-section-state" role="status">Loading...</div> : error ? <div className="admin-dashboard-section-state error" role="alert"><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div> : children || <div className="admin-dashboard-section-state">{emptyMessage}</div>}</article>;

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [details, setDetails] = useState({ borrowings: [], reservations: [], inventory: null, announcements: [] });
    const [detailsLoading, setDetailsLoading] = useState(true);
    const [detailErrors, setDetailErrors] = useState({});

    const loadStats = useCallback(async (signal) => {
        setLoading(true);
        setError("");
        try {
            setStats(await getAdminDashboardStats(signal));
        } catch (requestError) {
            if (!signal?.aborted) {
                setStats(null);
                setError(requestError.response?.data?.message || "Unable to load dashboard statistics.");
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    const loadDetails = useCallback(async (signal) => {
        setDetailsLoading(true);
        setDetailErrors({});
        const results = await Promise.allSettled([
            getAllBorrowings({ page: 1, limit: 5, type: "active", signal }),
            getAllReservations({ page: 1, limit: 5, type: "active", signal }),
            getEquipmentReport({ page: 1, limit: 1, signal }),
            getAnnouncements({ page: 1, limit: 3, signal }),
        ]);
        if (signal.aborted) return;
        const keys = ["borrowings", "reservations", "inventory", "announcements"];
        const nextDetails = { borrowings: [], reservations: [], inventory: null, announcements: [] };
        const nextErrors = {};
        results.forEach((result, index) => {
            const key = keys[index];
            if (result.status === "rejected") {
                nextErrors[key] = result.reason?.response?.data?.message || `Unable to load ${key}.`;
                return;
            }
            if (key === "borrowings") nextDetails.borrowings = Array.isArray(result.value.borrowings) ? result.value.borrowings : [];
            if (key === "reservations") nextDetails.reservations = Array.isArray(result.value.reservations) ? result.value.reservations : [];
            if (key === "inventory") nextDetails.inventory = result.value.summary || {};
            if (key === "announcements") nextDetails.announcements = Array.isArray(result.value.announcements) ? result.value.announcements : [];
        });
        setDetails(nextDetails);
        setDetailErrors(nextErrors);
        setDetailsLoading(false);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => loadStats(controller.signal), 0);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [loadStats]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => loadDetails(controller.signal), 0);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [loadDetails]);

    return (
        <section className="admin-page admin-dashboard-page">
            <header className="admin-dashboard-header">
                <h1>Admin Dashboard</h1>
                <p>Current operational totals for Barangay San Rafael.</p>
            </header>
            {loading ? (
                <div className="admin-dashboard-state" role="status"><span className="admin-dashboard-loader" aria-hidden="true" /><p>Loading dashboard statistics...</p></div>
            ) : error ? (
                <div className="admin-dashboard-state error" role="alert"><h2>Dashboard statistics could not be loaded</h2><p>{error}</p><button type="button" onClick={() => loadStats()}>Retry</button></div>
            ) : (
                <div className="admin-dashboard-grid">
                    {STAT_CARDS.map(([key, label, Icon, path]) => (
                        <Link className="admin-dashboard-card" to={path} key={key}>
                            <span className="admin-dashboard-icon" aria-hidden="true"><Icon /></span>
                            <div><strong>{Number(stats?.[key]) || 0}</strong><span>{label}</span></div>
                        </Link>
                    ))}
                </div>
            )}

            <div className="admin-dashboard-lower-grid">
                <DashboardSection title="Recent Borrowing Requests" subtitle="Newest active equipment requests" path="/admin/borrowings/requests" icon={FiArchive} loading={detailsLoading} error={detailErrors.borrowings} emptyMessage="No recent borrowing requests." onRetry={() => loadDetails(new AbortController().signal)}>
                    {details.borrowings.length > 0 && <div className="admin-dashboard-compact-list">{details.borrowings.map((item) => <div className="admin-dashboard-list-row" key={item._id}><div><strong>{formatName(item.user)}</strong><span>{item.equipment?.equipmentName || "Unavailable equipment"} · Qty {item.quantity}</span></div><div><span className={`admin-dashboard-badge ${item.status}`}>{item.status}</span><small>{formatDate(item.createdAt)}</small></div></div>)}</div>}
                </DashboardSection>
                <DashboardSection title="Recent Reservations" subtitle="Newest active facility requests" path="/admin/reservations" icon={FiCalendar} loading={detailsLoading} error={detailErrors.reservations} emptyMessage="No recent reservation requests." onRetry={() => loadDetails(new AbortController().signal)}>
                    {details.reservations.length > 0 && <div className="admin-dashboard-compact-list">{details.reservations.map((item) => <div className="admin-dashboard-list-row" key={item._id}><div><strong>{formatName(item.user)}</strong><span>{item.facility?.facilityName || "Unavailable facility"}</span></div><div><span className={`admin-dashboard-badge ${item.status}`}>{item.status}</span><small>{formatDate(item.reservationDate, { timeZone: "UTC" })} · {item.startTime}–{item.endTime}</small></div></div>)}</div>}
                </DashboardSection>
                <DashboardSection title="Inventory Overview" subtitle="Current backend-calculated unit totals" path="/admin/reports/equipment" icon={FiPackage} loading={detailsLoading} error={detailErrors.inventory} emptyMessage="No inventory summary available." onRetry={() => loadDetails(new AbortController().signal)}>
                    {details.inventory && <div className="admin-dashboard-inventory-grid">{[["totalEquipmentTypes", "Equipment Types"], ["availableUnits", "Available Units"], ["maintenanceUnits", "Maintenance Units"], ["borrowedUnits", "Borrowed Units"], ["inactiveEquipmentTypes", "Inactive Types"]].map(([key, label]) => <div key={key}><strong>{Number(details.inventory[key]) || 0}</strong><span>{label}</span></div>)}</div>}
                </DashboardSection>
                <DashboardSection title="Recent Announcements" subtitle="Latest Admin announcements" path="/admin/announcements" icon={FiBell} loading={detailsLoading} error={detailErrors.announcements} emptyMessage="No announcements available." onRetry={() => loadDetails(new AbortController().signal)}>
                    {details.announcements.length > 0 && <div className="admin-dashboard-compact-list">{details.announcements.map((item) => <div className="admin-dashboard-list-row" key={item._id}><div><strong>{item.title}</strong><span>{formatDate(item.publishedAt || item.createdAt)}</span></div><div className="admin-dashboard-badge-group"><span className={`admin-dashboard-badge ${item.status}`}>{item.status}</span><span className={`admin-dashboard-badge ${item.priority}`}>{item.priority}</span></div></div>)}</div>}
                </DashboardSection>
            </div>
        </section>
    );
};

export default AdminDashboard;
