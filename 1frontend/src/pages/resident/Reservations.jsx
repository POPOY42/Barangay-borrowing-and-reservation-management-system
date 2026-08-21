import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    FiCalendar,
    FiCheckCircle,
    FiClock,
    FiHome,
    FiMapPin,
    FiSearch,
    FiUsers,
    FiX,
} from "react-icons/fi";
import ResidentPagination from "../../components/resident/ResidentPagination";
import { getFacilities } from "../../services/facilityService";
import { createReservation } from "../../services/reservationService";
import "../../css/resident/reservation.css";

const EMPTY_FORM = {
    reservationDate: "",
    startTime: "",
    endTime: "",
    purpose: "",
};
const ACTIVE_RESERVATION_STATUSES = new Set(["pending", "approved"]);
const RESERVATION_BUTTON_LABELS = {
    pending: "Waiting for Approval",
    approved: "Approved / Reserved",
};

const getManilaNow = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());
    const value = (type) => parts.find((part) => part.type === type)?.value;

    return {
        date: `${value("year")}-${value("month")}-${value("day")}`,
        time: `${value("hour")}:${value("minute")}`,
    };
};

const validateReservation = (facility, values) => {
    if (!facility?._id) return "Please select a facility.";
    if (!values.reservationDate) return "Reservation date is required.";

    const now = getManilaNow();
    const today = now.date;
    if (values.reservationDate < today) {
        return "Reservation date cannot be in the past.";
    }
    if (!values.startTime) return "Start time is required.";
    if (!values.endTime) return "End time is required.";
    if (values.endTime <= values.startTime) {
        return "End time must be after start time.";
    }
    if (
        values.reservationDate === today &&
        values.startTime < now.time
    ) {
        return "Start time cannot already be in the past.";
    }
    if (!values.purpose.trim()) return "Purpose is required.";

    return "";
};

const FacilityImage = ({ facility, onOpen }) => {
    const [failed, setFailed] = useState(false);

    if (!facility.image || failed) {
        return (
            <div className="resident-facility-image-placeholder" aria-hidden="true">
                <FiHome />
            </div>
        );
    }

    return (
        <button
            type="button"
            className="resident-facility-image-button"
            aria-label={`View larger image of ${facility.facilityName}`}
            onClick={() => onOpen(facility)}
        >
            <img
                src={facility.image}
                alt={facility.facilityName}
                onError={() => setFailed(true)}
            />
        </button>
    );
};

