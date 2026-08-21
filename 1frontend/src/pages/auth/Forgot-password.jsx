import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";

import api from "../../services/api";
import "../../css/auth/forgotPassword.css";

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            setLoading(true);
            await api.post("/auth/forgot-password", {
                email
            });
            navigate("/reset-password", {
                state: {
                    email
                }
            });

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to process your request."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="forgot-page">

            <div className="forgot-card">
                <BrandLogo className="forgot-logo" />

                <p className="forgot-eyebrow">
                    BARANGAY SAN RAFAEL
                </p>

                <h1>Forgot your password?</h1>

                <p className="forgot-description">
                    Enter your registered email address and
                    we'll send you a verification code to
                    reset your password.
                </p>

                {error && (
                    <div className="forgot-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="forgot-form-group">
                        <label htmlFor="email">
                            Email Address
                        </label>

                        <input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="forgot-submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Sending..."
                            : "Send Reset Code"}
                    </button>

                </form>

                <Link
                    to="/login"
                    className="forgot-back"
                >
                    ← Back to login
                </Link>

                <p className="forgot-location">
                    Barangay San Rafael · Guagua, Pampanga
                </p>

            </div>

        </main>
    );
};

export default ForgotPassword;
