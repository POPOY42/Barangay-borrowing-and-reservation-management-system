import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getEquipmentById,
    updateEquipment,
} from "../../../services/equipmentService";
import "../../../css/admin/equipment.css";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EditEquipment = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const submittingRef = useRef(false);
    const requestControllerRef = useRef(null);
    const [formValues, setFormValues] = useState({
        equipmentName: "",
        category: "",
        description: "",
        totalQuantity: "",
        maintenanceQuantity: "",
        status: "active",
    });
    const [existingImage, setExistingImage] = useState("");
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [imageError, setImageError] = useState("");

    const loadEquipment = useCallback(async () => {
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;

        setLoading(true);
        setError("");

        try {
            const data = await getEquipmentById(id, controller.signal);
            const equipment = data.equipment;

            setFormValues({
                equipmentName: equipment.equipmentName ?? "",
                category: equipment.category ?? "",
                description: equipment.description ?? "",
                totalQuantity: String(equipment.totalQuantity ?? ""),
                maintenanceQuantity: String(equipment.maintenanceQuantity ?? 0),
                status: equipment.status ?? "active",
            });
            setExistingImage(equipment.image ?? "");
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setError(
                    requestError.response?.data?.message ||
                        "Unable to load equipment. Please try again."
                );
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [id]);

    useEffect(() => {
        const fetchTimer = window.setTimeout(loadEquipment, 0);

        return () => {
            window.clearTimeout(fetchTimer);
            requestControllerRef.current?.abort();
        };
    }, [loadEquipment]);

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const validateImage = (file) => {
        if (!file) {
            return "";
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return "Please select a JPG, PNG, or WEBP image.";
        }

        if (file.size > MAX_IMAGE_SIZE) {
            return "Equipment image must be 5 MB or smaller.";
        }

        return "";
    };

    const validateForm = () => {
        if (!formValues.equipmentName.trim()) {
            return "Equipment name is required.";
        }

        if (!formValues.category.trim()) {
            return "Category is required.";
        }

        const totalQuantity = Number(formValues.totalQuantity);

        if (
            formValues.totalQuantity === "" ||
            !Number.isInteger(totalQuantity) ||
            totalQuantity < 0
        ) {
            return "Total quantity must be a whole number that is 0 or greater.";
        }

        const maintenanceQuantity = Number(
            formValues.maintenanceQuantity
        );

        if (
            formValues.maintenanceQuantity === "" ||
            !Number.isInteger(maintenanceQuantity) ||
            maintenanceQuantity < 0
        ) {
            return "Maintenance quantity must be a whole number that is 0 or greater.";
        }

        if (maintenanceQuantity > totalQuantity) {
            return "Maintenance quantity cannot exceed total quantity.";
        }

        if (!["active", "inactive"].includes(formValues.status)) {
            return "Please select a valid equipment status.";
        }

        return "";
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormValues((currentValues) => ({
            ...currentValues,
            [name]: value,
        }));
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0] ?? null;
        const selectedImageError = validateImage(file);

        setError("");
        setImageError("");

        if (selectedImageError) {
            setImage(null);
            setImagePreview("");
            setImageError(selectedImageError);
            event.target.value = "";
            return;
        }

        setImage(file);
        setImagePreview(file ? URL.createObjectURL(file) : "");
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImagePreview("");
        setImageError("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

        setError("");
        setImageError("");

        const validationError = validateForm();
        const selectedImageError = validateImage(image);

        if (selectedImageError) {
            setImageError(selectedImageError);
        }

        if (validationError || selectedImageError) {
            setError(validationError);
            return;
        }

        const formData = new FormData();
        formData.append("equipmentName", formValues.equipmentName.trim());
        formData.append("category", formValues.category.trim());
        formData.append("description", formValues.description.trim());
        formData.append("totalQuantity", formValues.totalQuantity);
        formData.append("maintenanceQuantity", formValues.maintenanceQuantity);
        formData.append("status", formValues.status);

        if (image) {
            formData.append("image", image);
        }

        submittingRef.current = true;
        setSubmitting(true);

        try {
            await updateEquipment(id, formData);
            navigate("/admin/equipment");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Failed to update equipment. Please try again."
            );
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <section className="admin-page equipment-page equipment-form-page">
                <div className="equipment-state" role="status">
                    <span className="equipment-loader" aria-hidden="true" />
                    <p>Loading equipment...</p>
                </div>
            </section>
        );
    }

    if (error && !formValues.equipmentName) {
        return (
            <section className="admin-page equipment-page equipment-form-page">
                <div className="equipment-state equipment-error" role="alert">
                    <h2>Equipment could not be loaded</h2>
                    <p>{error}</p>
                    <button type="button" onClick={loadEquipment}>
                        Retry
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="admin-page equipment-page equipment-form-page">
            <div className="equipment-form-heading">
                <div>
                    <h1>Edit Equipment</h1>
                    <p>Update inventory details or replace the equipment image.</p>
                </div>
                <button
                    type="button"
                    className="equipment-back-button"
                    onClick={() => navigate("/admin/equipment")}
                    disabled={submitting}
                >
                    ← Back to Equipment
                </button>
            </div>

            <div className="equipment-form-wrapper">
                <form className="equipment-form-card" onSubmit={handleSubmit} noValidate>
                <div className="equipment-form-title">
                    <h2>Equipment Information</h2>
                    <p>Available quantity is calculated and managed by the system.</p>
                </div>

                {error && (
                    <div className="equipment-form-message equipment-error" role="alert">
                        {error}
                    </div>
                )}

                <div className="equipment-form-grid">
                    <div className="equipment-field equipment-field-full">
                        <label className="equipment-label" htmlFor="equipmentName">
                            Equipment Name <span aria-hidden="true">*</span>
                        </label>
                        <input
                            className="equipment-input"
                            id="equipmentName"
                            name="equipmentName"
                            value={formValues.equipmentName}
                            onChange={handleInputChange}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="equipment-field equipment-field-full">
                        <label className="equipment-label" htmlFor="category">
                            Category <span aria-hidden="true">*</span>
                        </label>
                        <input
                            className="equipment-input"
                            id="category"
                            name="category"
                            value={formValues.category}
                            onChange={handleInputChange}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="equipment-field equipment-field-full">
                        <label className="equipment-label" htmlFor="description">
                            Description
                        </label>
                        <textarea
                            className="equipment-textarea"
                            id="description"
                            name="description"
                            value={formValues.description}
                            onChange={handleInputChange}
                            disabled={submitting}
                            rows="4"
                        />
                    </div>

                    <div className="equipment-field">
                        <label className="equipment-label" htmlFor="totalQuantity">
                            Total Quantity <span aria-hidden="true">*</span>
                        </label>
                        <input
                            className="equipment-input"
                            id="totalQuantity"
                            name="totalQuantity"
                            type="number"
                            min="0"
                            step="1"
                            value={formValues.totalQuantity}
                            onChange={handleInputChange}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="equipment-field">
                        <label className="equipment-label" htmlFor="maintenanceQuantity">
                            Maintenance Quantity <span aria-hidden="true">*</span>
                        </label>
                        <input
                            className="equipment-input"
                            id="maintenanceQuantity"
                            name="maintenanceQuantity"
                            type="number"
                            min="0"
                            step="1"
                            value={formValues.maintenanceQuantity}
                            onChange={handleInputChange}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="equipment-field equipment-field-full">
                        <label className="equipment-label" htmlFor="status">
                            Status <span aria-hidden="true">*</span>
                        </label>
                        <select
                            className="equipment-select"
                            id="status"
                            name="status"
                            value={formValues.status}
                            onChange={handleInputChange}
                            disabled={submitting}
                            required
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="equipment-field equipment-field-full">
                        <label className="equipment-label" htmlFor="editImage">
                            Replacement Image
                        </label>
                        <div className="equipment-image-upload">
                            <input
                                ref={fileInputRef}
                                id="editImage"
                                name="image"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleImageChange}
                                disabled={submitting}
                            />
                            <p>Optional. JPG, PNG, or WEBP up to 5 MB.</p>
                        </div>

                        {imageError && (
                            <p className="equipment-image-error" role="alert">
                                {imageError}
                            </p>
                        )}

                        {image && imagePreview ? (
                            <div className="equipment-image-preview">
                                <img src={imagePreview} alt="New equipment preview" />
                                <span>{image.name}</span>
                                <button
                                    type="button"
                                    className="equipment-image-remove"
                                    aria-label={`Remove ${image.name}`}
                                    onClick={handleRemoveImage}
                                    disabled={submitting}
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            existingImage && (
                                <div className="equipment-existing-image">
                                    <img src={existingImage} alt="Current equipment" />
                                    <span>Current image will be retained.</span>
                                </div>
                            )
                        )}
                    </div>
                </div>

                <div className="equipment-form-actions">
                    <button
                        type="button"
                        className="equipment-cancel-btn"
                        onClick={() => navigate("/admin/equipment")}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="equipment-submit-btn"
                        disabled={submitting}
                    >
                        {submitting ? "Saving Changes..." : "Save Changes"}
                    </button>
                </div>
                </form>
            </div>
        </section>
    );
};

export default EditEquipment;
