import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiBell, FiBook, FiCode, FiEye, FiHelpCircle, FiInfo, FiLock, FiLogOut, FiMail, FiUser, FiX } from "react-icons/fi";
import BrandLogo from "../../components/BrandLogo";
import { useAuth } from "../../context/AuthContext";
import "../../css/resident/residentPages.css";
import "../../css/resident/settings.css";

const settingsItems = [
    ["Account", "Review your resident account details.", FiUser, "/resident/profile"],
    ["Change Password", "Update your account password securely.", FiLock, "/resident/settings/change-password"],
    ["Notifications", "Manage your saved update preferences.", FiBell, "/resident/settings/notifications"],
    ["Appearance", "Review the Resident Portal's supported theme.", FiEye, "/resident/settings/appearance"],
    ["How to Use the System", "Learn the borrowing and reservation process.", FiBook, "/resident/settings/how-to-use"],
    ["FAQ", "Find answers to common questions.", FiHelpCircle, "/resident/settings/faq"],
    ["Contact Barangay", "View configured barangay contact information.", FiMail, "/resident/settings/contact"],
    ["About the System", "Learn about this management system.", FiInfo, "/resident/settings/about"],
    ["Developers / System Creators", "View configured project creators and credits.", FiCode, "/resident/settings/developers"],
];

const Settings = () => {
    const { logoutUser } = useAuth();
    const navigate = useNavigate();
    const [logoutOpen, setLogoutOpen] = useState(false);

    useEffect(() => {
        if (!logoutOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setLogoutOpen(false);
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [logoutOpen]);

    const handleLogout = () => {
        logoutUser();
        navigate("/login", { replace: true });
    };

    return (
        <section className="resident-page resident-feature-page">
            <header className="resident-page-heading"><span>Preferences & Help</span><h1>Settings</h1><p>Manage your account preferences, security, and support options.</p></header>
            <div className="resident-settings-grid">
                {settingsItems.map(([title, description, Icon, path]) => (
                    <Link className="resident-settings-card" key={title} to={path}>
                        <span className="resident-settings-icon"><Icon aria-hidden="true" /></span>
                        <span><strong>{title}</strong><small>{description}</small></span>
                    </Link>
                ))}
                <button type="button" className="resident-settings-card logout" onClick={() => setLogoutOpen(true)}>
                    <span className="resident-settings-icon"><FiLogOut aria-hidden="true" /></span>
                    <span><strong>Logout</strong><small>Sign out of the Resident Portal.</small></span>
                </button>
            </div>

            {logoutOpen && (
                <div className="resident-settings-backdrop" onClick={() => setLogoutOpen(false)}>
                    <div className="resident-settings-logout-modal" role="alertdialog" aria-modal="true" aria-labelledby="settings-logout-title" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="resident-settings-modal-close" aria-label="Close logout confirmation" onClick={() => setLogoutOpen(false)}><FiX aria-hidden="true" /></button>
                        <BrandLogo className="resident-settings-logout-icon" />
                        <h2 id="settings-logout-title">Logout</h2>
                        <p>Are you sure you want to sign out?</p>
                        <div className="resident-settings-modal-actions">
                            <button type="button" onClick={() => setLogoutOpen(false)}>Cancel</button>
                            <button type="button" className="danger" onClick={handleLogout}>Logout</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default Settings;
