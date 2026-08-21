import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiBell, FiCheck, FiChevronDown, FiEye, FiInfo, FiLock, FiSave, FiSun } from "react-icons/fi";
import developers from "../../config/developers";
import { changePassword, getNotificationPreferences, updateNotificationPreferences } from "../../services/profileService";
import "../../css/admin/adminSettings.css";

const SettingsPageShell = ({ title, subtitle, children }) => <section className="admin-page admin-settings-subpage"><Link className="admin-settings-back" to="/admin/settings"><FiArrowLeft />Back to Settings</Link><header><h1>{title}</h1><p>{subtitle}</p></header>{children}</section>;
const Message = ({ type, children }) => <div className={`admin-settings-message ${type}`} role={type === "error" ? "alert" : "status"}>{type === "success" && <FiCheck />}<span>{children}</span></div>;

const ChangePassword = () => {
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const update = (event) => { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); setError(""); setSuccess(""); };
    const submit = async (event) => {
        event.preventDefault();
        if (submitting) return;
        if (!form.currentPassword || !form.newPassword || !form.confirmNewPassword) return setError("All password fields are required.");
        if (form.newPassword.length < 6) return setError("Password must be at least 6 characters.");
        if (form.newPassword !== form.confirmNewPassword) return setError("New passwords do not match.");
        if (form.newPassword === form.currentPassword) return setError("New password must be different from your current password.");
        setSubmitting(true); setError(""); setSuccess("");
        try { const data = await changePassword(form); setSuccess(data.message || "Password changed successfully."); setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" }); }
        catch (requestError) { setError(requestError.response?.data?.message || "Unable to change password."); }
        finally { setSubmitting(false); }
    };
    return <SettingsPageShell title="Change Password" subtitle="Update your administrator account password securely."><form className="admin-settings-content-card admin-settings-form" onSubmit={submit} noValidate><div className="admin-settings-card-heading"><span><FiLock /></span><div><h2>Password Security</h2><p>Your current password is verified by the backend before a new password is hashed and saved.</p></div></div>{error && <Message type="error">{error}</Message>}{success && <Message type="success">{success}</Message>}<label>Current Password<input type="password" name="currentPassword" value={form.currentPassword} onChange={update} autoComplete="current-password" disabled={submitting} /></label><label>New Password<input type="password" name="newPassword" value={form.newPassword} onChange={update} autoComplete="new-password" disabled={submitting} /></label><label>Confirm New Password<input type="password" name="confirmNewPassword" value={form.confirmNewPassword} onChange={update} autoComplete="new-password" disabled={submitting} /></label><div className="admin-settings-form-actions"><button className="admin-settings-primary" type="submit" disabled={submitting}><FiSave />{submitting ? "Changing..." : "Change Password"}</button></div></form></SettingsPageShell>;
};

