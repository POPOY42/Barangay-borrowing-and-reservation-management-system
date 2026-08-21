import { useCallback, useEffect, useRef, useState } from "react";
import {
    FiAlertTriangle,
    FiCalendar,
    FiCheckCircle,
    FiClock,
    FiEdit2,
    FiHome,
    FiImage,
    FiMapPin,
    FiSlash,
    FiX,
} from "react-icons/fi";
import ResidentPagination from "../../components/resident/ResidentPagination";
import {
    cancelReservation,
    getGroupedMyReservations,
    getMyFacilityReservationHistory,
    getMyReservations,
    updateReservation,
} from "../../services/reservationService";
import "../../css/resident/reservation.css";

const STATUS_TABS = [
    { value: "", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
    { value: "completed", label: "Completed" },
];

const EMPTY_MESSAGES = {
    "": "You have no reservation requests yet.",
    pending: "No pending reservations.",
    approved: "No approved reservations.",
    rejected: "No rejected reservations.",
    cancelled: "No cancelled reservations.",
    completed: "No completed reservations.",
};

const READ_ONLY_MESSAGES = {
    approved: "Reservation Approved",
    rejected: "This reservation request was rejected.",
    cancelled: "This reservation request was cancelled.",
    completed: "This reservation has been completed.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
});

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

const toDateInputValue = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : dateFormatter.format(date);
};

const formatDateTime = (value) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
    }).format(date);
};

const formatTime = (value) => {
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
        return "Time unavailable";
    }
    const [hours, minutes] = value.split(":").map(Number);
    const date = new Date(2000, 0, 1, hours, minutes);
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
};

const formatTimeRange = (startTime, endTime) =>
    `${formatTime(startTime)} – ${formatTime(endTime)}`;

