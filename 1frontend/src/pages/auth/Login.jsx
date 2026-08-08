import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../css/auth/login.css";

const Login = () => {
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (error) {
            setError("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            setLoading(true);
            const response = await api.post("/auth/login", formData);
            const { token, user } = response.data;
            loginUser(token, user);

            setTimeout(() => {
                if (user.role === "admin") {
                    navigate("/admin/dashboard");
                } else {
                    navigate("/resident/dashboard");
                }
            }, 1200);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Login failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">
            <section className="login-wrapper">

                <div className="login-brand">
                    <div className="login-brand-content">

                        <div className="login-logo">
                            SR
                        </div>

                        <p className="login-brand-label">
                            BARANGAY SAN RAFAEL
                        </p>

                        <h1>
                            Welcome back to your
                            <span> barangay services.</span>
                        </h1>

                        <p className="login-brand-description">
                            Access the Barangay San Rafael Borrowing and
                            Reservation Management System to manage your
                            requests and reservations.
                        </p>

                        <div className="login-location">
                            <span className="login-location-dot"></span>

                            <div>
                                <strong>Barangay San Rafael</strong>
                                <p>Guagua, Pampanga</p>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="login-form-section">
                    <div className="login-form-container">

                        <div className="login-mobile-brand">
                            <div className="login-mobile-logo">
                                SR
                            </div>

                            <div>
                                <strong>Barangay San Rafael</strong>
                                <p>Guagua, Pampanga</p>
                            </div>
                        </div>

                        <div className="login-heading">
                            <p className="login-eyebrow">
                                ACCOUNT LOGIN
                            </p>

                            <h2>Welcome back</h2>

                            <p>
                                Enter your registered email and password
                                to continue.
                            </p>
                        </div>

                        {error && (
                            <div className="login-error" role="alert">
                                <span>!</span>
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>

                            <div className="login-form-group">
                                <label htmlFor="email">
                                    Email Address
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div className="login-form-group">
                                <div className="password-label-row">
                                    <label htmlFor="password">
                                        Password
                                    </label>

                                    <Link to="/forgot-password">
                                        Forgot password?
                                    </Link>
                                </div>

                                <div className="login-password-input">
                                    <input
                                        id="password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="password"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="current-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="login-show-password"
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={loading}
                            >
                                {loading
                                    ? "Logging in..."
                                    : "Log In"}
                            </button>

                            <p className="register-link-text">
                                Don't have an account?{" "}
                                <Link to="/register">
                                    Create an account
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Login;
