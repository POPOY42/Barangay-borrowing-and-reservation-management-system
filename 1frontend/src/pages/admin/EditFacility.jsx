import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FacilityForm from "../../components/admin/FacilityForm";
import {
    getFacilityById,
    updateFacility,
} from "../../services/facilityService";
import "../../css/admin/facility.css";

const EditFacility = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const requestControllerRef = useRef(null);
    const submittingRef = useRef(false);
    const [facility, setFacility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [submitError, setSubmitError] = useState("");

    const loadFacility = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setLoadError("");

        try {
            const data = await getFacilityById(id, controller.signal);
            setFacility(data.facility || null);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setFacility(null);
                setLoadError(
                    requestError.response?.data?.message ||
                        "Unable to load facility. Please try again."
                );
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const timer = window.setTimeout(loadFacility, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [loadFacility]);

    const handleSubmit = async (formData) => {
        if (submittingRef.current) return;

        submittingRef.current = true;
        setSubmitting(true);
        setSubmitError("");

        try {
            await updateFacility(id, formData);
            navigate("/admin/facilities");
        } catch (requestError) {
            setSubmitError(
                requestError.response?.data?.message ||
                    "Failed to save facility. Please try again."
            );
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <section className="admin-page facility-page">
                <div className="facility-state" role="status">
                    <span className="facility-loader" aria-hidden="true" />
                    <p>Loading facility...</p>
                </div>
            </section>
        );
    }

    if (!facility) {
        return (
            <section className="admin-page facility-page">
                <div className="facility-state facility-state-error" role="alert">
                    <h2>Facility could not be loaded</h2>
                    <p>{loadError}</p>
                    <button type="button" onClick={loadFacility}>Retry</button>
                </div>
            </section>
        );
    }

    const initialValues = {
        facilityName: facility.facilityName || "",
        category: facility.category || "",
        description: facility.description || "",
        location: facility.location || "",
        capacity: facility.capacity === undefined || facility.capacity === null
            ? ""
            : String(facility.capacity),
        status: facility.status || "active",
    };

    return (
        <section className="admin-page facility-page facility-form-page">
            <header className="facility-page-heading">
                <div>
                    <h1>Edit Facility</h1>
                    <p>Update facility details or replace its existing image.</p>
                </div>
            </header>

            <div className="facility-form-wrapper">
                <FacilityForm
                    key={facility._id}
                    initialValues={initialValues}
                    existingImage={facility.image || ""}
                    isEdit
                    submitting={submitting}
                    error={submitError}
                    onClearError={() => setSubmitError("")}
                    onCancel={() => navigate("/admin/facilities")}
                    onSubmit={handleSubmit}
                />
            </div>
        </section>
    );
};

export default EditFacility;
