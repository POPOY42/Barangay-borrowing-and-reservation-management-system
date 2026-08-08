import { useEffect, useRef, useState } from "react";
import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";
import {
    FiBarChart2,
    FiBox,
    FiCalendar,
    FiChevronDown,
    FiChevronUp,
    FiClock,
    FiClipboard,
    FiFileText,
    FiGrid,
    FiList,
    FiPlusSquare,
    FiSettings,
    FiTag,
    FiUsers,
    FiVolume2,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import "../css/admin/adminLayout.css";

const navigationItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: FiGrid },
    {
        key: "borrowings",
        label: "Borrowings",
        pathPrefix: "/admin/borrowings",
        icon: FiClipboard,
        children: [
            {
                label: "Borrowing Requests",
                path: "/admin/borrowings/requests",
                icon: FiFileText,
            },
            {
                label: "Borrowing History",
                path: "/admin/borrowings/history",
                icon: FiClock,
            },
        ],
    },
    { label: "Reservations", path: "/admin/reservations", icon: FiCalendar },
    {
        key: "equipment",
        label: "Equipment",
        pathPrefix: "/admin/equipment",
        icon: FiBox,
        children: [
            {
                label: "All Equipment",
                path: "/admin/equipment",
                icon: FiList,
                end: true,
            },
            {
                label: "Add Equipment",
                path: "/admin/equipment/add",
                icon: FiPlusSquare,
            },
            {
                label: "Categories",
                path: "/admin/equipment/categories",
                icon: FiTag,
            },
        ],
    },
    { label: "Residents", path: "/admin/residents", icon: FiUsers },
    {
        key: "reports",
        label: "Reports",
        pathPrefix: "/admin/reports",
        icon: FiBarChart2,
        children: [
            {
                label: "Borrowing Reports",
                path: "/admin/reports/borrowings",
                icon: FiClipboard,
            },
            {
                label: "Reservation Reports",
                path: "/admin/reports/reservations",
                icon: FiCalendar,
            },
            {
                label: "Equipment Reports",
                path: "/admin/reports/equipment",
                icon: FiBox,
            },
        ],
    },
    {
        label: "Announcements",
        path: "/admin/announcements",
        icon: FiVolume2,
    },
    { label: "Settings", path: "/admin/settings", icon: FiSettings },
];

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logoutUser } = useAuth();
    const accountRef = useRef(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState(() => ({
        borrowings: location.pathname.startsWith("/admin/borrowings"),
        equipment: location.pathname.startsWith("/admin/equipment"),
        reports: location.pathname.startsWith("/admin/reports"),
    }));

    const firstName = user?.firstName?.trim() || "";
    const lastName = user?.lastName?.trim() || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Admin";
    const initials = [firstName, lastName]

        .filter(Boolean)
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase() || "A";

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (
                accountRef.current &&
                !accountRef.current.contains(event.target)
            ) {
                setAccountOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setAccountOpen(false);
                setSidebarOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleLogout = () => {
        setTimeout(() => {
            setAccountOpen(false);
            logoutUser();
            navigate("/login", { replace: true });
        }, 1200);
    };

    return (
        <div className="admin-layout">
            <aside
                id="admin-sidebar"
                className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}
            >
                <div className="admin-brand">
                    <div className="admin-brand-mark">SR</div>
                    <div>
                        <strong>Barangay San Rafael</strong>
                        <span>Admin Portal</span>
                    </div>
                </div>

                <nav className="admin-navigation" aria-label="Admin navigation">
                    <span className="admin-navigation-label">Main Menu</span>
                    <div className="admin-navigation-links">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;

                            if (item.children) {
                                const isOpen = openGroups[item.key];
                                const isActive = location.pathname.startsWith(
                                    item.pathPrefix
                                );
                                const Chevron = isOpen
                                    ? FiChevronUp
                                    : FiChevronDown;

                                return (
                                    <div className="admin-nav-group" key={item.key}>
                                        <button
                                            type="button"
                                            className={`admin-nav-link admin-nav-parent ${
                                                isActive ? "active" : ""
                                            }`}
                                            aria-expanded={isOpen}
                                            onClick={() =>
                                                setOpenGroups((groups) => ({
                                                    ...groups,
                                                    [item.key]: !groups[item.key],
                                                }))
                                            }
                                        >
                                            <Icon
                                                className="admin-nav-icon"
                                                aria-hidden="true"
                                            />
                                            <span>{item.label}</span>
                                            <Chevron
                                                className="admin-nav-chevron"
                                                aria-hidden="true"
                                            />
                                        </button>

                                        {isOpen && (
                                            <div className="admin-submenu">
                                                {item.children.map((child) => {
                                                    const ChildIcon = child.icon;

                                                    return (
                                                        <NavLink
                                                            key={child.path}
                                                            to={child.path}
                                                            end={child.end}
                                                            className={({ isActive: childActive }) =>
                                                                `admin-submenu-link ${
                                                                    childActive ? "active" : ""
                                                                }`
                                                            }
                                                            onClick={() => setSidebarOpen(false)}
                                                        >
                                                            <ChildIcon
                                                                className="admin-submenu-icon"
                                                                aria-hidden="true"
                                                            />
                                                            <span>{child.label}</span>
                                                        </NavLink>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `admin-nav-link ${isActive ? "active" : ""}`
                                    }
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Icon
                                        className="admin-nav-icon"
                                        aria-hidden="true"
                                    />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>
            </aside>

            {sidebarOpen && (
                <button
                    type="button"
                    className="admin-sidebar-overlay"
                    aria-label="Close navigation"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="admin-shell">
                <header className="admin-header">
                    <button
                        type="button"
                        className="admin-menu-button"
                        aria-label="Open navigation"
                        aria-controls="admin-sidebar"
                        aria-expanded={sidebarOpen}
                        onClick={() => setSidebarOpen((open) => !open)}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <div className="admin-account" ref={accountRef}>
                        <button
                            type="button"
                            className="admin-account-button"
                            aria-haspopup="menu"
                            aria-expanded={accountOpen}
                            onClick={() => setAccountOpen((open) => !open)}
                        >
                            <span className="admin-avatar">{initials}</span>
                            <span className="admin-account-name">{fullName}</span>
                            <span className="admin-chevron" aria-hidden="true">
                                &#9662;
                            </span>
                        </button>

                        {accountOpen && (
                            <div className="admin-account-menu" role="menu">
                                <NavLink
                                    to="/admin/profile"
                                    role="menuitem"
                                    onClick={() => setAccountOpen(false)}
                                >
                                    Profile
                                </NavLink>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main className="admin-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
