import { useCallback, useEffect, useState } from "react";
import {
    FiCalendar,
    FiEdit2,
    FiHash,
    FiHome,
    FiMail,
    FiMapPin,
    FiPhone,
    FiShield,
    FiUser,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import {
    getMyProfile,
    updateMyProfile,
} from "../../services/profileService";
import "../../css/resident/residentPages.css";

const EMPTY_FORM = {
    phoneNumber: "",
    birthday: "",
    houseNumber: "",
    purok: "",
};

const birthdayInputValue = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const profileForm = (user) => ({
    phoneNumber: user?.phoneNumber || "",
    birthday: birthdayInputValue(user?.birthday),
    houseNumber: user?.houseNumber || "",
    purok: user?.purok || "",
});

const displayBirthday = (value) => {
    if (!value) return "Not provided";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not provided";

    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    }).format(date);
};

const getToday = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
};

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState(EMPTY_FORM);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const today = getToday();

    const loadProfile = useCallback(async (signal) => {
        setLoading(true);
        setError("");

        try {
            const data = await getMyProfile(signal);
            if (data.user) updateUser(data.user);
        } catch (requestError) {
            if (!signal?.aborted) {
                setError(
                    requestError.response?.data?.message ||
                        "Unable to load the latest profile information."
                );
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [updateUser]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => loadProfile(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [loadProfile]);

    const fullName = [user?.firstName, user?.middleName, user?.lastName]
        .filter(Boolean)
        .join(" ") || "Resident";
    const initials = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .map((name) => name.charAt(0).toUpperCase())
        .join("") || "R";

    const startEditing = () => {
        setForm(profileForm(user));
        setError("");
        setSuccess("");
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setForm(profileForm(user));
        setError("");
        setIsEditing(false);
    };

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const validateForm = () => {
        const phoneNumber = form.phoneNumber.trim();
        if (phoneNumber && !/^(09|\+639)\d{9}$/.test(phoneNumber)) {
            return "Please enter a valid PH phone number.";
        }
        if (form.birthday && form.birthday > today) {
            return "Birthday cannot be in the future.";
        }
        return "";
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        if (submitting) return;

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const data = await updateMyProfile({
                phoneNumber: form.phoneNumber.trim(),
                birthday: form.birthday,
                houseNumber: form.houseNumber.trim(),
                purok: form.purok.trim(),
            });
            if (data.user) updateUser(data.user);
            setSuccess(data.message || "Profile updated successfully.");
            setIsEditing(false);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to save your profile changes."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="resident-page resident-feature-page resident-profile-page">
            <header className="resident-page-heading">
                <span>Your Account</span>
                <h1>Profile</h1>
                <p>Review and maintain your resident contact information.</p>
            </header>

            {error && !isEditing && (
                <div className="resident-profile-message error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => loadProfile()}>Retry</button>
                </div>
            )}
            {success && (
                <div className="resident-profile-message success" role="status">
                    {success}
                </div>
            )}

            <form className="resident-profile-card" onSubmit={saveProfile}>
                <div className="resident-profile-summary">
                    <span className="resident-profile-avatar" aria-hidden="true">
                        {initials}
                    </span>
                    <div className="resident-profile-name">
                        <h2>{fullName}</h2>
                        <span>Resident</span>
                        <small>{user?.email || "Not provided"}</small>
                    </div>
                    {!isEditing && (
                        <button
                            type="button"
                            className="resident-profile-edit-button"
                            onClick={startEditing}
                            disabled={loading}
                        >
                            <FiEdit2 aria-hidden="true" />
                            Edit Profile
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="resident-profile-loading" role="status">
                        <span aria-hidden="true" />
                        Loading profile information...
                    </div>
                ) : (
                    <>
                        {error && isEditing && (
                            <div className="resident-profile-form-error" role="alert">
                                {error}
                            </div>
                        )}

                        <section className="resident-profile-section">
                            <div className="resident-profile-section-heading">
                                <span><FiUser aria-hidden="true" /></span>
                                <div>
                                    <h3>Personal Information</h3>
                                    <p>Your verified identity and contact details.</p>
                                </div>
                            </div>
                            <div className="resident-profile-information-grid">
                                <div className="resident-profile-information-item">
                                    <span className="resident-profile-field-icon"><FiUser aria-hidden="true" /></span>
                                    <div><span>Full Name</span><strong>{fullName}</strong></div>
                                </div>
                                <div className="resident-profile-information-item">
                                    <span className="resident-profile-field-icon"><FiMail aria-hidden="true" /></span>
                                    <div><span>Email</span><strong>{user?.email || "Not provided"}</strong></div>
                                </div>
                                <div className="resident-profile-information-item">
                                    <span className="resident-profile-field-icon"><FiPhone aria-hidden="true" /></span>
                                    <div>
                                        <label htmlFor="resident-profile-phone">Phone Number</label>
                                        {isEditing ? (
                                            <input
                                                id="resident-profile-phone"
                                                type="tel"
                                                maxLength="13"
                                                placeholder="09XXXXXXXXX"
                                                value={form.phoneNumber}
                                                onChange={(event) => updateField("phoneNumber", event.target.value)}
                                                disabled={submitting}
                                            />
                                        ) : <strong>{user?.phoneNumber || "Not provided"}</strong>}
                                    </div>
                                </div>
                                <div className="resident-profile-information-item">
                                    <span className="resident-profile-field-icon"><FiCalendar aria-hidden="true" /></span>
                                    <div>
                                        <label htmlFor="resident-profile-birthday">Birthday</label>
                                        {isEditing ? (
                                            <input
                                                id="resident-profile-birthday"
                                                type="date"
                                                max={today}
                                                value={form.birthday}
                                                onChange={(event) => updateField("birthday", event.target.value)}
                                                disabled={submitting}
                                            />
                                        ) : <strong>{displayBirthday(user?.birthday)}</strong>}
                                    </div>
                                </div>
                                <div className="resident-profile-information-item">
                                    <span className="resident-profile-field-icon"><FiShield aria-hidden="true" /></span>
                                    <div><span>Account Role</span><strong>Resident</strong></div>
                                </div>
                            </div>
                        </section>

                        <section className="resident-profile-section">
                            <div className="resident-profile-section-heading">
                                <span><FiMapPin aria-hidden="true" /></span>
                                <div>
                                    <h3>Address Information</h3>
                                    <p>Your location within the barangay.</p>
                                </div>
                            </div>
                            <div className="resident-profile-information-grid">
                                <div className="resident-profile-information-item">
                                    <span className="resident-profile-field-icon"><FiHome aria-hidden="true" /></span>
                                    <div>
                                        <label htmlFor="resident-profile-house">House Number</label>
                                        {isEditing ? (
                                            <input
                                                id="resident-profile-house"
                                                type="text"
                                                maxLength="50"
                                                value={form.houseNumber}
                                                onChange={(event) => updateField("houseNumber", event.target.value)}
                                                disabled={submitting}
                                            />
                                        ) : <strong>{user?.houseNumber || "Not provided"}</strong>}
                                    </div>
                                </div>
                                <div className="resident-profile-information-item">
                                    <span className="resident-profile-field-icon"><FiHash aria-hidden="true" /></span>
                                    <div>
                                        <label htmlFor="resident-profile-purok">Purok</label>
                                        {isEditing ? (
                                            <input
                                                id="resident-profile-purok"
                                                type="text"
                                                maxLength="100"
                                                placeholder="e.g. Purok 3"
                                                value={form.purok}
                                                onChange={(event) => updateField("purok", event.target.value)}
                                                disabled={submitting}
                                            />
                                        ) : <strong>{user?.purok || "Not provided"}</strong>}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {isEditing && (
                            <div className="resident-profile-actions">
                                <button type="button" onClick={cancelEditing} disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}>
                                    {submitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </form>
        </section>
    );
};

export default Profile;
