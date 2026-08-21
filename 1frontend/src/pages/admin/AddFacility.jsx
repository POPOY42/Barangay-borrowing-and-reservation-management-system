import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FacilityForm from "../../components/admin/FacilityForm";
import { createFacility } from "../../services/facilityService";
import "../../css/admin/facility.css";

const INITIAL_VALUES = {
    facilityName: "",
    category: "",
    description: "",
    location: "",
    capacity: "",
    status: "active",
};

const AddFacility = () => {
    const navigate = useNavigate();
    const submittingRef = useRef(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (formData) => {
        if (submittingRef.current) return;

        submittingRef.current = true;
        setSubmitting(true);
        setError("");

        try {
            await createFacility(formData);
            navigate("/admin/facilities");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Failed to add facility. Please try again."
            );
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    return (
        <section className="admin-page facility-page facility-form-page">
            <header className="facility-page-heading">
                <div>
                    <h1>Add Facility</h1>
                    <p>Add a barangay facility that residents can reserve.</p>
                </div>
            </header>

            <div className="facility-form-wrapper">
                <FacilityForm
                    initialValues={INITIAL_VALUES}
                    submitting={submitting}
                    error={error}
                    onClearError={() => setError("")}
                    onCancel={() => navigate("/admin/facilities")}
                    onSubmit={handleSubmit}
                />
            </div>
        </section>
    );
};

export default AddFacility;
