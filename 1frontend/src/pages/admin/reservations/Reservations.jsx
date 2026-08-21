import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheckCircle, FiHome, FiSearch, FiX } from "react-icons/fi";
import {
    approveReservation,
    completeReservation,
    getAllReservations,
    rejectReservation,
} from "../../../services/reservationService";
import "../../../css/admin/reservation.css";

const FILTERS = {
    requests: [
        ["All", ""],
        ["Pending", "pending"],
        ["Approved", "approved"],
    ],
    history: [
        ["All", ""],
        ["Completed", "completed"],
        ["Rejected", "rejected"],
        ["Cancelled", "cancelled"],
    ],
};

const EMPTY_MESSAGES = {
    requests: {
        "": "No active reservation requests.",
        pending: "No pending reservation requests.",
        approved: "No approved reservations.",
    },
    history: {
        "": "No reservation history found.",
        completed: "No completed reservations.",
        rejected: "No rejected reservations.",
        cancelled: "No cancelled reservations.",
    },
};

const ACTION_CONTENT = {
    approve: {
        title: "Approve Reservation",
        description: "Approve this facility reservation request? The schedule will be checked again before approval.",
        confirm: "Approve",
        loading: "Approving...",
    },
    reject: {
        title: "Reject Reservation",
        description: "Provide a clear reason for rejecting this reservation request.",
        confirm: "Reject",
        loading: "Rejecting...",
    },
    complete: {
        title: "Complete Reservation",
        description: "Mark this approved reservation as completed? It will move to reservation history.",
        confirm: "Mark as Completed",
        loading: "Completing...",
    },
};

const getPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const pages = [...new Set([
        1,
        totalPages,
        currentPage - 2,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        currentPage + 2,
    ])]
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((a, b) => a - b);
    const items = [];
    pages.forEach((page, index) => {
        if (index > 0 && page - pages[index - 1] > 1) {
            items.push(`ellipsis-${page}`);
        }
        items.push(page);
    });
    return items;
};

const formatReservationDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
};

const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
};

const formatTime = (value) => {
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return "—";
    const [hours, minutes] = value.split(":").map(Number);
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
    });
};

const residentName = (user) => {
    if (!user) return "Unavailable resident";
    return [user.firstName, user.middleName, user.lastName]
        .filter(Boolean)
        .join(" ") || user.email || "Unavailable resident";
};

