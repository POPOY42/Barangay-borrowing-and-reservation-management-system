import { useEffect, useRef, useState } from "react";
import BrandLogo from "../components/BrandLogo";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    FiBell,
    FiBookOpen,
    FiBox,
    FiCalendar,
    FiChevronDown,
    FiClipboard,
    FiGrid,
    FiLogOut,
    FiMenu,
    FiSettings,
    FiUser,
    FiX,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import "../css/resident/residentLayout.css";

const residentNavigation = [
    { label: "Dashboard", path: "/resident/dashboard", icon: FiGrid },
    { label: "Equipment", path: "/resident/equipment", icon: FiBox },
    { label: "My Borrowings", path: "/resident/borrowings", icon: FiClipboard },
    { label: "Reservations", path: "/resident/reservations", icon: FiCalendar },
    { label: "My Reservations", path: "/resident/my-reservations", icon: FiBookOpen },
    { label: "Announcements", path: "/resident/announcements", icon: FiBell },
    { label: "Profile", path: "/resident/profile", icon: FiUser },
    { label: "Settings", path: "/resident/settings", icon: FiSettings },
];

const ResidentLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef(null);
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Resident";
    const initials = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase() || "R";

    useEffect(() => {
        const closeOnPointerDown = (event) => {
            if (accountRef.current && !accountRef.current.contains(event.target)) {
                setAccountOpen(false);
            }
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setSidebarOpen(false);
                setAccountOpen(false);
            }
        };
        document.addEventListener("mousedown", closeOnPointerDown);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnPointerDown);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    const handleLogout = () => {
        logoutUser();
        navigate("/login", { replace: true });
    };

    return (
        <div className="resident-layout">
            <aside id="resident-sidebar" className={`resident-sidebar ${sidebarOpen ? "is-open" : ""}`}>
                <div className="resident-brand">
                    <BrandLogo className="resident-brand-mark" />
                    <div><strong>Barangay San Rafael</strong><span>Resident Portal</span></div>
                </div>

                <nav className="resident-navigation" aria-label="Resident navigation">
                    <span className="resident-navigation-label">Your Menu</span>
                    {residentNavigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink key={item.path} to={item.path} className={({ isActive }) => `resident-nav-link ${isActive ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
                                <Icon aria-hidden="true" />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

            </aside>

            {sidebarOpen && <button type="button" className="resident-sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

            <div className="resident-shell">
                <header className="resident-topbar">
                    <button type="button" className="resident-menu-button" aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} aria-controls="resident-sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}>
                        {sidebarOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
                    </button>
                    <div className="resident-account" ref={accountRef}>
                        <button
                            type="button"
                            className="resident-account-button"
                            aria-haspopup="menu"
                            aria-expanded={accountOpen}
                            onClick={() => setAccountOpen((open) => !open)}
                        >
                            <span className="resident-avatar">{initials}</span>
                            <span className="resident-account-details"><strong>{fullName}</strong><small>Resident</small></span>
                            <FiChevronDown className="resident-account-chevron" aria-hidden="true" />
                        </button>
                        {accountOpen && (
                            <div className="resident-account-menu" role="menu">
                                <NavLink to="/resident/profile" role="menuitem" onClick={() => setAccountOpen(false)}><FiUser aria-hidden="true" />Profile</NavLink>
                                <NavLink to="/resident/settings" role="menuitem" onClick={() => setAccountOpen(false)}><FiSettings aria-hidden="true" />Settings</NavLink>
                                <button type="button" role="menuitem" onClick={handleLogout}><FiLogOut aria-hidden="true" />Logout</button>
                            </div>
                        )}
                    </div>
                </header>
                <main className="resident-main"><Outlet /></main>
            </div>
        </div>
    );
};

export default ResidentLayout;
