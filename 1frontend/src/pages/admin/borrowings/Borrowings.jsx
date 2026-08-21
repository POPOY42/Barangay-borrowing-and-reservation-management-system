import { useCallback, useEffect, useRef, useState } from "react";
import {
    approveBorrowing,
    getAllBorrowings,
    markAsBorrowed,
    markAsReturned,
    rejectBorrowing,
} from "../../../services/borrowingService";
import "../../../css/admin/borrowing.css";

const STATUS_FILTERS = [
    ["All", ""], ["Pending", "pending"], ["Approved", "approved"],
    ["Borrowed", "borrowed"],
];

const ACTION_CONTENT = {
    approve: ["Approve Borrowing Request?", "Approve", "Approving...", "The resident will be allowed to claim the equipment at the barangay."],
    release: ["Release Equipment?", "Confirm Release", "Releasing...", "Available inventory will be reduced by the backend."],
    return: ["Confirm Equipment Return?", "Mark Returned", "Returning...", "The equipment will be added back to available inventory by the backend."],
};

const paginationItems = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const pages = [...new Set([1, total, current - 1, current, current + 1])]
        .filter((page) => page >= 1 && page <= total)
        .sort((a, b) => a - b);
    return pages.flatMap((page, index) => {
        const previous = pages[index - 1];
        return previous && page - previous > 1 ? [`ellipsis-${previous}`, page] : [page];
    });
};

const formatDate = (value, includeTime = false) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-PH", {
        month: "short", day: "numeric", year: "numeric",
        ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(date);
};

const residentName = (user) => {
    if (!user) return "Unavailable resident";
    return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ") ||
        user.email || "Unavailable resident";
};

