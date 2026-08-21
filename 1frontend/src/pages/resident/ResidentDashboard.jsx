import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    FiArrowRight,
    FiBell,
    FiBox,
    FiCalendar,
    FiClock,
    FiClipboard,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { getAnnouncements } from "../../services/announcementService";
import { getMyBorrowings } from "../../services/borrowingService";
import { getResidentDashboardStats } from "../../services/dashboardService";
import { getMyReservations } from "../../services/reservationService";
import "../../css/resident/dashboard.css";

const formatDate = (value, withTime = false) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(date);
};

const formatTime = (value) => {
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
        return "Time unavailable";
    }
    const [hours, minutes] = value.split(":").map(Number);
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
    });
};

const getRequestError = (result) =>
    result.status === "rejected"
        ? result.reason?.response?.data?.message
        : "";

const ResidentDashboard = () => {
    const { user } = useAuth();
    const firstName = user?.firstName?.trim() || "Resident";
    const requestControllerRef = useRef(null);
    const [stats, setStats] = useState(null);
    const [recentBorrowings, setRecentBorrowings] = useState([]);
    const [upcomingReservations, setUpcomingReservations] = useState([]);
    const [latestAnnouncements, setLatestAnnouncements] = useState([]);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState("");

    const loadDashboard = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setDashboardLoading(true);
        setDashboardError("");

        const results = await Promise.allSettled([
            getResidentDashboardStats(controller.signal),
            getMyBorrowings(1, "", controller.signal, 3),
            getMyReservations({
                page: 1,
                limit: 3,
                type: "upcoming",
                signal: controller.signal,
            }),
            getAnnouncements({ page: 1, limit: 1, signal: controller.signal }),
        ]);

        if (controller.signal.aborted) return;

        const [statsResult, borrowingsResult, reservationsResult, announcementsResult] = results;
        setStats(statsResult.status === "fulfilled" ? statsResult.value : null);
        setRecentBorrowings(
            borrowingsResult.status === "fulfilled" &&
                Array.isArray(borrowingsResult.value.borrowings)
                ? borrowingsResult.value.borrowings
                : []
        );
        setUpcomingReservations(
            reservationsResult.status === "fulfilled" &&
                Array.isArray(reservationsResult.value.reservations)
                ? reservationsResult.value.reservations
                : []
        );
        setLatestAnnouncements(
            announcementsResult.status === "fulfilled" &&
                Array.isArray(announcementsResult.value.announcements)
                ? announcementsResult.value.announcements
                : []
        );

        const failedResult = results.find((result) => result.status === "rejected");
        if (failedResult) {
            setDashboardError(
                getRequestError(failedResult) ||
                    "Some dashboard information could not be loaded."
            );
        }
        setDashboardLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(loadDashboard, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [loadDashboard]);

    const countValue = (value) => {
        if (dashboardLoading) return "…";
        return stats && Number.isInteger(value) ? value : "—";
    };

    const summaryCards = [
        { label: "Active Borrowings", value: countValue(stats?.activeBorrowings), icon: FiClipboard, tone: "green" },
        { label: "Pending Requests", value: countValue(stats?.pendingRequests), icon: FiClock, tone: "amber" },
        { label: "Upcoming Reservations", value: countValue(stats?.upcomingReservations), icon: FiCalendar, tone: "blue" },
        { label: "Available Equipment", value: countValue(stats?.availableEquipment), icon: FiBox, tone: "mint" },
    ];
    const featuredAnnouncement = latestAnnouncements[0];

    return (
        <section className="resident-page resident-dashboard">
            <header className="resident-dashboard-header">
                <span className="resident-eyebrow">Resident Dashboard</span>
                <h1>Welcome back, {firstName}!</h1>
                <p>Manage your equipment requests and facility reservations in one place.</p>
            </header>

            <div className="resident-summary-grid">
                {summaryCards.map(({ label, value, icon: Icon, tone }) => (
                    <article className="resident-summary-card" key={label}>
                        <span className={`resident-summary-icon ${tone}`}><Icon aria-hidden="true" /></span>
                        <div><strong>{value}</strong><span>{label}</span></div>
                    </article>
                ))}
            </div>

            {dashboardError && (
                <div className="resident-dashboard-stats-error" role="alert">
                    <span>{dashboardError}</span>
                    <button type="button" onClick={loadDashboard}>Retry</button>
                </div>
            )}

            <section className="resident-dashboard-section">
                <div className="resident-section-heading"><div><span>Get started</span><h2>Quick Actions</h2></div></div>
                <div className="resident-quick-actions">
                    <Link to="/resident/equipment"><span className="resident-quick-icon"><FiBox aria-hidden="true" /></span><div><strong>Browse Equipment</strong><p>Find equipment available for community use.</p></div><FiArrowRight aria-hidden="true" /></Link>
                    <Link to="/resident/reservations"><span className="resident-quick-icon"><FiCalendar aria-hidden="true" /></span><div><strong>Reserve Facility</strong><p>View barangay spaces available for reservation.</p></div><FiArrowRight aria-hidden="true" /></Link>
                </div>
            </section>

            <div className="resident-dashboard-columns">
                <section className="resident-dashboard-panel">
                    <div className="resident-section-heading"><div><span>Latest activity</span><h2>Recent Borrowing Requests</h2></div><Link to="/resident/borrowings">View all</Link></div>
                    {dashboardLoading ? (
                        <div className="resident-panel-empty"><span className="resident-dashboard-loader" aria-hidden="true" /><p>Loading recent borrowings...</p></div>
                    ) : recentBorrowings.length === 0 ? (
                        <div className="resident-panel-empty"><FiClipboard aria-hidden="true" /><strong>No recent borrowings</strong><p>Your latest borrowing requests will appear here.</p></div>
                    ) : (
                        <div className="resident-dashboard-activity-list">
                            {recentBorrowings.map((borrowing) => (
                                <article key={borrowing._id}>
                                    <div><strong>{borrowing.equipment?.equipmentName || "Unavailable equipment"}</strong><span>Requested {formatDate(borrowing.createdAt, true)}</span></div>
                                    <div><span className={`resident-dashboard-status ${borrowing.status}`}>{borrowing.status}</span><small>Qty: {borrowing.quantity}</small></div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
                <section className="resident-dashboard-panel">
                    <div className="resident-section-heading"><div><span>Your schedule</span><h2>Upcoming Reservations</h2></div><Link to="/resident/my-reservations">View all</Link></div>
                    {dashboardLoading ? (
                        <div className="resident-panel-empty"><span className="resident-dashboard-loader" aria-hidden="true" /><p>Loading upcoming reservations...</p></div>
                    ) : upcomingReservations.length === 0 ? (
                        <div className="resident-panel-empty"><FiCalendar aria-hidden="true" /><strong>No recent reservations</strong><p>Your upcoming facility reservations will appear here.</p></div>
                    ) : (
                        <div className="resident-dashboard-activity-list">
                            {upcomingReservations.map((reservation) => (
                                <article key={reservation._id}>
                                    <div><strong>{reservation.facility?.facilityName || "Unavailable facility"}</strong><span>{formatDate(reservation.reservationDate)} · {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}</span></div>
                                    <span className={`resident-dashboard-status ${reservation.status}`}>{reservation.status}</span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className={`resident-announcements-panel ${featuredAnnouncement?.priority === "important" ? "important" : ""}`}>
                <div className="resident-announcement-icon"><FiBell aria-hidden="true" /></div>
                {dashboardLoading ? (
                    <div><span>Barangay Announcements</span><h2>Loading the latest announcement...</h2></div>
                ) : featuredAnnouncement ? (
                    <div>
                        <span>{featuredAnnouncement.priority === "important" ? "Important Announcement" : "Barangay Announcement"}</span>
                        <h2>{featuredAnnouncement.title}</h2>
                        <p>{featuredAnnouncement.content}</p>
                        <small>Published {formatDate(featuredAnnouncement.publishedAt)}</small>
                    </div>
                ) : (
                    <div><span>Barangay Announcements</span><h2>No announcements have been published yet</h2><p>New community news and notices will appear here.</p></div>
                )}
                <Link to="/resident/announcements">View announcements <FiArrowRight aria-hidden="true" /></Link>
            </section>
        </section>
    );
};

export default ResidentDashboard;