const Reservations = () => {
    const requestControllerRef = useRef(null);
    const actionRef = useRef(false);
    const [reservations, setReservations] = useState([]);
    const [mainTab, setMainTab] = useState("requests");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [failedImages, setFailedImages] = useState(() => new Set());
    const [modalAction, setModalAction] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionError, setActionError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const loadReservations = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setError("");

        try {
            const data = await getAllReservations({
                page: currentPage,
                limit: 10,
                status: selectedStatus,
                type: selectedStatus ? "" : mainTab === "requests" ? "active" : "history",
                search: debouncedSearch,
                signal: controller.signal,
            });
            const pagination = data.pagination || {};
            const nextTotalPages = pagination.totalPages ?? 0;

            if (nextTotalPages > 0 && currentPage > nextTotalPages) {
                setReservations([]);
                setCurrentPage(nextTotalPages);
                return;
            }

            setReservations(Array.isArray(data.reservations) ? data.reservations : []);
            setCurrentPage(pagination.currentPage ?? currentPage);
            setTotalPages(nextTotalPages);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setReservations([]);
                setError(
                    requestError.response?.data?.message ||
                        "Unable to load reservations."
                );
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [currentPage, debouncedSearch, mainTab, selectedStatus]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearch(search.trim());
        }, 400);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const timer = window.setTimeout(loadReservations, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [loadReservations]);

    const closeModal = useCallback(() => {
        if (actionLoading) return;
        setModalAction(null);
        setRejectionReason("");
        setActionError("");
    }, [actionLoading]);

    useEffect(() => {
        if (!selectedImage && !modalAction) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (selectedImage) setSelectedImage(null);
            else closeModal();
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [closeModal, modalAction, selectedImage]);

    const changeMainTab = (tab) => {
        requestControllerRef.current?.abort();
        setMainTab(tab);
        setSelectedStatus("");
        setCurrentPage(1);
        setSuccessMessage("");
    };

    const changeStatus = (status) => {
        requestControllerRef.current?.abort();
        setSelectedStatus(status);
        setCurrentPage(1);
    };

    const clearSearch = () => {
        requestControllerRef.current?.abort();
        setSearch("");
        setDebouncedSearch("");
        setCurrentPage(1);
    };

    const markImageFailed = (reservationId) => {
        setFailedImages((current) => new Set(current).add(reservationId));
    };

    const openAction = (type, reservation) => {
        setModalAction({ type, reservation });
        setRejectionReason("");
        setActionError("");
        setSuccessMessage("");
    };

    const confirmAction = async () => {
        if (!modalAction || actionRef.current || modalAction.type === "reason") return;
        const reason = rejectionReason.trim();
        if (modalAction.type === "reject" && !reason) {
            setActionError("Rejection reason is required.");
            return;
        }

        actionRef.current = true;
        setActionLoading(true);
        setActionError("");
        try {
            const { type, reservation } = modalAction;
            let data;
            if (type === "approve") data = await approveReservation(reservation._id);
            if (type === "reject") data = await rejectReservation(reservation._id, reason);
            if (type === "complete") data = await completeReservation(reservation._id);

            setModalAction(null);
            setRejectionReason("");
            setSuccessMessage(data?.message || "Reservation updated successfully.");
            if (reservations.length === 1 && currentPage > 1) {
                setCurrentPage((page) => page - 1);
            } else {
                await loadReservations();
            }
        } catch (requestError) {
            setActionError(
                requestError.response?.data?.message ||
                    "Unable to update reservation."
            );
        } finally {
            actionRef.current = false;
            setActionLoading(false);
        }
    };

    const modalReservation = modalAction?.reservation;
    const actionContent = modalAction && modalAction.type !== "reason"
        ? ACTION_CONTENT[modalAction.type]
        : null;
    const paginationItems = getPaginationItems(currentPage, totalPages);

    return (
        <section className="admin-page admin-reservations-page">
            <header className="admin-reservation-header">
                <h1>Reservations</h1>
                <p>Review and manage facility reservation requests and history.</p>
            </header>

            {successMessage && (
                <div className="admin-reservation-success" role="status">
                    <FiCheckCircle aria-hidden="true" />
                    <span>{successMessage}</span>
                    <button type="button" aria-label="Dismiss message" onClick={() => setSuccessMessage("")}>
                        <FiX aria-hidden="true" />
                    </button>
                </div>
            )}

            <div className="admin-reservation-primary-tabs" role="tablist" aria-label="Reservation views">
                <button type="button" role="tab" className={mainTab === "requests" ? "active" : ""} aria-selected={mainTab === "requests"} onClick={() => changeMainTab("requests")}>Requests</button>
                <button type="button" role="tab" className={mainTab === "history" ? "active" : ""} aria-selected={mainTab === "history"} onClick={() => changeMainTab("history")}>History</button>
            </div>

            <div className="admin-reservation-controls">
                <div className="admin-reservation-filters" aria-label={`Filter ${mainTab}`}>
                    {FILTERS[mainTab].map(([label, value]) => (
                        <button type="button" key={value || "all"} className={selectedStatus === value ? "active" : ""} aria-pressed={selectedStatus === value} onClick={() => changeStatus(value)}>{label}</button>
                    ))}
                </div>
                <div className="admin-reservation-search">
                    <FiSearch aria-hidden="true" />
                    <input type="search" value={search} onChange={(event) => { requestControllerRef.current?.abort(); setSearch(event.target.value); }} placeholder="Search reservations..." aria-label="Search reservations" />
                    {search && <button type="button" onClick={clearSearch} aria-label="Clear reservation search"><FiX aria-hidden="true" /></button>}
                </div>
            </div>

            {loading ? (
                <div className="admin-reservation-state" role="status"><span className="admin-reservation-loader" aria-hidden="true" /><p>Loading reservations...</p></div>
            ) : error ? (
                <div className="admin-reservation-state error" role="alert"><h2>Reservations could not be loaded</h2><p>{error}</p><button type="button" onClick={loadReservations}>Retry</button></div>
            ) : reservations.length === 0 ? (
                <div className="admin-reservation-state"><FiHome aria-hidden="true" /><h2>{EMPTY_MESSAGES[mainTab][selectedStatus]}</h2><p>{debouncedSearch ? "Try a different resident, facility, or purpose search." : "Reservations matching this view will appear here."}</p></div>
            ) : (
                <div className="admin-reservation-table-card">
                    <div className="admin-reservation-table-wrap">
                        <table className="admin-reservation-table">
                            <thead><tr><th>Resident</th><th>Facility</th><th>Reservation Date</th><th>Time</th><th>Purpose</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
                            <tbody>{reservations.map((reservation) => {
                                const facility = reservation.facility;
                                const user = reservation.user;
                                const facilityName = facility?.facilityName || "Unavailable facility";
                                return <tr key={reservation._id}>
                                    <td><div className="admin-reservation-person"><strong>{residentName(user)}</strong>{user?.email && <span>{user.email}</span>}</div></td>
                                    <td><div className="admin-reservation-facility">
                                        {facility?.image && !failedImages.has(reservation._id) ? <button type="button" className="admin-reservation-image-button" aria-label={`View larger image of ${facilityName}`} onClick={() => setSelectedImage({ src: facility.image, name: facilityName })}><img src={facility.image} alt={facilityName} onError={() => markImageFailed(reservation._id)} /></button> : <span className="admin-reservation-image-placeholder" aria-hidden="true"><FiHome /></span>}
                                        <div><strong>{facilityName}</strong>{facility?.category && <span>{facility.category}</span>}</div>
                                    </div></td>
                                    <td>{formatReservationDate(reservation.reservationDate)}</td>
                                    <td><span className="admin-reservation-time">{formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}</span></td>
                                    <td><span className="admin-reservation-purpose" title={reservation.purpose}>{reservation.purpose}</span></td>
                                    <td><span className={`admin-reservation-status ${reservation.status}`}>{reservation.status}</span>{reservation.status === "completed" && reservation.completedAt && <small>Completed {formatDateTime(reservation.completedAt)}</small>}</td>
                                    <td>{formatDateTime(reservation.createdAt)}</td>
                                    <td><div className="admin-reservation-actions">
                                        {mainTab === "requests" && reservation.status === "pending" && <><button type="button" className="approve" onClick={() => openAction("approve", reservation)}>Approve</button><button type="button" className="reject" onClick={() => openAction("reject", reservation)}>Reject</button></>}
                                        {mainTab === "requests" && reservation.status === "approved" && <button type="button" className="complete" onClick={() => openAction("complete", reservation)}>Mark as Completed</button>}
                                        {mainTab === "history" && reservation.status === "rejected" && reservation.rejectionReason ? <button type="button" className="reason" onClick={() => openAction("reason", reservation)}>View Reason</button> : mainTab === "history" && <span>Read only</span>}
                                    </div></td>
                                </tr>;
                            })}</tbody>
                        </table>
                    </div>
                    <footer className="admin-reservation-pagination-footer">
                        <p>Page {currentPage} of {totalPages} · {totalItems} reservations</p>
                        <nav className="admin-reservation-pagination" aria-label="Reservation pages">
                            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button>
                            {paginationItems.map((item) => typeof item === "number" ? <button type="button" key={item} className={item === currentPage ? "active" : ""} aria-current={item === currentPage ? "page" : undefined} onClick={() => setCurrentPage(item)}>{item}</button> : <span key={item} aria-hidden="true">…</span>)}
                            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button>
                        </nav>
                    </footer>
                </div>
            )}

            {selectedImage && <div className="admin-reservation-lightbox" role="dialog" aria-modal="true" aria-label={`Image preview for ${selectedImage.name}`} onClick={() => setSelectedImage(null)}><button type="button" aria-label="Close image preview" onClick={() => setSelectedImage(null)}><FiX aria-hidden="true" /></button><div onClick={(event) => event.stopPropagation()}><img src={selectedImage.src} alt={selectedImage.name} /><p>{selectedImage.name}</p></div></div>}

            {modalAction && <div className="admin-reservation-modal-backdrop" onClick={closeModal}><div className="admin-reservation-modal" role={modalAction.type === "reason" ? "dialog" : "alertdialog"} aria-modal="true" aria-labelledby="admin-reservation-modal-title" onClick={(event) => event.stopPropagation()}>
                {modalAction.type === "reason" ? <><h2 id="admin-reservation-modal-title">Reason for Rejection</h2><div className="admin-reservation-modal-summary"><strong>{modalReservation?.facility?.facilityName || "Unavailable facility"}</strong><span>{formatReservationDate(modalReservation?.reservationDate)}</span></div><div className="admin-reservation-reason-text">{modalReservation?.rejectionReason}</div><div className="admin-reservation-modal-actions"><button type="button" className="cancel" onClick={closeModal}>Close</button></div></> : <><h2 id="admin-reservation-modal-title">{actionContent.title}</h2><p>{actionContent.description}</p><div className="admin-reservation-modal-summary"><strong>{modalReservation?.facility?.facilityName || "Unavailable facility"}</strong><span>{formatReservationDate(modalReservation?.reservationDate)} · {formatTime(modalReservation?.startTime)} – {formatTime(modalReservation?.endTime)}</span></div>{modalAction.type === "reject" && <><label htmlFor="adminRejectionReason">Rejection Reason</label><textarea id="adminRejectionReason" value={rejectionReason} onChange={(event) => { setRejectionReason(event.target.value); setActionError(""); }} rows="4" disabled={actionLoading} placeholder="Explain why this request is being rejected" /></>}{actionError && <div className="admin-reservation-modal-error" role="alert">{actionError}</div>}<div className="admin-reservation-modal-actions"><button type="button" className="cancel" onClick={closeModal} disabled={actionLoading}>Cancel</button><button type="button" className={`confirm ${modalAction.type === "reject" ? "reject" : ""}`} onClick={confirmAction} disabled={actionLoading}>{actionLoading ? actionContent.loading : actionContent.confirm}</button></div></>}
            </div></div>}
        </section>
    );
};

export default Reservations;
