import { useCallback, useEffect, useRef, useState } from "react";
import AdminPagination from "../../../components/admin/AdminPagination";
import { getAllBorrowings } from "../../../services/borrowingService";
import "../../../css/admin/borrowing.css";

const HISTORY_FILTERS = [
    ["All", ""],
    ["Returned", "returned"],
    ["Rejected", "rejected"],
    ["Cancelled", "cancelled"],
];

const formatDate = (value, includeTime = false) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(date);
};

const residentName = (user) => {
    if (!user) return "Unavailable resident";
    return [user.firstName, user.middleName, user.lastName]
        .filter(Boolean)
        .join(" ") || user.email || "Unavailable resident";
};

const BorrowingHistory = () => {
    const [borrowings, setBorrowings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [failedImages, setFailedImages] = useState(() => new Set());
    const requestControllerRef = useRef(null);

    const fetchHistory = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setError("");

        try {
            const data = await getAllBorrowings({
                page: currentPage,
                status: selectedStatus,
                type: selectedStatus ? "" : "history",
                signal: controller.signal,
            });
            const pagination = data.pagination ?? {};
            setBorrowings(Array.isArray(data.borrowings) ? data.borrowings : []);
            setTotalPages(pagination.totalPages ?? 0);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setBorrowings([]);
                setError(
                    requestError.response?.data?.message ||
                        "Unable to load borrowing history. Please try again."
                );
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [currentPage, selectedStatus]);

    useEffect(() => {
        const timer = window.setTimeout(fetchHistory, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [fetchHistory]);

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

    const changeStatus = (status) => {
        requestControllerRef.current?.abort();
        setSelectedStatus(status);
        setCurrentPage(1);
    };

    const markImageFailed = (id) => {
        setFailedImages((current) => new Set(current).add(id));
    };

    return (
        <section className="admin-page borrowing-page borrowing-history-page">
            <header className="borrowing-header">
                <h1>Borrowing History</h1>
                <p>View returned, rejected, and cancelled borrowing records.</p>
            </header>

            <div className="borrowing-filter-tabs" aria-label="Filter borrowing history">
                {HISTORY_FILTERS.map(([label, value]) => (
                    <button
                        type="button"
                        key={value || "all"}
                        className={`borrowing-filter-btn ${selectedStatus === value ? "active" : ""}`}
                        aria-pressed={selectedStatus === value}
                        onClick={() => changeStatus(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="borrowing-state" role="status">
                    <span className="borrowing-loader" aria-hidden="true" />
                    <p>Loading borrowing history...</p>
                </div>
            ) : error ? (
                <div className="borrowing-state borrowing-error" role="alert">
                    <h2>Borrowing history could not be loaded</h2>
                    <p>{error}</p>
                    <button type="button" onClick={fetchHistory}>Retry</button>
                </div>
            ) : borrowings.length === 0 ? (
                <div className="borrowing-state">
                    <h2>{selectedStatus ? `No ${selectedStatus} borrowing records found.` : "No borrowing history found."}</h2>
                    <p>Closed borrowing records matching this view will appear here.</p>
                </div>
            ) : (
                <div className="borrowing-list-card">
                    <div className="borrowing-table-wrapper">
                        <table className="borrowing-table borrowing-history-table">
                            <thead><tr><th>Resident</th><th>Equipment</th><th>Qty</th><th>Borrow Date</th><th>Expected Return</th><th>Actual Return</th><th>Purpose</th><th>Final Status</th><th>Updated</th><th>Details</th></tr></thead>
                            <tbody>{borrowings.map((item) => (
                                <tr key={item._id}>
                                    <td><div className="borrowing-resident"><strong>{residentName(item.user)}</strong>{item.user?.email && <span>{item.user.email}</span>}</div></td>
                                    <td><div className="borrowing-equipment">
                                        {item.equipment?.image && !failedImages.has(item._id) ? (
                                            <button type="button" className="borrowing-equipment-image-button" aria-label={`View larger image of ${item.equipment?.equipmentName || "equipment"}`} onClick={() => setSelectedImage({ src: item.equipment.image, name: item.equipment?.equipmentName || "Equipment" })}>
                                                <img src={item.equipment.image} alt={item.equipment?.equipmentName || "Equipment"} onError={() => markImageFailed(item._id)} />
                                            </button>
                                        ) : (
                                            <span className="borrowing-equipment-placeholder" aria-hidden="true">{item.equipment?.equipmentName?.charAt(0).toUpperCase() || "E"}</span>
                                        )}
                                        <strong>{item.equipment?.equipmentName || "Unavailable equipment"}</strong>
                                    </div></td>
                                    <td>{item.quantity}</td>
                                    <td>{formatDate(item.borrowDate)}</td>
                                    <td>{formatDate(item.returnDate)}</td>
                                    <td>{formatDate(item.actualReturnDate)}</td>
                                    <td><span className="borrowing-purpose">{item.purpose}</span></td>
                                    <td><span className={`borrowing-status borrowing-status-${item.status}`}>{item.status}</span></td>
                                    <td>{formatDate(item.updatedAt, true)}</td>
                                    <td>{item.status === "rejected" ? <div className="borrowing-history-details"><strong>Rejection reason</strong><span>{item.rejectionReason || "No reason provided."}</span></div> : <span className="borrowing-view-only">Closed record</span>}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    <AdminPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemLabel="borrowing record" ariaLabel="Borrowing history pages" onPageChange={setCurrentPage} />
                </div>
            )}

            {selectedImage && <div className="borrowing-lightbox" role="dialog" aria-modal="true" aria-label={`Image preview for ${selectedImage.name}`} onClick={() => setSelectedImage(null)}>
                <button type="button" className="borrowing-lightbox-close" aria-label="Close image preview" onClick={() => setSelectedImage(null)}>×</button>
                <div className="borrowing-lightbox-content" onClick={(event) => event.stopPropagation()}>
                    <img src={selectedImage.src} alt={selectedImage.name} />
                    <p>{selectedImage.name}</p>
                </div>
            </div>}
        </section>
    );
};

export default BorrowingHistory;
