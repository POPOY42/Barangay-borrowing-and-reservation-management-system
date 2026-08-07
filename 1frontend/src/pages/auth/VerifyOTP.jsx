import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../css/auth/verifyOTP.css";

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email;

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!email) {
            navigate("/register");
        }
    }, [email, navigate]);

    const handleOtpChange = (e) => {
        const value = e.target.value.replace(/\D/g, "").slice(0, 6);

        setOtp(value);

        if (error) {
            setError("");
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (otp.length !== 6) {
            setError("Please enter the 6-digit verification code.");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(
                "/auth/register/verify",
                {
                    email,
                    otp,
                }
            );

            setMessage(response.data.message);

            setTimeout(() => {
                navigate("/login");
            }, 1200);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to verify your code. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setMessage("");

        try {
            setResending(true);

            const response = await api.post("/auth/register", {
                email,
            });

            setMessage(response.data.message);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to resend the verification code."
            );
        } finally {
            setResending(false);
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
        <main className="otp-page">
            <section className="otp-wrapper">

                <div className="otp-brand">
                    <div className="otp-brand-content">
                        <div className="otp-logo">
                            SR
                        </div>

                        <p className="otp-brand-label">
                            BARANGAY SAN RAFAEL
                        </p>

                        <h1>
                            One more step to
                            <span> verify your account.</span>
                        </h1>

                        <p className="otp-brand-description">
                            Enter the verification code sent to your email
                            to complete your registration for the Barangay
                            San Rafael Borrowing and Reservation System.
                        </p>

                        <div className="otp-location">
                            <span className="otp-location-dot"></span>

                            <div>
                                <strong>
                                    Barangay San Rafael
                                </strong>
                                <p>Guagua, Pampanga</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="otp-form-section">
                    <div className="otp-form-container">

                        <div className="otp-mobile-brand">
                            <div className="otp-mobile-logo">
                                SR
                            </div>

                            <div>
                                <strong>
                                    Barangay San Rafael
                                </strong>
                                <p>Guagua, Pampanga</p>
                            </div>
                        </div>

                        <div className="otp-icon">
                            ✉
                        </div>

                        <div className="otp-heading">
                            <p className="otp-eyebrow">
                                EMAIL VERIFICATION
                            </p>

                            <h2>Check your email</h2>

                            <p>
                                We sent a 6-digit verification
                                code to
                            </p>

                            <strong className="otp-email">
                                {maskedEmail}
                            </strong>
                        </div>

                        {error && (
                            <div
                                className="otp-alert otp-error"
                                role="alert"
                            >
                                <span>!</span>
                                <p>{error}</p>
                            </div>
                        )}

                        {message && (
                            <div
                                className="otp-alert otp-success"
                                role="status"
                            >
                                <span>✓</span>
                                <p>{message}</p>
                            </div>
                        )}

                        <form onSubmit={handleVerify}>
                            <div className="otp-field">
                                <label htmlFor="otp">
                                    Verification Code
                                </label>

                                <input
                                    id="otp"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    name="otp"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={handleOtpChange}
                                    maxLength="6"
                                    autoFocus
                                    required
                                />

                                <p>
                                    Enter the 6-digit code sent
                                    to your email.
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="verify-otp-btn"
                                disabled={
                                    loading ||
                                    otp.length !== 6
                                }
                            >
                                {loading
                                    ? "Verifying..."
                                    : "Verify Account"}
                            </button>
                        </form>

                        <div className="resend-section">
                            <p>
                                Didn't receive the code?
                            </p>

                            <button
                                type="button"
                                className="resend-btn"
                                onClick={handleResend}
                                disabled={resending}
                            >
                                {resending
                                    ? "Sending..."
                                    : "Resend Code"}
                            </button>
                        </div>

                        <div className="otp-divider">
                            <span></span>
                            <p>or</p>
                            <span></span>
                        </div>

                        <Link
                            to="/register"
                            className="back-register"
                        >
                            ← Back to registration
                        </Link>

                    </div>
                </div>

            </section>
        </main>
    );
};

export default VerifyOTP;