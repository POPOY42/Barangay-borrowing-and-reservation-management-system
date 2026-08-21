import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiImage, FiX } from "react-icons/fi";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const VALID_STATUSES = ["active", "inactive", "maintenance"];

const validateValues = (values, image) => {
    const errors = {};

    if (!values.facilityName.trim()) {
        errors.facilityName = "Facility name is required.";
    }
    if (!values.category.trim()) {
        errors.category = "Category is required.";
    }
    if (values.capacity !== "") {
        const capacity = Number(values.capacity);
        if (!Number.isInteger(capacity) || capacity < 1) {
            errors.capacity = "Capacity must be a whole number of at least 1.";
        }
    }
    if (!VALID_STATUSES.includes(values.status)) {
        errors.status = "Please select a valid facility status.";
    }
    if (image && !ALLOWED_IMAGE_TYPES.includes(image.type)) {
        errors.image = "Please select a JPG, PNG, or WEBP image.";
    } else if (image && image.size > MAX_IMAGE_SIZE) {
        errors.image = "Facility image must be 5 MB or smaller.";
    }

    return errors;
};

const FacilityForm = ({
    initialValues,
    existingImage = "",
    isEdit = false,
    submitting,
    error,
    onClearError,
    onCancel,
    onSubmit,
}) => {
    const fileInputRef = useRef(null);
    const [values, setValues] = useState(initialValues);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [existingImageFailed, setExistingImageFailed] = useState(false);

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const updateValue = (event) => {
        const { name, value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
        setFieldErrors((current) => ({ ...current, [name]: "" }));
        onClearError();
    };

    const selectImage = (event) => {
        const file = event.target.files?.[0] || null;
        const validation = validateValues(values, file);

        onClearError();
        setFieldErrors((current) => ({ ...current, image: validation.image || "" }));

        if (validation.image) {
            setImage(null);
            setImagePreview("");
            event.target.value = "";
            return;
        }

        setImage(file);
        setImagePreview(file ? URL.createObjectURL(file) : "");
    };

    const removeImage = () => {
        setImage(null);
        setImagePreview("");
        setFieldErrors((current) => ({ ...current, image: "" }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const submitForm = (event) => {
        event.preventDefault();
        if (submitting) return;

        const validation = validateValues(values, image);
        setFieldErrors(validation);
        onClearError();
        if (Object.values(validation).some(Boolean)) return;

        const formData = new FormData();
        formData.append("facilityName", values.facilityName.trim());
        formData.append("category", values.category.trim());
        formData.append("status", values.status);

        if (isEdit || values.description.trim()) {
            formData.append("description", values.description.trim());
        }
        if (isEdit || values.location.trim()) {
            formData.append("location", values.location.trim());
        }
        if (isEdit || values.capacity !== "") {
            formData.append("capacity", values.capacity);
        }
        if (image) formData.append("image", image);

        onSubmit(formData);
    };

    return (
        <form className="facility-form-card" onSubmit={submitForm} noValidate>
            <div className="facility-form-title">
                <div className="facility-form-title-icon" aria-hidden="true">
                    <FiImage />
                </div>
                <div>
                    <h2>Facility Information</h2>
                    <p>Enter the facility details and optionally provide an image.</p>
                </div>
            </div>

            {error && (
                <div className="facility-form-message" role="alert">
                    {error}
                </div>
            )}

            <div className="facility-form-grid">
                <div className="facility-field">
                    <label htmlFor="facilityName">
                        Facility Name <span aria-hidden="true">*</span>
                    </label>
                    <input
                        id="facilityName"
                        name="facilityName"
                        value={values.facilityName}
                        onChange={updateValue}
                        disabled={submitting}
                        aria-invalid={Boolean(fieldErrors.facilityName)}
                        required
                    />
                    {fieldErrors.facilityName && (
                        <p className="facility-field-error">{fieldErrors.facilityName}</p>
                    )}
                </div>

                <div className="facility-field">
                    <label htmlFor="category">
                        Category <span aria-hidden="true">*</span>
                    </label>
                    <input
                        id="category"
                        name="category"
                        value={values.category}
                        onChange={updateValue}
                        disabled={submitting}
                        aria-invalid={Boolean(fieldErrors.category)}
                        required
                    />
                    {fieldErrors.category && (
                        <p className="facility-field-error">{fieldErrors.category}</p>
                    )}
                </div>

                <div className="facility-field facility-field-full">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={values.description}
                        onChange={updateValue}
                        disabled={submitting}
                        rows="4"
                    />
                </div>

                <div className="facility-field">
                    <label htmlFor="location">Location</label>
                    <input
                        id="location"
                        name="location"
                        value={values.location}
                        onChange={updateValue}
                        disabled={submitting}
                    />
                </div>

                <div className="facility-field">
                    <label htmlFor="capacity">Capacity</label>
                    <input
                        id="capacity"
                        name="capacity"
                        type="number"
                        min="1"
                        step="1"
                        value={values.capacity}
                        onChange={updateValue}
                        disabled={submitting}
                        aria-invalid={Boolean(fieldErrors.capacity)}
                        placeholder="Optional"
                    />
                    {fieldErrors.capacity && (
                        <p className="facility-field-error">{fieldErrors.capacity}</p>
                    )}
                </div>

                <div className="facility-field facility-field-full">
                    <label htmlFor="status">
                        Status <span aria-hidden="true">*</span>
                    </label>
                    <select
                        id="status"
                        name="status"
                        value={values.status}
                        onChange={updateValue}
                        disabled={submitting}
                        aria-invalid={Boolean(fieldErrors.status)}
                        required
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                    {fieldErrors.status && (
                        <p className="facility-field-error">{fieldErrors.status}</p>
                    )}
                </div>

                <div className="facility-field facility-field-full">
                    <label htmlFor="facilityImage">
                        {isEdit ? "Replacement Image" : "Facility Image"}
                    </label>
                    <div className="facility-image-upload">
                        <input
                            ref={fileInputRef}
                            id="facilityImage"
                            name="image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={selectImage}
                            disabled={submitting}
                        />
                        <p>Optional. JPG, PNG, or WEBP up to 5 MB.</p>
                    </div>
                    {fieldErrors.image && (
                        <p className="facility-field-error">{fieldErrors.image}</p>
                    )}

                    {imagePreview ? (
                        <div className="facility-image-preview">
                            <img src={imagePreview} alt="Selected facility preview" />
                            <span>{image.name}</span>
                            <button
                                type="button"
                                aria-label={`Remove ${image.name}`}
                                onClick={removeImage}
                                disabled={submitting}
                            >
                                <FiX aria-hidden="true" />
                            </button>
                        </div>
                    ) : isEdit && existingImage && !existingImageFailed ? (
                        <div className="facility-image-preview facility-existing-image">
                            <img
                                src={existingImage}
                                alt="Current facility"
                                onError={() => setExistingImageFailed(true)}
                            />
                            <span>Current image will be retained.</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="facility-form-actions">
                <button
                    type="button"
                    className="facility-secondary-button"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    <FiArrowLeft aria-hidden="true" />
                    Cancel
                </button>
                <button
                    type="submit"
                    className="facility-primary-button"
                    disabled={submitting}
                >
                    {submitting
                        ? isEdit ? "Saving..." : "Adding..."
                        : isEdit ? "Save Changes" : "Add Facility"}
                </button>
            </div>
        </form>
    );
};

export default FacilityForm;
