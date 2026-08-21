import { useAuth } from "../../context/AuthContext";
import "../../css/admin/adminUtilityPages.css";

const Profile = () => {
    const { user } = useAuth();
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Administrator";
    const initials = [user?.firstName, user?.lastName].filter(Boolean).map((part) => part[0]).join("").toUpperCase() || "AD";

    return <section className="admin-page admin-utility-page">
        <header><h1>Profile</h1><p>Authenticated administrator account details.</p></header>
        <article className="admin-profile-card">
            <span className="admin-profile-avatar" aria-hidden="true">{initials}</span>
            <div className="admin-profile-summary"><h2>{fullName}</h2><span>Administrator</span></div>
            <dl><div><dt>First Name</dt><dd>{user?.firstName || "—"}</dd></div><div><dt>Last Name</dt><dd>{user?.lastName || "—"}</dd></div><div><dt>Email</dt><dd>{user?.email || "—"}</dd></div><div><dt>Role</dt><dd>{user?.role === "admin" ? "Administrator" : user?.role || "—"}</dd></div></dl>
            <p className="admin-profile-note">Profile editing is not available because the backend currently has no administrator profile update endpoint.</p>
        </article>
    </section>;
};

export default Profile;
