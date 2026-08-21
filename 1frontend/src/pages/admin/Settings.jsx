import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiBell, FiBookOpen, FiCode, FiEye, FiHelpCircle, FiInfo, FiLock, FiLogOut, FiUser, FiX } from "react-icons/fi";
import BrandLogo from "../../components/BrandLogo";
import { useAuth } from "../../context/AuthContext";
import "../../css/admin/adminSettings.css";

const SETTINGS_ITEMS = [
    ["Account", "Review your administrator account details.", FiUser, "/admin/profile"],
    ["Change Password", "Update your administrator account password securely.", FiLock, "/admin/settings/change-password"],
    ["Notifications", "Manage saved administrative notification preferences.", FiBell, "/admin/settings/notifications"],
    ["Appearance", "Review the Admin Portal's supported display theme.", FiEye, "/admin/settings/appearance"],
    ["How to Use the Admin Portal", "Learn the current administrative workflows.", FiBookOpen, "/admin/settings/how-to-use"],
    ["FAQ", "Find answers to common administrator questions.", FiHelpCircle, "/admin/settings/faq"],
    ["About the System", "Review the system's purpose and supported modules.", FiInfo, "/admin/settings/about"],
    ["Developers / System Creators", "View the project developer and technology stack.", FiCode, "/admin/settings/developers"],
];

const Settings = () => {
    const { logoutUser } = useAuth();
    const navigate = useNavigate();
    const [logoutOpen, setLogoutOpen] = useState(false);

    useEffect(() => {
        if (!logoutOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event) => { if (event.key === "Escape") setLogoutOpen(false); };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
    }, [logoutOpen]);

    const confirmLogout = () => {
        logoutUser();
        navigate("/login", { replace: true });
    };

    return <section className="admin-page admin-settings-page">
        <header className="admin-settings-heading"><span>Settings &amp; Support</span><h1>Settings</h1><p>Manage your administrator account, system preferences, and support information.</p></header>
        <div className="admin-settings-grid">
            {SETTINGS_ITEMS.map(([title, description, Icon, path]) => <Link className="admin-settings-card" to={path} key={title}><span className="admin-settings-card-icon"><Icon aria-hidden="true" /></span><span><strong>{title}</strong><small>{description}</small></span></Link>)}
            <button type="button" className="admin-settings-card logout" onClick={() => setLogoutOpen(true)}><span className="admin-settings-card-icon"><FiLogOut aria-hidden="true" /></span><span><strong>Logout</strong><small>Sign out of the Admin Portal.</small></span></button>
        </div>
        {logoutOpen && <div className="admin-settings-backdrop" onClick={() => setLogoutOpen(false)}><div className="admin-settings-logout-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-logout-title" onClick={(event) => event.stopPropagation()}><button type="button" className="admin-settings-modal-close" onClick={() => setLogoutOpen(false)} aria-label="Close logout confirmation"><FiX /></button><BrandLogo className="admin-settings-logout-icon" /><h2 id="admin-logout-title">Logout</h2><p>Are you sure you want to sign out of the Admin Portal?</p><div className="admin-settings-modal-actions"><button type="button" onClick={() => setLogoutOpen(false)}>Cancel</button><button type="button" className="danger" onClick={confirmLogout}>Logout</button></div></div></div>}
    </section>;
};

export default Settings;