const validateEditValues = (values) => {
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

const ReservationFacilityImage = ({ reservation, onOpen }) => {
    const [failed, setFailed] = useState(false);
    const facility = reservation.facility;

    if (!facility?.image || failed) {
        return (
            <div className="resident-my-reservation-image-placeholder" aria-hidden="true">
                {facility ? <FiImage /> : <FiHome />}
            </div>
        );
    }

    return (
        <button
            type="button"
            className="resident-my-reservation-image-button"
            aria-label={`View larger image of ${facility.facilityName}`}
            onClick={() => onOpen({ src: facility.image, name: facility.facilityName })}
        >
            <img
                src={facility.image}
                alt={facility.facilityName}
                onError={() => setFailed(true)}
            />
        </button>
    );
};

const MyReservations = () => {
    const requestControllerRef = useRef(null);
    const savingRef = useRef(false);
    const cancellingRef = useRef(false);
    const [reservations, setReservations] = useState([]);
    const [status, setStatus] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [editingReservation, setEditingReservation] = useState(null);
    const [editValues, setEditValues] = useState({
        reservationDate: "",
        startTime: "",
        endTime: "",
        purpose: "",
    });
    const [editError, setEditError] = useState("");
    const [saving, setSaving] = useState(false);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelError, setCancelError] = useState("");
    const [cancelling, setCancelling] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [historyItem, setHistoryItem] = useState(null);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");

    const loadReservations = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setLoadError("");

        try {
            const data = status
                ? await getMyReservations({
                    page: currentPage,
                    limit: 10,
                    status,
                    signal: controller.signal,
                })
                : await getGroupedMyReservations(currentPage, controller.signal);
            const pagination = data.pagination || {};
            const nextTotalPages = pagination.totalPages ?? 0;

            if (nextTotalPages > 0 && currentPage > nextTotalPages) {
                setReservations([]);
                setCurrentPage(nextTotalPages);
                return;
            }

            const records = Array.isArray(data.reservations) ? data.reservations : [];
            setReservations(status
                ? records
                : records
                    .filter((group) => group.latestReservation)
                    .map((group) => ({
                        ...group.latestReservation,
                        facilityId: group.facilityId,
                        facility: group.facility || group.latestReservation.facility,
                        previousCount: group.previousCount,
                    }))
            );
            setCurrentPage(pagination.currentPage ?? currentPage);
            setTotalPages(nextTotalPages);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setReservations([]);
                setLoadError(
                    requestError.response?.data?.message ||
                        "Unable to load reservations."
                );
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [currentPage, status]);

    useEffect(() => {
        const timer = window.setTimeout(loadReservations, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [loadReservations]);

    useEffect(() => {
        if (!selectedImage && !editingReservation && !cancelTarget && !historyItem) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (selectedImage) setSelectedImage(null);
            else if (historyItem) {
                setHistoryItem(null);
                setHistoryRecords([]);
                setHistoryError("");
            }
            else if (editingReservation && !saving) {
                setEditingReservation(null);
                setEditError("");
            } else if (cancelTarget && !cancelling) {
                setCancelTarget(null);
                setCancelError("");
            }
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [cancelTarget, cancelling, editingReservation, historyItem, saving, selectedImage]);

    const openHistory = async (reservation) => {
        const facilityId = reservation.facility?._id || reservation.facilityId;
        setHistoryItem(reservation);
        setHistoryRecords([]);
        setHistoryError("");
        setHistoryLoading(false);

        if (!facilityId) {
            setHistoryError("The facility reference for this history is unavailable.");
            return;
        }

        setHistoryLoading(true);
        try {
            const data = await getMyFacilityReservationHistory(facilityId);
            const records = Array.isArray(data.reservations) ? data.reservations : [];
            setHistoryRecords(records.filter((record) => record._id !== reservation._id));
        } catch (requestError) {
            setHistoryError(
                requestError.response?.data?.message ||
                    "Unable to load previous reservation requests."
            );
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeHistory = () => {
        setHistoryItem(null);
        setHistoryRecords([]);
        setHistoryError("");
        setHistoryLoading(false);
    };

    const changeStatus = (nextStatus) => {
        requestControllerRef.current?.abort();
        setStatus(nextStatus);
        setCurrentPage(1);
    };

    const openEditModal = (reservation) => {
        if (reservation.status !== "pending") return;
        setEditingReservation(reservation);
        setEditValues({
            reservationDate: toDateInputValue(reservation.reservationDate),
            startTime: reservation.startTime || "",
            endTime: reservation.endTime || "",
            purpose: reservation.purpose || "",
        });
        setEditError("");
        setSuccessMessage("");
    };

    const closeEditModal = () => {
        if (saving) return;
        setEditingReservation(null);
        setEditError("");
    };

    const updateEditValue = (event) => {
        const { name, value } = event.target;
        setEditValues((current) => ({ ...current, [name]: value }));
        setEditError("");
    };

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        if (!editingReservation || savingRef.current) return;

        const validationError = validateEditValues(editValues);
        if (validationError) {
            setEditError(validationError);
            return;
        }

        savingRef.current = true;
        setSaving(true);
        setEditError("");
        try {
            const data = await updateReservation(editingReservation._id, {
                reservationDate: editValues.reservationDate,
                startTime: editValues.startTime,
                endTime: editValues.endTime,
                purpose: editValues.purpose.trim(),
            });
            setEditingReservation(null);
            setSuccessMessage(data.message || "Reservation request updated successfully.");
            await loadReservations();
        } catch (requestError) {
            const message = requestError.response?.data?.message ||
                "Unable to update reservation.";
            setEditError(message);
            if (/pending/i.test(message)) await loadReservations();
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    const openCancelModal = (reservation) => {
        if (reservation.status !== "pending") return;
        setCancelTarget(reservation);
        setCancelError("");
        setSuccessMessage("");
    };

    const closeCancelModal = () => {
        if (cancelling) return;
        setCancelTarget(null);
        setCancelError("");
    };

    const handleCancel = async () => {
        if (!cancelTarget || cancellingRef.current) return;

        cancellingRef.current = true;
        setCancelling(true);
        setCancelError("");
        try {
            const data = await cancelReservation(cancelTarget._id);
            setCancelTarget(null);
            setSuccessMessage(data.message || "Reservation request cancelled successfully.");
            await loadReservations();
        } catch (requestError) {
            const message = requestError.response?.data?.message ||
                "Unable to cancel reservation.";
            setCancelError(message);
            if (/pending/i.test(message)) await loadReservations();
        } finally {
            cancellingRef.current = false;
            setCancelling(false);
        }
    };

    return (
        <section className="resident-page resident-my-reservations-page">
            <header className="resident-page-heading">
                <span>Your Schedule</span>
                <h1>My Reservations</h1>
                <p>Track and manage your facility reservation requests.</p>
            </header>

            {successMessage && (
                <div className="resident-reservation-success" role="status">
                    <FiCheckCircle aria-hidden="true" />
                    <span>{successMessage}</span>
                    <button
                        type="button"
                        aria-label="Dismiss success message"
                        onClick={() => setSuccessMessage("")}
                    >
                        <FiX aria-hidden="true" />
                    </button>
                </div>
            )}

            <div className="resident-reservation-tabs" role="tablist" aria-label="Reservation status">
                {STATUS_TABS.map((tab) => (
                    <button
                        type="button"
                        role="tab"
                        key={tab.value || "all"}
                        className={status === tab.value ? "active" : ""}
                        aria-selected={status === tab.value}
                        onClick={() => changeStatus(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="resident-my-reservation-state" role="status">
                    <span className="resident-facility-loader" aria-hidden="true" />
                    <p>Loading reservations...</p>
                </div>
            ) : loadError ? (
                <div className="resident-my-reservation-state error" role="alert">
                    <h2>Reservations could not be loaded</h2>
                    <p>{loadError}</p>
                    <button type="button" onClick={loadReservations}>Retry</button>
                </div>
            ) : reservations.length === 0 ? (
                <div className="resident-my-reservation-state">
                    <FiCalendar aria-hidden="true" />
                    <h2>{EMPTY_MESSAGES[status]}</h2>
                    <p>Your matching facility reservation requests will appear here.</p>
                </div>
            ) : (
                <>
                    <div className="resident-my-reservation-grid">
                        {reservations.map((reservation) => {
                            const facility = reservation.facility;
                            const facilityName = facility?.facilityName || "Unavailable facility";
                            const pending = reservation.status === "pending";

                            return (
                                <article className="resident-my-reservation-card" key={reservation._id}>
                                    <div className="resident-my-reservation-header">
                                        <ReservationFacilityImage
                                            reservation={reservation}
                                            onOpen={setSelectedImage}
                                        />
                                        <div>
                                            <span>{facility?.category || "Facility unavailable"}</span>
                                            <h2>{facilityName}</h2>
                                            {facility?.location && (
                                                <p><FiMapPin aria-hidden="true" />{facility.location}</p>
                                            )}
                                        </div>
                                        <span className={`resident-reservation-status ${reservation.status}`}>
                                            {reservation.status}
                                        </span>
                                    </div>

                                    <dl className="resident-my-reservation-details">
                                        <div><dt>Reservation Date</dt><dd>{formatDate(reservation.reservationDate)}</dd></div>
                                        <div><dt>Time</dt><dd>{formatTimeRange(reservation.startTime, reservation.endTime)}</dd></div>
                                        <div className="wide"><dt>Requested</dt><dd>{formatDateTime(reservation.createdAt)}</dd></div>
                                        <div className="wide"><dt>Purpose</dt><dd>{reservation.purpose}</dd></div>
                                        {reservation.status === "rejected" && (
                                            <div className="wide rejection"><dt>Rejection Reason</dt><dd>{reservation.rejectionReason || "No reason provided."}</dd></div>
                                        )}
                                        {reservation.completedAt && (
                                            <div className="wide"><dt>Completed</dt><dd>{formatDateTime(reservation.completedAt)}</dd></div>
                                        )}
                                    </dl>

                                    {!status && reservation.previousCount > 0 && (
                                        <div className="resident-reservation-history-link">
                                            <span>
                                                Previous {reservation.previousCount === 1 ? "request" : "requests"}: {reservation.previousCount}
                                            </span>
                                            <button type="button" onClick={() => openHistory(reservation)}>View History</button>
                                        </div>
                                    )}

                                    {pending ? (
                                        <div className="resident-my-reservation-actions">
                                            {facility && (
                                                <button type="button" onClick={() => openEditModal(reservation)}>
                                                    <FiEdit2 aria-hidden="true" />Edit Request
                                                </button>
                                            )}
                                            <button type="button" onClick={() => openCancelModal(reservation)}>
                                                <FiSlash aria-hidden="true" />Cancel Request
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="resident-my-reservation-footer">
                                            <strong className={`resident-reservation-readonly ${reservation.status}`}>
                                                {READ_ONLY_MESSAGES[reservation.status]}
                                            </strong>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>

                    <ResidentPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        limit={10}
                        itemLabel={status ? "reservation" : "facility"}
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
                    <button type="button" aria-label="Close image preview" onClick={() => setSelectedImage(null)}>
                        <FiX aria-hidden="true" />
                    </button>
                    <div onClick={(event) => event.stopPropagation()}>
                        <img src={selectedImage.src} alt={selectedImage.name} />
                        <p>{selectedImage.name}</p>
                    </div>
                </div>
            )}

            {historyItem && (
                <div className="resident-reservation-backdrop" onClick={closeHistory}>
                    <div
                        className="resident-reservation-history-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reservation-history-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="resident-reservation-history-heading">
                            <div>
                                <h2 id="reservation-history-title">
                                    {historyItem.facility?.facilityName || "Unavailable facility"} Reservation History
                                </h2>
                                <p>Previous reservation requests, newest first.</p>
                            </div>
                            <button type="button" aria-label="Close reservation history" onClick={closeHistory}>
                                <FiX aria-hidden="true" />
                            </button>
                        </div>

                        {historyLoading ? (
                            <div className="resident-reservation-history-state" role="status">
                                <span className="resident-facility-loader" aria-hidden="true" />
                                <p>Loading reservation history...</p>
                            </div>
                        ) : historyError ? (
                            <div className="resident-reservation-error" role="alert">{historyError}</div>
                        ) : historyRecords.length === 0 ? (
                            <div className="resident-reservation-history-state">No previous requests found.</div>
                        ) : (
                            <div className="resident-reservation-history-list">
                                {historyRecords.map((record) => (
                                    <article key={record._id}>
                                        <span className={`resident-reservation-status ${record.status}`}>{record.status}</span>
                                        <dl>
                                            <div><dt>Reservation Date</dt><dd>{formatDate(record.reservationDate)}</dd></div>
                                            <div><dt>Time</dt><dd>{formatTimeRange(record.startTime, record.endTime)}</dd></div>
                                            <div className="wide"><dt>Requested</dt><dd>{formatDateTime(record.createdAt)}</dd></div>
                                            <div className="wide"><dt>Purpose</dt><dd>{record.purpose}</dd></div>
                                            {record.status === "rejected" && (
                                                <div className="wide rejection"><dt>Rejection Reason</dt><dd>{record.rejectionReason || "No reason provided."}</dd></div>
                                            )}
                                            {record.completedAt && (
                                                <div className="wide"><dt>Completed</dt><dd>{formatDateTime(record.completedAt)}</dd></div>
                                            )}
                                        </dl>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingReservation && (
                <div className="resident-reservation-backdrop" onClick={closeEditModal}>
                    <div
                        className="resident-reservation-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-reservation-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="resident-reservation-close"
                            aria-label="Close edit form"
                            onClick={closeEditModal}
                            disabled={saving}
                        >
                            <FiX aria-hidden="true" />
                        </button>
                        <div className="resident-reservation-modal-heading">
                            <span aria-hidden="true"><FiEdit2 /></span>
                            <div>
                                <h2 id="edit-reservation-title">Edit Reservation Request</h2>
                                <p>Update your preferred date, schedule, or purpose.</p>
                            </div>
                        </div>
                        <div className="resident-reservation-facility">
                            <span>Facility</span>
                            <strong>{editingReservation.facility?.facilityName || "Unavailable facility"}</strong>
                        </div>
                        {editError && <div className="resident-reservation-error" role="alert">{editError}</div>}
                        <form onSubmit={handleEditSubmit} noValidate>
                            <div className="resident-reservation-fields">
                                <label className="resident-reservation-field resident-reservation-field-full">
                                    <span>Reservation Date *</span>
                                    <input type="date" name="reservationDate" min={getManilaNow().date} value={editValues.reservationDate} onChange={updateEditValue} disabled={saving} required />
                                </label>
                                <label className="resident-reservation-field">
                                    <span>Start Time *</span>
                                    <div><FiClock aria-hidden="true" /><input type="time" name="startTime" value={editValues.startTime} onChange={updateEditValue} disabled={saving} required /></div>
                                </label>
                                <label className="resident-reservation-field">
                                    <span>End Time *</span>
                                    <div><FiClock aria-hidden="true" /><input type="time" name="endTime" value={editValues.endTime} onChange={updateEditValue} disabled={saving} required /></div>
                                </label>
                                <label className="resident-reservation-field resident-reservation-field-full">
                                    <span>Purpose *</span>
                                    <textarea name="purpose" value={editValues.purpose} onChange={updateEditValue} disabled={saving} rows="4" required />
                                </label>
                            </div>
                            <div className="resident-reservation-actions">
                                <button type="button" onClick={closeEditModal} disabled={saving}>Cancel</button>
                                <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {cancelTarget && (
                <div className="resident-reservation-backdrop" onClick={closeCancelModal}>
                    <div
                        className="resident-cancel-reservation-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="cancel-reservation-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <span className="resident-cancel-reservation-icon" aria-hidden="true">
                            <FiAlertTriangle />
                        </span>
                        <h2 id="cancel-reservation-title">Cancel Reservation</h2>
                        <p>Are you sure you want to cancel your reservation for:</p>
                        <div className="resident-cancel-reservation-summary">
                            <strong>{cancelTarget.facility?.facilityName || "Unavailable facility"}</strong>
                            <span>{formatDate(cancelTarget.reservationDate)}</span>
                            <span>{formatTimeRange(cancelTarget.startTime, cancelTarget.endTime)}</span>
                        </div>
                        {cancelError && <div className="resident-reservation-error" role="alert">{cancelError}</div>}
                        <div className="resident-cancel-reservation-actions">
                            <button type="button" onClick={closeCancelModal} disabled={cancelling}>Keep Reservation</button>
                            <button type="button" onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? "Cancelling..." : "Cancel Reservation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default MyReservations;