const DEFAULT_PREFERENCES = { borrowingUpdates: true, reservationUpdates: true, announcements: true };
const Notifications = () => {
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const load = useCallback(async (signal) => { setLoading(true); setError(""); try { const data = await getNotificationPreferences(signal); setPreferences({ ...DEFAULT_PREFERENCES, ...data.notificationPreferences }); } catch (requestError) { if (!signal?.aborted) setError(requestError.response?.data?.message || "Unable to load notification preferences."); } finally { if (!signal?.aborted) setLoading(false); } }, []);
    useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => load(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [load]);
    const submit = async (event) => { event.preventDefault(); if (submitting) return; setSubmitting(true); setError(""); setSuccess(""); try { const data = await updateNotificationPreferences(preferences); setPreferences({ ...DEFAULT_PREFERENCES, ...data.notificationPreferences }); setSuccess(data.message || "Notification preferences saved successfully."); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to save notification preferences."); } finally { setSubmitting(false); } };
    const options = [["borrowingUpdates", "New borrowing requests", "Save your preference for borrowing-related administrative updates."], ["reservationUpdates", "New reservation requests", "Save your preference for reservation-related administrative updates."], ["announcements", "Administrative announcements", "Save your preference for barangay system announcements and updates."]];
    return <SettingsPageShell title="Notifications" subtitle="Manage saved administrative notification preferences."><form className="admin-settings-content-card" onSubmit={submit}><div className="admin-settings-card-heading"><span><FiBell /></span><div><h2>Notification Preferences</h2><p>These are account preferences only. SMS, push, and email notification delivery are not implemented.</p></div></div>{error && <Message type="error">{error}</Message>}{success && <Message type="success">{success}</Message>}{loading ? <div className="admin-settings-loading" role="status">Loading preferences...</div> : <div className="admin-settings-toggle-list">{options.map(([key, title, description]) => <label key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={preferences[key]} onChange={(event) => { setPreferences((current) => ({ ...current, [key]: event.target.checked })); setSuccess(""); }} disabled={submitting} /></label>)}</div>}<div className="admin-settings-form-actions"><button className="admin-settings-primary" type="submit" disabled={loading || submitting}><FiSave />{submitting ? "Saving..." : "Save Preferences"}</button></div></form></SettingsPageShell>;
};

const Appearance = () => <SettingsPageShell title="Appearance" subtitle="Review the display theme supported by the Admin Portal."><div className="admin-settings-content-card"><div className="admin-settings-card-heading"><span><FiEye /></span><div><h2>Theme</h2><p>Light is currently the only implemented Admin Portal theme.</p></div></div><div className="admin-settings-choice" aria-label="Current theme"><FiSun /><span><strong>Light</strong><small>Current Admin Portal theme</small></span><FiCheck /></div></div></SettingsPageShell>;

const GUIDE_SECTIONS = [
    ["Equipment Management", ["Add equipment with its category, quantities, status, and optional image.", "Use maintenance quantity for units that cannot currently be borrowed.", "Mark unavailable equipment inactive instead of deleting records with borrowing history."]],
    ["Borrowing Management", ["Approve or reject pending requests.", "Release approved equipment to change it to Borrowed and reduce available inventory.", "Mark borrowed equipment Returned to restore inventory.", "Closed requests remain in Borrowing History."]],
    ["Facility Management", ["Add or edit facility details, capacity, status, and optional image.", "Use active, inactive, or maintenance status.", "Facilities with reservation history cannot be deleted."]],
    ["Reservation Management", ["Approve or reject pending reservations.", "Approval checks for conflicting approved schedules.", "Mark approved reservations Completed; closed reservations remain in history."]],
    ["Resident Management", ["View registered resident details.", "Deactivate an account to block sign-in without deleting its history.", "Reactivate the account when access should be restored."]],
    ["Announcements", ["Create announcements as Draft or Published.", "Use Normal or Important priority.", "Only published announcements are visible to residents."]],
    ["Reports", ["Borrowing Reports support status and request-date filters.", "Reservation Reports support status, facility, and reservation-date filters.", "Equipment Reports summarize real inventory totals."]],
];
const HowToUse = () => <SettingsPageShell title="How to Use the Admin Portal" subtitle="Follow the administrative workflows currently supported by the system."><div className="admin-settings-guide-grid">{GUIDE_SECTIONS.map(([title, points]) => <article className="admin-settings-content-card" key={title}><h2>{title}</h2><ul>{points.map((point) => <li key={point}>{point}</li>)}</ul></article>)}</div></SettingsPageShell>;

const FAQ_ITEMS = [
    ["How do I approve a borrowing request?", "Open Borrowing Requests, find a Pending request, choose Approve, and confirm. The backend checks current equipment availability."],
    ["When should equipment be marked as borrowed?", "Use Release Equipment only when the resident actually claims an Approved request. Inventory is reduced at release time."],
    ["How do I record returned equipment?", "Find the Borrowed request and choose Mark as Returned. The backend restores the borrowed quantity to available inventory."],
    ["Why can't I delete some equipment?", "Equipment with any borrowing record is protected so history remains intact. Mark it Inactive instead."],
    ["How do I approve facility reservations?", "Open Reservations, select a Pending request, choose Approve, and confirm the action."],
    ["What happens when reservation schedules conflict?", "Approval is rejected when the same facility has an overlapping Approved reservation."],
    ["Why can't I delete a facility?", "A facility with reservation history cannot be deleted. Change its status instead."],
    ["How do I deactivate a resident account?", "Open Residents, choose Deactivate, and confirm. The account is blocked while transaction history is preserved."],
    ["What is the difference between draft and published announcements?", "Draft announcements remain Admin-only. Published announcements are available to residents."],
    ["What information appears in reports?", "Reports show backend-calculated summaries and paginated borrowing, reservation, or equipment records with supported filters."],
];
const FAQ = () => { const [openIndex, setOpenIndex] = useState(null); return <SettingsPageShell title="Admin FAQ" subtitle="Answers based on the system's current administrative behavior."><div className="admin-settings-content-card admin-settings-faq">{FAQ_ITEMS.map(([question, answer], index) => <section key={question}><button type="button" aria-expanded={openIndex === index} onClick={() => setOpenIndex((current) => current === index ? null : index)}>{question}<FiChevronDown /></button>{openIndex === index && <p>{answer}</p>}</section>)}</div></SettingsPageShell>; };

const About = () => <SettingsPageShell title="About the System" subtitle="Barangay San Rafael Borrowing and Reservation Management System"><article className="admin-settings-content-card admin-settings-about"><div className="admin-settings-card-heading"><span><FiInfo /></span><div><h2>System Purpose</h2><p>A centralized portal for managing Barangay San Rafael resources and resident requests.</p></div></div><p>The system supports real administrative workflows for barangay equipment, borrowing requests, facilities, reservations, residents, announcements, and operational reports.</p><ul>{["Equipment inventory", "Borrowing management", "Facility management", "Reservation management", "Resident accounts", "Announcements", "Administrative reports"].map((item) => <li key={item}>{item}</li>)}</ul></article></SettingsPageShell>;

const Developers = () => { const developer = developers[0]; return <SettingsPageShell title="Developers / System Creators" subtitle="Meet the developer behind the system."><article className="admin-settings-content-card"><header className="admin-developer-header"><span className="admin-developer-avatar">{developer.initials}</span><div><h2>{developer.name}</h2><p>{developer.role}</p></div></header><div className="admin-developer-project"><span>Project</span><strong>{developer.project}</strong></div><section className="admin-developer-section"><h3>About the Developer</h3><p>{developer.about}</p></section><div className="admin-developer-section admin-developer-columns"><section><h3>Responsibilities</h3><ul>{developer.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Technology Stack</h3><ul className="admin-developer-stack">{developer.technologyStack.map((item) => <li key={item}>{item}</li>)}</ul></section></div></article></SettingsPageShell>; };

export { About, Appearance, ChangePassword, Developers, FAQ, HowToUse, Notifications };
