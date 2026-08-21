import { useCallback, useEffect, useRef, useState } from "react";
import { FiClipboard, FiEdit2, FiXCircle } from "react-icons/fi";
import ResidentPagination from "../../components/resident/ResidentPagination";
import {
    cancelBorrowing,
    getGroupedMyBorrowings,
    getMyEquipmentBorrowingHistory,
    getMyBorrowings,
    updateBorrowing,
} from "../../services/borrowingService";
import "../../css/resident/myBorrowings.css";

const FILTERS = ["", "pending", "approved", "borrowed", "returned", "rejected", "cancelled"];
const EMPTY_MESSAGES = {
    "": "No borrowing records found.", pending: "No pending borrowing requests.",
    approved: "No approved borrowing requests.", borrowed: "No equipment currently borrowed.",
    returned: "No returned borrowing records.", rejected: "No rejected borrowing requests.",
    cancelled: "No cancelled borrowing requests.",
};
const STATUS_NOTES = {
    approved: "Approved / Ready for Claim",
    borrowed: "Currently Borrowed",
};

const formatDate = (value, withTime = false) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-PH", {
        month: "short", day: "numeric", year: "numeric",
        timeZone: "Asia/Manila",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(date);
};

const inputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
const localToday = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const MyBorrowings = () => {
    const [borrowings, setBorrowings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedImage, setSelectedImage] = useState(null);
    const [failedImages, setFailedImages] = useState(() => new Set());
    const [editItem, setEditItem] = useState(null);
    const [cancelItem, setCancelItem] = useState(null);
    const [form, setForm] = useState({ quantity: "", purpose: "", borrowDate: "", returnDate: "" });
    const [actionError, setActionError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [historyItem, setHistoryItem] = useState(null);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const requestControllerRef = useRef(null);
    const actionRef = useRef(false);
    const today = localToday();

    const fetchBorrowings = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true); setError("");
        try {
            const data = status
                ? await getMyBorrowings(currentPage, status, controller.signal)
                : await getGroupedMyBorrowings(currentPage, controller.signal);
            const pagination = data.pagination ?? {};
            const records = Array.isArray(data.borrowings) ? data.borrowings : [];
            setBorrowings(
                status
                    ? records
                    : records
                        .filter((group) => group.latestBorrowing)
                        .map((group) => ({
                            ...group.latestBorrowing,
                            equipmentId: group.equipmentId,
                            equipment:
                                group.equipment || group.latestBorrowing.equipment,
                            previousCount: group.previousCount,
                        }))
            );
            setTotalPages(pagination.totalPages ?? 0);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setBorrowings([]);
                setError(requestError.response?.data?.message || "Unable to load your borrowings.");
            }
        } finally { if (!controller.signal.aborted) setLoading(false); }
    }, [currentPage, status]);

    useEffect(() => {
        const timer = window.setTimeout(fetchBorrowings, 0);
        return () => { window.clearTimeout(timer); requestControllerRef.current?.abort(); };
    }, [fetchBorrowings]);

    const closeModal = useCallback(() => {
        if (actionRef.current) return;
        setEditItem(null); setCancelItem(null); setActionError("");
    }, []);

    useEffect(() => {
        if (!selectedImage && !editItem && !cancelItem && !historyItem) return undefined;
        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (selectedImage) setSelectedImage(null);
            else if (historyItem) {
                setHistoryItem(null);
                setHistoryRecords([]);
                setHistoryError("");
            }
            else closeModal();
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
    }, [selectedImage, editItem, cancelItem, historyItem, closeModal]);

    const openHistory = async (item) => {
        const equipmentId = item.equipment?._id || item.equipmentId;
        setHistoryItem(item);
        setHistoryRecords([]);
        setHistoryError("");
        setHistoryLoading(false);

        if (!equipmentId) {
            setHistoryError("The equipment reference for this history is unavailable.");
            return;
        }

        setHistoryLoading(true);
        try {
            const data = await getMyEquipmentBorrowingHistory(equipmentId);
            const records = Array.isArray(data.borrowings) ? data.borrowings : [];
            setHistoryRecords(records.filter((record) => record._id !== item._id));
        } catch (requestError) {
            setHistoryError(
                requestError.response?.data?.message ||
                    "Unable to load previous requests."
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
        requestControllerRef.current?.abort(); setStatus(nextStatus); setCurrentPage(1); setSuccess("");
    };

    const openEdit = (item) => {
        setEditItem(item); setCancelItem(null); setActionError("");
        setForm({ quantity: String(item.quantity), purpose: item.purpose, borrowDate: inputDate(item.borrowDate), returnDate: inputDate(item.returnDate) });
    };

    const validateEdit = () => {
        const quantity = Number(form.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) return "Quantity must be a whole number of at least 1.";
        if (quantity > editItem.equipment.availableQuantity) return `Only ${editItem.equipment.availableQuantity} unit(s) are available.`;
        if (!form.purpose.trim()) return "Purpose is required.";
        if (!form.borrowDate || form.borrowDate < today) return "Borrow date cannot be in the past.";
        if (!form.returnDate || form.returnDate <= form.borrowDate) return "Return date must be after borrow date.";
        return "";
    };

    const saveEdit = async (event) => {
        event.preventDefault();
        if (!editItem || actionRef.current) return;
        const validationError = validateEdit();
        if (validationError) { setActionError(validationError); return; }
        actionRef.current = true; setActionLoading(true); setActionError("");
        try {
            const data = await updateBorrowing(editItem._id, { ...form, quantity: Number(form.quantity), purpose: form.purpose.trim() });
            setSuccess(data.message || "Borrowing request updated successfully.");
            setEditItem(null); await fetchBorrowings();
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to update borrowing request.");
        } finally { actionRef.current = false; setActionLoading(false); }
    };

    const confirmCancel = async () => {
        if (!cancelItem || actionRef.current) return;
        actionRef.current = true; setActionLoading(true); setActionError("");
        try {
            const data = await cancelBorrowing(cancelItem._id);
            setSuccess(data.message || "Borrowing request cancelled successfully.");
            setCancelItem(null);
            if (borrowings.length === 1 && currentPage > 1) setCurrentPage((page) => page - 1);
            else await fetchBorrowings();
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to cancel borrowing request.");
        } finally { actionRef.current = false; setActionLoading(false); }
    };

    return (
        <section className="resident-page my-borrowings-page">
            <header className="resident-page-heading"><span>Your Requests</span><h1>My Borrowings</h1><p>Track your borrowing requests and active equipment.</p></header>
            {success && <div className="my-borrowings-success" role="status">{success}</div>}
            <div className="my-borrowings-tabs" aria-label="Filter borrowings">{FILTERS.map((item) => <button type="button" key={item || "all"} className={status === item ? "active" : ""} aria-pressed={status === item} onClick={() => changeStatus(item)}>{item || "All"}</button>)}</div>

            {loading ? <div className="my-borrowings-state" role="status"><span className="my-borrowings-loader" /><p>Loading your borrowings...</p></div> : error ? <div className="my-borrowings-state error" role="alert"><h2>Borrowings could not be loaded</h2><p>{error}</p><button type="button" onClick={fetchBorrowings}>Retry</button></div> : borrowings.length === 0 ? <div className="my-borrowings-state"><FiClipboard aria-hidden="true" /><h2>{EMPTY_MESSAGES[status]}</h2><p>Your matching borrowing records will appear here.</p></div> : <>
                <div className="my-borrowings-grid">{borrowings.map((item) => <article className="my-borrowing-card" key={item._id}>
                    <div className="my-borrowing-heading">{item.equipment?.image && !failedImages.has(item._id) ? <button type="button" className="my-borrowing-image" onClick={() => setSelectedImage({ src: item.equipment.image, name: item.equipment.equipmentName })} aria-label={`View larger image of ${item.equipment.equipmentName}`}><img src={item.equipment.image} alt={item.equipment.equipmentName} onError={() => setFailedImages((current) => new Set(current).add(item._id))} /></button> : <span className="my-borrowing-image-placeholder"><FiClipboard aria-hidden="true" /></span>}<div><span className={`my-borrowing-status ${item.status}`}>{item.status}</span><h2>{item.equipment?.equipmentName || "Unavailable equipment"}</h2>{STATUS_NOTES[item.status] && <small>{STATUS_NOTES[item.status]}</small>}</div></div>
                    <dl className="my-borrowing-details"><div><dt>Quantity</dt><dd>{item.quantity}</dd></div><div><dt>Requested</dt><dd>{formatDate(item.createdAt, true)}</dd></div><div><dt>Borrow Date</dt><dd>{formatDate(item.borrowDate)}</dd></div><div><dt>Expected Return</dt><dd>{formatDate(item.returnDate)}</dd></div>{item.actualReturnDate && <div><dt>Actual Return</dt><dd>{formatDate(item.actualReturnDate)}</dd></div>}<div className="wide"><dt>Purpose</dt><dd>{item.purpose}</dd></div>{item.status === "rejected" && <div className="wide rejection"><dt>Rejection Reason</dt><dd>{item.rejectionReason || "No reason provided."}</dd></div>}</dl>
                    {!status && item.previousCount > 0 && <div className="my-borrowing-history-link"><span>Previous {item.previousCount === 1 ? "request" : "requests"}: {item.previousCount}</span><button type="button" onClick={() => openHistory(item)}>View History</button></div>}
                    {item.status === "pending" && <div className="my-borrowing-actions">{item.equipment && <button type="button" onClick={() => openEdit(item)}><FiEdit2 aria-hidden="true" />Edit Request</button>}<button type="button" className="cancel" onClick={() => { setCancelItem(item); setEditItem(null); setActionError(""); }}><FiXCircle aria-hidden="true" />Cancel Request</button></div>}
                </article>)}</div>
                <ResidentPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={10} itemLabel={status ? "borrowing" : "equipment"} onPageChange={setCurrentPage} />
            </>}

            {selectedImage && <div className="my-borrowing-lightbox" role="dialog" aria-modal="true" aria-label={`Image preview for ${selectedImage.name}`} onClick={() => setSelectedImage(null)}><button type="button" aria-label="Close image preview" onClick={() => setSelectedImage(null)}>×</button><div onClick={(event) => event.stopPropagation()}><img src={selectedImage.src} alt={selectedImage.name} /><p>{selectedImage.name}</p></div></div>}

            {historyItem && <div className="my-borrowing-modal-backdrop" onClick={closeHistory}><div className="my-borrowing-modal history-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="my-borrowing-history-heading"><div><h2>{historyItem.equipment?.equipmentName || "Unavailable equipment"} History</h2><p>Previous borrowing transactions, newest first.</p></div><button type="button" aria-label="Close history" onClick={closeHistory}>×</button></div>{historyLoading ? <div className="my-borrowing-history-state">Loading history...</div> : historyError ? <div className="my-borrowing-modal-error" role="alert">{historyError}</div> : historyRecords.length === 0 ? <div className="my-borrowing-history-state">No previous requests found.</div> : <div className="my-borrowing-history-list">{historyRecords.map((record) => <article key={record._id}><span className={`my-borrowing-status ${record.status}`}>{record.status}</span><dl><div><dt>Quantity</dt><dd>{record.quantity}</dd></div><div><dt>Requested</dt><dd>{formatDate(record.createdAt, true)}</dd></div><div><dt>Borrow Date</dt><dd>{formatDate(record.borrowDate)}</dd></div><div><dt>Expected Return</dt><dd>{formatDate(record.returnDate)}</dd></div>{record.actualReturnDate && <div><dt>Actual Return</dt><dd>{formatDate(record.actualReturnDate)}</dd></div>}<div className="wide"><dt>Purpose</dt><dd>{record.purpose}</dd></div>{record.status === "rejected" && <div className="wide"><dt>Rejection Reason</dt><dd>{record.rejectionReason || "No reason provided."}</dd></div>}</dl></article>)}</div>}</div></div>}

            {editItem && <div className="my-borrowing-modal-backdrop" onClick={closeModal}><form className="my-borrowing-modal" onSubmit={saveEdit} onClick={(event) => event.stopPropagation()}><h2>Edit Borrowing Request</h2><div className="my-borrowing-modal-equipment">{editItem.equipment?.image && <img src={editItem.equipment.image} alt="" />}<strong>{editItem.equipment?.equipmentName}</strong></div>{actionError && <div className="my-borrowing-modal-error" role="alert">{actionError}</div>}<div className="my-borrowing-form"><label>Quantity<input type="number" min="1" max={editItem.equipment?.availableQuantity} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} disabled={actionLoading} /></label><label>Purpose<textarea rows="3" value={form.purpose} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))} disabled={actionLoading} /></label><div><label>Borrow Date<input type="date" min={today} value={form.borrowDate} onChange={(event) => setForm((current) => ({ ...current, borrowDate: event.target.value }))} disabled={actionLoading} /></label><label>Return Date<input type="date" min={form.borrowDate || today} value={form.returnDate} onChange={(event) => setForm((current) => ({ ...current, returnDate: event.target.value }))} disabled={actionLoading} /></label></div></div><div className="my-borrowing-modal-actions"><button type="button" onClick={closeModal} disabled={actionLoading}>Cancel</button><button type="submit" disabled={actionLoading}>{actionLoading ? "Saving..." : "Save Changes"}</button></div></form></div>}

            {cancelItem && <div className="my-borrowing-modal-backdrop" onClick={closeModal}><div className="my-borrowing-modal cancel-modal" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>Cancel Borrowing Request?</h2><p>Are you sure you want to cancel your request for <strong>{cancelItem.equipment?.equipmentName}</strong>?</p><p>This action will close the pending request.</p>{actionError && <div className="my-borrowing-modal-error" role="alert">{actionError}</div>}<div className="my-borrowing-modal-actions"><button type="button" onClick={closeModal} disabled={actionLoading}>Keep Request</button><button type="button" className="danger" onClick={confirmCancel} disabled={actionLoading}>{actionLoading ? "Cancelling..." : "Cancel Request"}</button></div></div></div>}
        </section>
    );
};

export default MyBorrowings;
