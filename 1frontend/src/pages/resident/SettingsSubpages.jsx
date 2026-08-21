import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    FiArrowLeft,
    FiBell,
    FiBookOpen,
    FiCheck,
    FiChevronDown,
    FiEye,
    FiInfo,
    FiLock,
    FiMail,
    FiMapPin,
    FiPhone,
    FiSave,
    FiSun,
} from "react-icons/fi";
import barangayInfo from "../../config/barangayInfo";
import developers from "../../config/developers";
import {
    changePassword,
    getNotificationPreferences,
    updateNotificationPreferences,
} from "../../services/profileService";
import "../../css/resident/settings.css";

const SettingsPageShell = ({ eyebrow, title, subtitle, children }) => (
    <section className="resident-page resident-settings-subpage">
        <Link className="resident-settings-back" to="/resident/settings">
            <FiArrowLeft aria-hidden="true" />Back to Settings
        </Link>
        <header className="resident-page-heading">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </header>
        {children}
    </section>
);

const SettingsMessage = ({ type, children }) => (
    <div className={`resident-settings-message ${type}`} role={type === "error" ? "alert" : "status"}>
        {type === "success" && <FiCheck aria-hidden="true" />}
        <span>{children}</span>
    </div>
);

const ChangePassword = () => {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const updateField = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        setError("");
        setSuccess("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting) return;
        if (!form.currentPassword || !form.newPassword || !form.confirmNewPassword) {
            setError("All password fields are required.");
            return;
        }
        if (form.newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (form.newPassword !== form.confirmNewPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (form.newPassword === form.currentPassword) {
            setError("New password must be different from your current password.");
            return;
        }

        setSubmitting(true);
        setError("");
        setSuccess("");
        try {
            const data = await changePassword(form);
            setSuccess(data.message || "Password changed successfully.");
            setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to change password.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SettingsPageShell eyebrow="Account Security" title="Change Password" subtitle="Update your account password securely.">
            <form className="resident-settings-content-card resident-settings-form" onSubmit={handleSubmit} noValidate>
                <div className="resident-settings-card-heading"><span><FiLock aria-hidden="true" /></span><div><h2>Password Security</h2><p>Use at least six characters and keep your password private.</p></div></div>
                {error && <SettingsMessage type="error">{error}</SettingsMessage>}
                {success && <SettingsMessage type="success">{success}</SettingsMessage>}
                <label><span>Current Password *</span><input type="password" name="currentPassword" value={form.currentPassword} onChange={updateField} autoComplete="current-password" disabled={submitting} required /></label>
                <label><span>New Password *</span><input type="password" name="newPassword" value={form.newPassword} onChange={updateField} autoComplete="new-password" minLength="6" disabled={submitting} required /></label>
                <label><span>Confirm New Password *</span><input type="password" name="confirmNewPassword" value={form.confirmNewPassword} onChange={updateField} autoComplete="new-password" minLength="6" disabled={submitting} required /></label>
                <div className="resident-settings-form-actions"><button type="submit" disabled={submitting}><FiSave aria-hidden="true" />{submitting ? "Changing..." : "Change Password"}</button></div>
            </form>
        </SettingsPageShell>
    );
};

const DEFAULT_NOTIFICATIONS = {
    borrowingUpdates: true,
    reservationUpdates: true,
    announcements: true,
};

const Notifications = () => {
    const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATIONS);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadPreferences = useCallback(async (signal) => {
        setLoading(true);
        setError("");
        try {
            const data = await getNotificationPreferences(signal);
            setPreferences({ ...DEFAULT_NOTIFICATIONS, ...data.notificationPreferences });
        } catch (requestError) {
            if (!signal?.aborted) {
                setError(requestError.response?.data?.message || "Unable to load notification preferences.");
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => loadPreferences(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [loadPreferences]);

    const handleSave = async (event) => {
        event.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError("");
        setSuccess("");
        try {
            const data = await updateNotificationPreferences(preferences);
            setPreferences({ ...DEFAULT_NOTIFICATIONS, ...data.notificationPreferences });
            setSuccess(data.message || "Notification preferences saved successfully.");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to save notification preferences.");
        } finally {
            setSubmitting(false);
        }
    };

    const options = [
        ["borrowingUpdates", "Borrowing updates", "Save your preference for borrowing request status updates."],
        ["reservationUpdates", "Reservation updates", "Save your preference for facility reservation status updates."],
        ["announcements", "Barangay announcements", "Save your preference for published barangay notices."],
    ];

    return (
        <SettingsPageShell eyebrow="Preferences" title="Notifications" subtitle="Choose which system updates you are interested in receiving.">
            <form className="resident-settings-content-card" onSubmit={handleSave}>
                <div className="resident-settings-card-heading"><span><FiBell aria-hidden="true" /></span><div><h2>Notification Preferences</h2><p>These are saved account preferences only. SMS, push, and email delivery are not currently enabled.</p></div></div>
                {error && <SettingsMessage type="error">{error}</SettingsMessage>}
                {success && <SettingsMessage type="success">{success}</SettingsMessage>}
                {loading ? (
                    <div className="resident-settings-loading" role="status"><span aria-hidden="true" />Loading preferences...</div>
                ) : (
                    <div className="resident-settings-toggle-list">
                        {options.map(([key, title, description]) => (
                            <label key={key}>
                                <span><strong>{title}</strong><small>{description}</small></span>
                                <input type="checkbox" checked={preferences[key]} onChange={(event) => { setPreferences((current) => ({ ...current, [key]: event.target.checked })); setSuccess(""); }} disabled={submitting} />
                                <span className="resident-settings-switch" aria-hidden="true" />
                            </label>
                        ))}
                    </div>
                )}
                <div className="resident-settings-form-actions"><button type="submit" disabled={loading || submitting}><FiSave aria-hidden="true" />{submitting ? "Saving..." : "Save Preferences"}</button></div>
            </form>
        </SettingsPageShell>
    );
};

const Appearance = () => {
    const [saved, setSaved] = useState(false);

    const selectLightTheme = () => {
        localStorage.setItem("residentAppearance", "light");
        document.documentElement.dataset.residentTheme = "light";
        setSaved(true);
    };

    return (
        <SettingsPageShell eyebrow="Display Preferences" title="Appearance" subtitle="Review the display theme currently supported by the Resident Portal.">
            <div className="resident-settings-content-card">
                <div className="resident-settings-card-heading"><span><FiEye aria-hidden="true" /></span><div><h2>Theme</h2><p>Light is currently the only implemented Resident Portal theme.</p></div></div>
                {saved && <SettingsMessage type="success">Appearance preference saved.</SettingsMessage>}
                <div className="resident-settings-choice-grid single">
                    <button type="button" className="active" aria-pressed="true" onClick={selectLightTheme}><FiSun aria-hidden="true" /><span><strong>Light</strong><small>Use the current light Resident theme.</small></span><FiCheck aria-hidden="true" /></button>
                </div>
            </div>
        </SettingsPageShell>
    );
};

const workflowSections = [
    ["Borrowing Equipment", ["Open Equipment.", "Select available equipment and click Borrow.", "Enter quantity, purpose, borrow date, and return date.", "Submit the request and wait for admin approval.", "After approval, the admin releases the equipment.", "Return the equipment to complete the process as Returned."]],
    ["Facility Reservation", ["Open Reservations.", "Select an available facility and click Reserve.", "Enter the reservation date, time, and purpose.", "Submit the request and wait for admin approval.", "Approved reservations appear in My Reservations.", "Completed reservations remain available in reservation history."]],
];

const guidanceSections = [
    ["My Borrowings", "Pending requests may be edited or cancelled. Approved requests are ready for claim, Borrowed means the equipment has been released, and Returned is completed. Rejected and Cancelled requests remain in history. The All tab groups repeated equipment requests and View History shows earlier transactions."],
    ["My Reservations", "Pending reservations may be edited or cancelled. Approved reservations are confirmed, Completed reservations remain in history, and Rejected or Cancelled requests are read-only. The All tab groups repeated facility requests and View History shows earlier transactions."],
    ["Announcements", "Residents can read barangay announcements that administrators have published."],
    ["Profile", "Use Profile to review your account and update supported contact and address information."],
];

const HowToUse = () => (
    <SettingsPageShell eyebrow="Resident Guide" title="How to Use the System" subtitle="Follow the actual borrowing, reservation, and account workflows.">
        <div className="resident-settings-guide-grid">
            {workflowSections.map(([title, steps]) => <section className="resident-settings-content-card" key={title}><div className="resident-settings-card-heading"><span><FiBookOpen aria-hidden="true" /></span><div><h2>{title}</h2></div></div><ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol></section>)}
            {guidanceSections.map(([title, content]) => <section className="resident-settings-content-card resident-settings-guide-note" key={title}><h2>{title}</h2><p>{content}</p></section>)}
        </div>
    </SettingsPageShell>
);

const faqs = [
    ["How do I borrow equipment?", "Open Equipment, choose an available item, click Borrow, complete the request form, and submit it for admin approval."],
    ["Why is the Borrow button disabled?", "The equipment may be unavailable, or you already have a pending, approved, or currently borrowed request for that equipment."],
    ["Can I borrow the same equipment again?", "Yes, after the earlier request is returned, rejected, or cancelled and the equipment is still available."],
    ["How do I cancel a borrowing request?", "Open My Borrowings and use Cancel Request on a Pending request. Other statuses cannot be cancelled by a resident."],
    ["How do I reserve a facility?", "Open Reservations, select an available facility, click Reserve, enter the schedule and purpose, then submit."],
    ["Why is the Reserve button disabled?", "The facility may be unavailable, or you already have a Pending or Approved reservation for that facility."],
    ["Can I reserve the same facility again?", "You can create a new transaction after there is no Pending or Approved reservation for that facility. The requested schedule must also pass the system's conflict checks."],
    ["Can I edit a reservation?", "Only Pending reservation requests can be edited from My Reservations."],
    ["What happens if my request is rejected?", "The request remains in your history with its Rejected status and the admin's rejection reason when provided."],
    ["Where can I see previous requests?", "Use the All tab in My Borrowings or My Reservations, then select View History when previous transactions exist."],
    ["How do I update my profile?", "Open Profile from the sidebar, account menu, or Settings Account card, then choose Edit Profile."],
    ["What should I do if I forgot my password?", "Sign out if needed, open the login page, and use the existing Forgot Password process to reset it through your registered email."],
];

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);
    return (
        <SettingsPageShell eyebrow="Help Center" title="Frequently Asked Questions" subtitle="Answers based on the features currently available in the Resident Portal.">
            <div className="resident-settings-content-card resident-settings-faq-list">
                {faqs.map(([question, answer], index) => <section key={question}><button type="button" aria-expanded={openIndex === index} onClick={() => setOpenIndex((current) => current === index ? null : index)}><span>{question}</span><FiChevronDown aria-hidden="true" /></button>{openIndex === index && <p>{answer}</p>}</section>)}
            </div>
        </SettingsPageShell>
    );
};

const contactFields = [
    ["Phone", barangayInfo.phone, FiPhone],
    ["Email", barangayInfo.email, FiMail],
    ["Office Address", barangayInfo.address, FiMapPin],
    ["Office Hours", barangayInfo.officeHours, FiInfo],
];

const Contact = () => {
    const configured = contactFields.some(([, value]) => Boolean(value));
    return (
        <SettingsPageShell eyebrow="Barangay Support" title="Contact Barangay" subtitle="View official contact details when they have been configured.">
            <div className="resident-settings-content-card"><div className="resident-settings-card-heading"><span><FiMail aria-hidden="true" /></span><div><h2>{barangayInfo.name}</h2><p>{configured ? "Official contact information." : "Contact information has not been configured yet."}</p></div></div><div className="resident-settings-information-grid">{contactFields.map(([label, value, Icon]) => <div key={label}><span><Icon aria-hidden="true" /></span><div><small>{label}</small><strong>{value || "Not configured"}</strong></div></div>)}</div></div>
        </SettingsPageShell>
    );
};

const About = () => (
    <SettingsPageShell eyebrow="System Information" title="About the System" subtitle="Learn what the Barangay Resident Portal is designed to support.">
        <div className="resident-settings-content-card resident-settings-about"><div className="resident-settings-card-heading"><span><FiInfo aria-hidden="true" /></span><div><h2>Barangay San Rafael Borrowing and Reservation Management System</h2></div></div><p>The system helps residents request barangay equipment, reserve facilities, monitor request statuses, review transaction history, and view published barangay announcements.</p><h3>Main Features</h3><ul><li>Equipment Borrowing</li><li>Facility Reservations</li><li>Request Tracking</li><li>Announcements</li><li>Resident Profile</li></ul></div>
    </SettingsPageShell>
);

const Developers = () => {
    const developer = developers[0];

    return (
        <SettingsPageShell eyebrow="Project Credits" title="Developers / System Creators" subtitle="Meet the developer behind the system.">
            <article className="resident-settings-content-card resident-developer-profile">
                <header className="resident-developer-header">
                    <span className="resident-developer-avatar" aria-hidden="true">
                        {developer.initials}
                    </span>
                    <div className="resident-developer-identity">
                        <h2>{developer.name}</h2>
                        <p>{developer.role}</p>
                    </div>
                </header>

                <div className="resident-developer-project">
                    <span>Project</span>
                    <strong>{developer.project}</strong>
                </div>

                <section className="resident-developer-about">
                    <h3>About the Developer</h3>
                    <p>{developer.about}</p>
                </section>

                <div className="resident-developer-details">
                    <section>
                        <h3>Responsibilities</h3>
                        <ul className="resident-developer-responsibilities">
                            {developer.responsibilities.map((responsibility) => (
                                <li key={responsibility}>{responsibility}</li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h3>Technology Stack</h3>
                        <ul className="resident-developer-stack" aria-label="Technology stack">
                            {developer.technologyStack.map((technology) => (
                                <li key={technology}>{technology}</li>
                            ))}
                        </ul>
                    </section>
                </div>
            </article>
        </SettingsPageShell>
    );
};

export {
    About,
    Appearance,
    ChangePassword,
    Contact,
    Developers,
    FAQ,
    HowToUse,
    Notifications,
};