const Reservations = () => {
    const requestControllerRef = useRef(null);
    const submittingRef = useRef(false);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [formValues, setFormValues] = useState(EMPTY_FORM);
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const loadFacilities = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setLoadError("");

        try {
            const data = await getFacilities({
                page: currentPage,
                limit: 10,
                search: debouncedSearch,
                status: "active",
                signal: controller.signal,
            });
            const pagination = data.pagination || {};

            setFacilities(Array.isArray(data.facilities) ? data.facilities : []);
            setCurrentPage(pagination.currentPage ?? currentPage);
            setTotalPages(pagination.totalPages ?? 0);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setFacilities([]);
                setLoadError(
                    requestError.response?.data?.message ||
                        "Unable to load facilities. Please try again."
                );
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [currentPage, debouncedSearch]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearch(search.trim());
        }, 400);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const timer = window.setTimeout(loadFacilities, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [loadFacilities]);

    useEffect(() => {
        if (!selectedImage && !selectedFacility) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (selectedImage) {
                setSelectedImage(null);
            } else if (!submitting) {
                setSelectedFacility(null);
                setFormValues(EMPTY_FORM);
                setSubmitError("");
            }
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedFacility, selectedImage, submitting]);

    const clearSearch = () => {
        requestControllerRef.current?.abort();
        setSearch("");
        setDebouncedSearch("");
        setCurrentPage(1);
    };

    const openReservationModal = (facility) => {
        if (
            facility.status !== "active" ||
            ACTIVE_RESERVATION_STATUSES.has(facility.reservationStatus)
        ) {
            return;
        }
        setSelectedFacility(facility);
        setFormValues(EMPTY_FORM);
        setSubmitError("");
        setSuccessMessage("");
    };

    const closeReservationModal = () => {
        if (submitting) return;
        setSelectedFacility(null);
        setFormValues(EMPTY_FORM);
        setSubmitError("");
    };

    const updateFormValue = (event) => {
        const { name, value } = event.target;
        setFormValues((current) => ({ ...current, [name]: value }));
        setSubmitError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submittingRef.current) return;

        const validationError = validateReservation(selectedFacility, formValues);
        if (validationError) {
            setSubmitError(validationError);
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        setSubmitError("");

        try {
            const data = await createReservation({
                facility: selectedFacility._id,
                reservationDate: formValues.reservationDate,
                startTime: formValues.startTime,
                endTime: formValues.endTime,
                purpose: formValues.purpose.trim(),
            });
            setSelectedFacility(null);
            setFormValues(EMPTY_FORM);
            setSuccessMessage(
                data.message || "Reservation request submitted successfully."
            );
            if (data.reservation?.status === "pending") {
                const createdFacility = data.reservation.facility;
                const createdFacilityId = typeof createdFacility === "string"
                    ? createdFacility
                    : createdFacility?._id;
                setFacilities((current) => current.map((facility) =>
                    facility._id === createdFacilityId
                        ? { ...facility, reservationStatus: "pending" }
                        : facility
                ));
            }
            await loadFacilities();
        } catch (requestError) {
            setSubmitError(
                requestError.response?.data?.message ||
                    "Unable to submit reservation. Please try again."
            );
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const initialLoading = loading && facilities.length === 0;

    return (
        <section className="resident-page resident-reservations-page">
            <header className="resident-page-heading">
                <span>Barangay Facilities</span>
                <h1>Reserve a Facility</h1>
                <p>Browse available barangay facilities and submit a reservation request.</p>
            </header>

            {successMessage && (
                <div className="resident-reservation-success" role="status">
                    <FiCheckCircle aria-hidden="true" />
                    <span>{successMessage} Your request is pending administrator approval.</span>
                    <Link to="/resident/my-reservations">View My Reservations</Link>
                    <button
                        type="button"
                        aria-label="Dismiss success message"
                        onClick={() => setSuccessMessage("")}
                    >
                        <FiX aria-hidden="true" />
                    </button>
                </div>
            )}

            <div className="resident-facility-search">
                <FiSearch aria-hidden="true" />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                        requestControllerRef.current?.abort();
                        setSearch(event.target.value);
                    }}
                    placeholder="Search facilities..."
                    aria-label="Search facilities"
                />
                {search && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Clear facility search"
                    >
                        <FiX aria-hidden="true" />
                    </button>
                )}
            </div>

            {initialLoading ? (
                <div className="resident-facility-state" role="status">
                    <span className="resident-facility-loader" aria-hidden="true" />
                    <p>Loading available facilities...</p>
                </div>
            ) : loadError ? (
                <div className="resident-facility-state error" role="alert">
                    <h2>Facilities could not be loaded</h2>
                    <p>{loadError}</p>
                    <button type="button" onClick={loadFacilities}>Retry</button>
                </div>
            ) : facilities.length === 0 ? (
                <div className="resident-facility-state">
                    <FiHome aria-hidden="true" />
                    <h2>
                        {debouncedSearch
                            ? "No facilities match your search."
                            : "No facilities are currently available for reservation."}
                    </h2>
                    <p>Check again later or try another search.</p>
                </div>
            ) : (
                <>
                    {loading && (
                        <p className="resident-facility-refreshing" role="status">
                            Updating facilities...
                        </p>
                    )}
                    <div className="resident-facility-grid" aria-busy={loading}>
                        {facilities.map((facility) => {
                            const available = facility.status === "active";
                            const hasActiveReservation = ACTIVE_RESERVATION_STATUSES.has(
                                facility.reservationStatus
                            );
                            return (
                                <article className="resident-facility-card" key={facility._id}>
                                    <FacilityImage
                                        facility={facility}
                                        onOpen={(item) => setSelectedImage({
                                            src: item.image,
                                            name: item.facilityName,
                                        })}
                                    />
                                    <div className="resident-facility-card-content">
                                        <div className="resident-facility-card-labels">
                                            <span>{facility.category}</span>
                                            <div className="resident-facility-card-badges">
                                                <span className={`resident-facility-status ${available ? "available" : "unavailable"}`}>
                                                    {available ? "Available" : facility.status}
                                                </span>
                                                {hasActiveReservation && (
                                                    <span className={`resident-facility-request-status ${facility.reservationStatus}`}>
                                                        {facility.reservationStatus}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h2>{facility.facilityName}</h2>
                                        {facility.location && (
                                            <p className="resident-facility-location">
                                                <FiMapPin aria-hidden="true" />
                                                {facility.location}
                                            </p>
                                        )}
                                        <p className="resident-facility-description">
                                            {facility.description || "No description available."}
                                        </p>
                                        <div className="resident-facility-capacity">
                                            <FiUsers aria-hidden="true" />
                                            <span>
                                                Capacity: {facility.capacity
                                                    ? `${facility.capacity} people`
                                                    : "Not specified"}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="resident-facility-reserve"
                                            disabled={!available || hasActiveReservation}
                                            onClick={() => {
                                                if (hasActiveReservation) return;
                                                openReservationModal(facility);
                                            }}
                                        >
                                            <FiCalendar aria-hidden="true" />
                                            {RESERVATION_BUTTON_LABELS[facility.reservationStatus] ||
                                                (available ? "Reserve" : "Unavailable")}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <ResidentPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        limit={10}
                        itemLabel="facility"
                        onPageChange={setCurrentPage}
                    />
                </>
            )}

            {selectedImage && (
                <div
                    className="resident-facility-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Image preview for ${selectedImage.name}`}
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        type="button"
                        aria-label="Close image preview"
                        onClick={() => setSelectedImage(null)}
                    >
                        <FiX aria-hidden="true" />
                    </button>
                    <div onClick={(event) => event.stopPropagation()}>
                        <img src={selectedImage.src} alt={selectedImage.name} />
                        <p>{selectedImage.name}</p>
                    </div>
                </div>
            )}

            {selectedFacility && (
                <div className="resident-reservation-backdrop" onClick={closeReservationModal}>
                    <div
                        className="resident-reservation-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="resident-reservation-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="resident-reservation-close"
                            aria-label="Close reservation form"
                            onClick={closeReservationModal}
                            disabled={submitting}
                        >
                            <FiX aria-hidden="true" />
                        </button>
                        <div className="resident-reservation-modal-heading">
                            <span aria-hidden="true"><FiCalendar /></span>
                            <div>
                                <h2 id="resident-reservation-title">Reserve Facility</h2>
                                <p>Submit your preferred date and schedule.</p>
                            </div>
                        </div>

                        <div className="resident-reservation-facility">
                            <span>Facility</span>
                            <strong>{selectedFacility.facilityName}</strong>
                        </div>

                        {submitError && (
                            <div className="resident-reservation-error" role="alert">
                                {submitError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="resident-reservation-fields">
                                <label className="resident-reservation-field resident-reservation-field-full">
                                    <span>Reservation Date *</span>
                                    <input
                                        type="date"
                                        name="reservationDate"
                                        min={getManilaNow().date}
                                        value={formValues.reservationDate}
                                        onChange={updateFormValue}
                                        disabled={submitting}
                                        required
                                    />
                                </label>
                                <label className="resident-reservation-field">
                                    <span>Start Time *</span>
                                    <div>
                                        <FiClock aria-hidden="true" />
                                        <input
                                            type="time"
                                            name="startTime"
                                            value={formValues.startTime}
                                            onChange={updateFormValue}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>
                                </label>
                                <label className="resident-reservation-field">
                                    <span>End Time *</span>
                                    <div>
                                        <FiClock aria-hidden="true" />
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={formValues.endTime}
                                            onChange={updateFormValue}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>
                                </label>
                                <label className="resident-reservation-field resident-reservation-field-full">
                                    <span>Purpose *</span>
                                    <textarea
                                        name="purpose"
                                        value={formValues.purpose}
                                        onChange={updateFormValue}
                                        disabled={submitting}
                                        rows="4"
                                        placeholder="Enter the purpose of your reservation"
                                        required
                                    />
                                </label>
                            </div>
                            <p className="resident-reservation-note">
                                Reservation requests are subject to administrator approval.
                            </p>
                            <div className="resident-reservation-actions">
                                <button
                                    type="button"
                                    onClick={closeReservationModal}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}>
                                    {submitting ? "Submitting..." : "Submit Request"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default Reservations;
