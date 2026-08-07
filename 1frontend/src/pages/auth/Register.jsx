import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../css/auth/register.css";

const Register = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/auth/register", formData);
            console.log(response.data);
            navigate("/verify-otp", {
                state: {
                    email: formData.email,
                },
            });
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Registration failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="register-page">
            <section className="register-wrapper">

                <div className="register-brand">
                    <div className="brand-content">
                        <div className="barangay-logo">
                            <span>SR</span>
                        </div>

                        <p className="brand-label">
                            BARANGAY SAN RAFAEL
                        </p>

                        <h1>
                            Borrow and reserve
                            <span> with ease.</span>
                        </h1>

                        <p className="brand-description">
                            The official borrowing and reservation management
                            system of Barangay San Rafael, Guagua, Pampanga.
                        </p>

                        <div className="brand-location">
                            <span className="location-dot"></span>
                            <div>
                                <strong>Barangay San Rafael</strong>
                                <p>Guagua, Pampanga</p>
                            </div>
                        </div>

                        <div className="brand-features">
                            <div className="feature">
                                <span className="feature-check">✓</span>
                                <div>
                                    <strong>Borrow Barangay Equipment</strong>
                                    <p>
                                        Submit equipment borrowing requests
                                        conveniently online.
                                    </p>
                                </div>
                            </div>

                            <div className="feature">
                                <span className="feature-check">✓</span>
                                <div>
                                    <strong>Reserve Facilities</strong>
                                    <p>
                                        Request available barangay facilities
                                        for scheduled use.
                                    </p>
                                </div>
                            </div>

                            <div className="feature">
                                <span className="feature-check">✓</span>
                                <div>
                                    <strong>Track Your Requests</strong>
                                    <p>
                                        Check the status of your borrowing and
                                        reservation requests.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="register-form-section">
                    <div className="register-form-container">

                        <div className="mobile-brand">
                            <div className="mobile-logo">SR</div>

                            <div>
                                <strong>Barangay San Rafael</strong>
                                <p>Guagua, Pampanga</p>
                            </div>
                        </div>

                        <div className="form-heading">
                            <p className="form-eyebrow">
                                RESIDENT REGISTRATION
                            </p>

                            <h2>Create your account</h2>

                            <p>
                                Enter your information to register for the
                                barangay borrowing and reservation system.
                            </p>
                        </div>

                        {error && (
                            <div className="register-error" role="alert">
                                <span>!</span>
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>

                            <div className="form-section-title">
                                <span>01</span>

                                <div>
                                    <h3>Personal Information</h3>
                                    <p>
                                        Provide your complete name as a resident.
                                    </p>
                                </div>
                            </div>

                            <div className="form-grid three-columns">
                                <div className="form-group">
                                    <label htmlFor="firstName">
                                        First Name <span>*</span>
                                    </label>

                                    <input
                                        id="firstName"
                                        type="text"
                                        name="firstName"
                                        placeholder="First name"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        autoComplete="given-name"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="middleName">
                                        Middle Name
                                    </label>

                                    <input
                                        id="middleName"
                                        type="text"
                                        name="middleName"
                                        placeholder="Middle name"
                                        value={formData.middleName}
                                        onChange={handleChange}
                                        autoComplete="additional-name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="lastName">
                                        Last Name <span>*</span>
                                    </label>

                                    <input
                                        id="lastName"
                                        type="text"
                                        name="lastName"
                                        placeholder="Last name"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        autoComplete="family-name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-divider"></div>

                            <div className="form-section-title">
                                <span>02</span>

                                <div>
                                    <h3>Account Information</h3>
                                    <p>
                                        Use an active email address for OTP
                                        verification.
                                    </p>
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="email">
                                    Email Address <span>*</span>
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

                                <p className="input-hint">
                                    A verification code will be sent to this
                                    email address.
                                </p>
                            </div>

                            <div className="form-divider"></div>

                            <div className="form-section-title">
                                <span>03</span>

                                <div>
                                    <h3>Create Password</h3>
                                    <p>
                                        Secure your account with a password.
                                    </p>
                                </div>
                            </div>

                            <div className="form-grid two-columns">
                                <div className="form-group">
                                    <label htmlFor="password">
                                        Password <span>*</span>
                                    </label>

                                    <div className="password-input">
                                        <input
                                            id="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="password"
                                            placeholder="Minimum 6 characters"
                                            value={formData.password}
                                            onChange={handleChange}
                                            autoComplete="new-password"
                                            minLength="6"
                                            required
                                        />

                                        <button
                                            type="button"
                                            className="show-password"
                                            onClick={() =>
                                                setShowPassword((prev) => !prev)
                                            }
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="confirmPassword">
                                        Confirm Password <span>*</span>
                                    </label>

                                    <div className="password-input">
                                        <input
                                            id="confirmPassword"
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="confirmPassword"
                                            placeholder="Repeat password"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            autoComplete="new-password"
                                            minLength="6"
                                            required
                                        />

                                        <button
                                            type="button"
                                            className="show-password"
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
                            </div>

                            <button
                                type="submit"
                                className="create-account-btn"
                                disabled={loading}
                            >
                                {loading
                                    ? "Creating account..."
                                    : "Create Account"}
                            </button>

                            <p className="terms-text">
                                By creating an account, you confirm that the
                                information provided is accurate.
                            </p>

                            <p className="login-text">
                                Already have an account?{" "}
                                <Link to="/login">Log in</Link>
                            </p>
                        </form>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Register;