const Borrowings = () => {
    const [borrowings, setBorrowings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [modalAction, setModalAction] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionError, setActionError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [failedImages, setFailedImages] = useState(() => new Set());
    const requestControllerRef = useRef(null);

    const fetchBorrowings = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setError("");
        try {
            const data = await getAllBorrowings({
                page: currentPage,
                status: selectedStatus,
                type: selectedStatus ? "" : "active",
                signal: controller.signal,
            });
            const pagination = data.pagination ?? {};
            setBorrowings(Array.isArray(data.borrowings) ? data.borrowings : []);
            setTotalPages(pagination.totalPages ?? 0);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setBorrowings([]);
                setError(requestError.response?.data?.message || "Unable to load borrowing requests. Please try again.");
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [currentPage, selectedStatus]);

    useEffect(() => {
        const timer = window.setTimeout(fetchBorrowings, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [fetchBorrowings]);

    const closeModal = useCallback(() => {
        if (actionLoading) return;
        setModalAction(null);
        setRejectionReason("");
        setActionError("");
    }, [actionLoading]);

    useEffect(() => {
        if (!modalAction) return undefined;
        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event) => event.key === "Escape" && closeModal();
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [modalAction, closeModal]);

    useEffect(() => {
        if (!selectedImage) return undefined;
        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event) => {
            if (event.key === "Escape") setSelectedImage(null);
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [selectedImage]);

    const markImageFailed = (borrowingId) => {
        setFailedImages((current) => new Set(current).add(borrowingId));
    };

    const changeStatus = (status) => {
        requestControllerRef.current?.abort();
        setSelectedStatus(status);
        setCurrentPage(1);
    };

    const openModal = (type, borrowing) => {
        setModalAction({ type, borrowing });
        setRejectionReason("");
        setActionError("");
    };

    const confirmAction = async () => {
        if (!modalAction || actionLoading) return;
        const reason = rejectionReason.trim();
        if (modalAction.type === "reject" && !reason) {
            setActionError("Rejection reason is required.");
            return;
        }
        setActionLoading(true);
        setActionError("");
        try {
            const { type, borrowing } = modalAction;
            if (type === "approve") await approveBorrowing(borrowing._id);
            if (type === "reject") await rejectBorrowing(borrowing._id, reason);
            if (type === "release") await markAsBorrowed(borrowing._id);
            if (type === "return") await markAsReturned(borrowing._id);
            setModalAction(null);
            setRejectionReason("");
            if (borrowings.length === 1 && currentPage > 1) {
                setCurrentPage((page) => page - 1);
            } else {
                await fetchBorrowings();
            }
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to complete this action. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    const modalItem = modalAction?.borrowing;
    const modalContent = modalAction ? ACTION_CONTENT[modalAction.type] : null;

    return (
        <section className="admin-page borrowing-page">
            <header className="borrowing-header">
                <h1>Borrowing Requests</h1>
                <p>Review requests and manage equipment release and return.</p>
            </header>

            <div className="borrowing-filter-tabs" aria-label="Filter borrowing requests">
                {STATUS_FILTERS.map(([label, value]) => (
                    <button type="button" key={value || "all"}
                        className={`borrowing-filter-btn ${selectedStatus === value ? "active" : ""}`}
                        aria-pressed={selectedStatus === value} onClick={() => changeStatus(value)}>
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="borrowing-state" role="status"><span className="borrowing-loader" /><p>Loading borrowing requests...</p></div>
            ) : error ? (
                <div className="borrowing-state borrowing-error" role="alert"><h2>Borrowing requests could not be loaded</h2><p>{error}</p><button type="button" onClick={fetchBorrowings}>Retry</button></div>
            ) : borrowings.length === 0 ? (
                <div className="borrowing-state"><h2>{selectedStatus ? `No ${selectedStatus} borrowing requests found.` : "No active borrowing requests found."}</h2><p>Requests matching this view will appear here.</p></div>
            ) : (
                <div className="borrowing-list-card">
                    <div className="borrowing-table-wrapper">
                        <table className="borrowing-table">
                            <thead><tr><th>Resident</th><th>Equipment</th><th>Qty</th><th>Borrow Date</th><th>Return Date</th><th>Purpose</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
                            <tbody>{borrowings.map((item) => (
                                <tr key={item._id}>
                                    <td><div className="borrowing-resident"><strong>{residentName(item.user)}</strong>{item.user?.email && <span>{item.user.email}</span>}</div></td>
                                    <td><div className="borrowing-equipment">
                                        {item.equipment?.image && !failedImages.has(item._id) ? (
                                            <button
                                                type="button"
                                                className="borrowing-equipment-image-button"
                                                aria-label={`View larger image of ${item.equipment?.equipmentName || "equipment"}`}
                                                onClick={() => setSelectedImage({
                                                    src: item.equipment.image,
                                                    name: item.equipment?.equipmentName || "Equipment",
                                                })}
                                            >
                                                <img
                                                    src={item.equipment.image}
                                                    alt={item.equipment?.equipmentName || "Equipment"}
                                                    onError={() => markImageFailed(item._id)}
                                                />
                                            </button>
                                        ) : (
                                            <span className="borrowing-equipment-placeholder" aria-hidden="true">
                                                {item.equipment?.equipmentName?.charAt(0).toUpperCase() || "E"}
                                            </span>
                                        )}
                                        <strong>{item.equipment?.equipmentName || "Unavailable equipment"}</strong>
                                    </div></td>
                                    <td>{item.quantity}</td>
                                    <td>{formatDate(item.borrowDate)}</td>
                                    <td>{formatDate(item.actualReturnDate || item.returnDate)}{item.actualReturnDate && <small>Actual return</small>}</td>
                                    <td><span className="borrowing-purpose">{item.purpose}</span></td>
                                    <td><span className={`borrowing-status borrowing-status-${item.status}`}>{item.status}</span>{item.status === "rejected" && item.rejectionReason && <small className="borrowing-reason">{item.rejectionReason}</small>}</td>
                                    <td>{formatDate(item.createdAt, true)}</td>
                                    <td><div className="borrowing-actions">
                                        {item.status === "pending" && <><button type="button" className="borrowing-action approve" onClick={() => openModal("approve", item)}>Approve</button><button type="button" className="borrowing-action reject" onClick={() => openModal("reject", item)}>Reject</button></>}
                                        {item.status === "approved" && <button type="button" className="borrowing-action approve" onClick={() => openModal("release", item)}>Release Equipment</button>}
                                        {item.status === "borrowed" && <button type="button" className="borrowing-action approve" onClick={() => openModal("return", item)}>Mark as Returned</button>}
                                        {["returned", "rejected", "cancelled"].includes(item.status) && <span className="borrowing-view-only">View only</span>}
                                    </div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    <footer className="borrowing-pagination-footer">
                        <p>Page {currentPage} of {totalPages} · {totalItems} total requests</p>
                        {totalPages > 1 && <nav className="borrowing-pagination" aria-label="Borrowing request pages">
                            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button>
                            {paginationItems(currentPage, totalPages).map((item) => typeof item === "number" ? <button type="button" key={item} className={item === currentPage ? "active" : ""} aria-current={item === currentPage ? "page" : undefined} onClick={() => setCurrentPage(item)}>{item}</button> : <span key={item}>…</span>)}
                            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button>
                        </nav>}
                    </footer>
                </div>
            )}

            {selectedImage && <div
                className="borrowing-lightbox"
                role="dialog"
                aria-modal="true"
                aria-label={`Image preview for ${selectedImage.name}`}
                onClick={() => setSelectedImage(null)}
            >
                <button
                    type="button"
                    className="borrowing-lightbox-close"
                    aria-label="Close image preview"
                    onClick={() => setSelectedImage(null)}
                >
                    ×
                </button>
                <div className="borrowing-lightbox-content" onClick={(event) => event.stopPropagation()}>
                    <img src={selectedImage.src} alt={selectedImage.name} />
                    <p>{selectedImage.name}</p>
                </div>
            </div>}

            {modalAction && <div className="borrowing-modal-backdrop" onClick={closeModal}>
                <div className="borrowing-modal" role="dialog" aria-modal="true" aria-labelledby="borrowing-modal-title" onClick={(event) => event.stopPropagation()}>
                    <h2 id="borrowing-modal-title">{modalAction.type === "reject" ? "Reject Borrowing Request?" : modalContent[0]}</h2>
                    {modalAction.type === "reject" ? <>
                        <p>Please provide a reason for rejecting this request.</p>
                        <label htmlFor="rejectionReason">Rejection reason</label>
                        <textarea id="rejectionReason" rows="4" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} disabled={actionLoading} autoFocus />
                    </> : <><p>Confirm <strong>{modalItem.equipment?.equipmentName || "this equipment"}</strong> for the resident.</p><div className="borrowing-modal-summary"><span>Quantity</span><strong>{modalItem.quantity}</strong></div><p>{modalContent[3]}</p></>}
                    {actionError && <div className="borrowing-modal-error" role="alert">{actionError}</div>}
                    <div className="borrowing-modal-actions">
                        <button type="button" className="cancel" onClick={closeModal} disabled={actionLoading}>Cancel</button>
                        <button type="button" className={modalAction.type === "reject" ? "confirm reject" : "confirm"} onClick={confirmAction} disabled={actionLoading}>
                            {actionLoading ? (modalAction.type === "reject" ? "Rejecting..." : modalContent[2]) : (modalAction.type === "reject" ? "Reject" : modalContent[1])}
                        </button>
                    </div>
                </div>
            </div>}
        </section>
    );
};

export default Borrowings;
