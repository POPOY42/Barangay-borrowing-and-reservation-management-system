import { useEffect, useState } from "react";
import {
    Link,
    useLocation,
    useNavigate
} from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";

import api from "../../services/api";
import "../../css/auth/forgotPassword.css";

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email;

    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!email) {
            navigate("/forgot-password");
        }
    }, [email, navigate]);

    const handleOtpChange = (e) => {
        const value = e.target.value
            .replace(/\D/g, "")
            .slice(0, 6);

        setOtp(value);

        if (error) {
            setError("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (otp.length !== 6) {
            setError("Please enter the 6-digit reset code.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post(
                "/auth/reset-password",
                {
                    email,
                    otp,
                    password,
                    confirmPassword
                }
            );

            setMessage(response.data.message);

            setTimeout(() => {
                navigate("/login");
            }, 3000);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to reset your password. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const maskedEmail = email
        ? email.replace(
            /^(.{2})(.*)(@.*)$/,
            (_, start, middle, domain) =>
                `${start}${"*".repeat(
                    Math.min(middle.length, 6)
                )}${domain}`
        )
        : "";

    return (
        <main className="reset-page">
            <section className="reset-wrapper">

                <div className="reset-brand">
                    <div className="reset-brand-content">

                        <BrandLogo className="reset-brand-logo" />

                        <p className="reset-brand-label">
                            BARANGAY SAN RAFAEL
                        </p>

                        <h1>
                            Secure your account with a
                            <span> new password.</span>
                        </h1>

                        <p className="reset-brand-description">
                            Enter the verification code sent to your email
                            and create a new password for your account.
                        </p>

                        <div className="reset-brand-location">
                            <span className="reset-location-dot"></span>

                            <div>
                                <strong>
                                    Barangay San Rafael
                                </strong>

                                <p>
                                    Guagua, Pampanga
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="reset-form-section">
                    <div className="reset-form-container">

                        <div className="reset-mobile-brand">
                            <BrandLogo className="reset-mobile-logo" />

                            <div>
                                <strong>
                                    Barangay San Rafael
                                </strong>

                                <p>
                                    Guagua, Pampanga
                                </p>
                            </div>
                        </div>

                        <div className="reset-icon">
                            🔐
                        </div>

                        <div className="reset-heading">

                            <p className="reset-eyebrow">
                                PASSWORD RECOVERY
                            </p>

                            <h2>
                                Reset your password
                            </h2>

                            <p>
                                Enter the 6-digit reset code sent to
                            </p>

                            <strong className="reset-email">
                                {maskedEmail}
                            </strong>

                        </div>

                        {error && (
                            <div
                                className="reset-alert reset-error"
                                role="alert"
                            >
                                <span>!</span>
                                <p>{error}</p>
                            </div>
                        )}

                        {message && (
                            <div
                                className="reset-alert reset-success"
                                role="status"
                            >
                                <span>✓</span>
                                <p>{message}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>

                            <div className="reset-form-group">
                                <label htmlFor="otp">
                                    Reset Code
                                </label>

                                <input
                                    id="otp"
                                    className="reset-otp-input"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={handleOtpChange}
                                    maxLength="6"
                                    autoFocus
                                    required
                                />

                                <p className="reset-input-hint">
                                    Enter the 6-digit code from your email.
                                </p>
                            </div>

                            <div className="reset-form-group">
                                <label htmlFor="password">
                                    New Password
                                </label>

                                <div className="reset-password-input">
                                    <input
                                        id="password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);

                                            if (error) {
                                                setError("");
                                            }
                                        }}
                                        autoComplete="new-password"
                                        minLength="6"
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                (prev) => !prev
                                            )
                                        }
                                    >
                                        {showPassword
                                            ? "Hide"
                                            : "Show"}
                                    </button>
                                </div>
                            </div>

                            <div className="reset-form-group">
                                <label htmlFor="confirmPassword">
                                    Confirm New Password
                                </label>

                                <div className="reset-password-input">
                                    <input
                                        id="confirmPassword"
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(
                                                e.target.value
                                            );

                                            if (error) {
                                                setError("");
                                            }
                                        }}
                                        autoComplete="new-password"
                                        minLength="6"
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                (prev) => !prev
                                            )
                                        }
                                    >
                                        {showConfirmPassword
                                            ? "Hide"
                                            : "Show"}
                                    </button>
                                </div>
                            </div>

                            <p className="reset-password-hint">
                                Your new password must contain at least
                                6 characters.
                            </p>

                            <button
                                type="submit"
                                className="reset-submit-btn"
                                disabled={loading}
                            >
                                {loading
                                    ? "Resetting password..."
                                    : "Reset Password"}
                            </button>

                        </form>

                        <Link
                            to="/login"
                            className="reset-back-login"
                        >
                            ← Back to login
                        </Link>
                    </div>
                </div>

            </section>
        </main>
    );
};

export default ResetPassword;
