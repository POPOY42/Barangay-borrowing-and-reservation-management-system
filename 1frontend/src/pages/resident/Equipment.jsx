import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiBox, FiSearch, FiX } from "react-icons/fi";
import ResidentPagination from "../../components/resident/ResidentPagination";
import { createBorrowing } from "../../services/borrowingService";
import { getAllEquipment } from "../../services/equipmentService";
import "../../css/resident/equipment.css";

const getToday = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
};

const initialForm = { quantity: "", purpose: "", borrowDate: "", returnDate: "" };
const borrowButtonLabels = {
    pending: "Waiting for Approval",
    approved: "Ready for Claim",
    borrowed: "Currently Borrowed",
};
const activeBorrowingStatuses = new Set(["pending", "approved", "borrowed"]);

const Equipment = () => {
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [failedImages, setFailedImages] = useState(() => new Set());
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const requestControllerRef = useRef(null);
    const submittingRef = useRef(false);
    const today = getToday();

    const fetchEquipment = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setError("");
        try {
            const data = await getAllEquipment(currentPage, debouncedSearch, controller.signal, true);
            const pagination = data.pagination ?? {};
            setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
            setTotalPages(pagination.totalPages ?? 0);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setEquipment([]);
                setError(requestError.response?.data?.message || "Unable to load available equipment.");
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [currentPage, debouncedSearch]);

    useEffect(() => {
        const timer = window.setTimeout(fetchEquipment, 0);
        return () => { window.clearTimeout(timer); requestControllerRef.current?.abort(); };
    }, [fetchEquipment]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearch(search.trim());
        }, 400);
        return () => window.clearTimeout(timer);
    }, [search]);

    const closeBorrowModal = useCallback(() => {
        if (submittingRef.current) return;
        setSelectedEquipment(null);
        setForm(initialForm);
        setFormError("");
    }, []);

    useEffect(() => {
        if (!selectedImage && !selectedEquipment) return undefined;
        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (selectedImage) setSelectedImage(null);
            if (selectedEquipment) closeBorrowModal();
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [selectedImage, selectedEquipment, closeBorrowModal]);

    const clearSearch = () => {
        requestControllerRef.current?.abort();
        setSearch(""); setDebouncedSearch(""); setCurrentPage(1);
    };

    const openBorrowModal = (item) => {
        setSelectedEquipment(item); setForm(initialForm); setFormError(""); setSuccess("");
    };

    const validateForm = () => {
        const quantity = Number(form.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) return "Quantity must be a whole number of at least 1.";
        if (quantity > selectedEquipment.availableQuantity) return `Only ${selectedEquipment.availableQuantity} unit(s) are available.`;
        if (!form.purpose.trim()) return "Purpose is required.";
        if (!form.borrowDate) return "Borrow date is required.";
        if (form.borrowDate < today) return "Borrow date cannot be in the past.";
        if (!form.returnDate) return "Return date is required.";
        if (form.returnDate <= form.borrowDate) return "Return date must be after the borrow date.";
        return "";
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedEquipment || submittingRef.current) return;
        const validationError = validateForm();
        if (validationError) { setFormError(validationError); return; }
        submittingRef.current = true; setSubmitting(true); setFormError("");
        try {
            const data = await createBorrowing({
                equipment: selectedEquipment._id,
                quantity: Number(form.quantity),
                purpose: form.purpose.trim(),
                borrowDate: form.borrowDate,
                returnDate: form.returnDate,
            });
            setSuccess(data.message || "Borrowing request submitted successfully.");
            setSelectedEquipment(null); setForm(initialForm);
            await fetchEquipment();
        } catch (requestError) {
            setFormError(requestError.response?.data?.message || "Unable to submit borrowing request.");
        } finally {
            submittingRef.current = false; setSubmitting(false);
        }
    };

    return (
        <section className="resident-page resident-equipment-page">
            <header className="resident-page-heading"><span>Browse Resources</span><h1>Equipment</h1><p>Explore barangay equipment available for community use.</p></header>
            {success && <div className="resident-equipment-success" role="status"><span>{success}</span><Link to="/resident/borrowings">View My Borrowings</Link></div>}
            <div className="resident-equipment-search"><FiSearch aria-hidden="true" /><input type="search" value={search} onChange={(event) => { requestControllerRef.current?.abort(); setSearch(event.target.value); }} placeholder="Search equipment..." aria-label="Search equipment" />{search && <button type="button" onClick={clearSearch} aria-label="Clear equipment search"><FiX aria-hidden="true" /></button>}</div>

            {loading ? <div className="resident-equipment-state" role="status"><span className="resident-equipment-loader" /><p>Loading available equipment...</p></div> : error ? <div className="resident-equipment-state error" role="alert"><h2>Equipment could not be loaded</h2><p>{error}</p><button type="button" onClick={fetchEquipment}>Retry</button></div> : equipment.length === 0 ? <div className="resident-equipment-state"><FiBox aria-hidden="true" /><h2>{debouncedSearch ? `No equipment found for “${debouncedSearch}”.` : "No equipment is currently available for borrowing."}</h2><p>Check again later or try another search.</p></div> : <>
                <div className="resident-equipment-grid">{equipment.map((item) => <article className="resident-equipment-card" key={item._id}>
                    {item.image && !failedImages.has(item._id) ? <button type="button" className="resident-equipment-image-button" onClick={() => setSelectedImage({ src: item.image, name: item.equipmentName })} aria-label={`View larger image of ${item.equipmentName}`}><img src={item.image} alt={item.equipmentName} onError={() => setFailedImages((current) => new Set(current).add(item._id))} /></button> : <div className="resident-equipment-image-placeholder"><FiBox aria-hidden="true" /><span>Image unavailable</span></div>}
                    <div className="resident-equipment-card-content"><div className="resident-equipment-card-labels"><span className="resident-equipment-category">{item.category}</span>{item.latestBorrowingStatus && <span className={`resident-equipment-request-status ${item.latestBorrowingStatus}`}>{item.latestBorrowingStatus}</span>}</div><h2>{item.equipmentName}</h2><p>{item.description || "No description available."}</p><div className="resident-equipment-card-footer"><span><strong>{item.availableQuantity}</strong> available</span><button type="button" className={activeBorrowingStatuses.has(item.latestBorrowingStatus) ? "has-active-request" : ""} disabled={activeBorrowingStatuses.has(item.latestBorrowingStatus)} onClick={() => openBorrowModal(item)}>{borrowButtonLabels[item.latestBorrowingStatus] || (item.latestBorrowingStatus ? "Borrow Again" : "Borrow")}</button></div></div>
                </article>)}</div>
                <ResidentPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={10} itemLabel="equipment" onPageChange={setCurrentPage} />
            </>}

            {selectedImage && <div className="resident-equipment-lightbox" role="dialog" aria-modal="true" aria-label={`Image preview for ${selectedImage.name}`} onClick={() => setSelectedImage(null)}><button type="button" className="resident-equipment-lightbox-close" aria-label="Close image preview" onClick={() => setSelectedImage(null)}>×</button><div onClick={(event) => event.stopPropagation()}><img src={selectedImage.src} alt={selectedImage.name} /><p>{selectedImage.name}</p></div></div>}

            {selectedEquipment && <div className="resident-borrow-backdrop" onClick={closeBorrowModal}><form className="resident-borrow-modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}><h2>Borrow Equipment</h2><div className="resident-borrow-summary"><span>Equipment<strong>{selectedEquipment.equipmentName}</strong></span><span>Available<strong>{selectedEquipment.availableQuantity} units</strong></span></div>{formError && <div className="resident-borrow-error" role="alert">{formError}</div>}<div className="resident-borrow-fields"><label>Quantity<input type="number" min="1" max={selectedEquipment.availableQuantity} step="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} disabled={submitting} required /></label><label>Purpose<textarea rows="3" value={form.purpose} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))} disabled={submitting} required /></label><div><label>Borrow Date<input type="date" min={today} value={form.borrowDate} onChange={(event) => setForm((current) => ({ ...current, borrowDate: event.target.value }))} disabled={submitting} required /></label><label>Return Date<input type="date" min={form.borrowDate || today} value={form.returnDate} onChange={(event) => setForm((current) => ({ ...current, returnDate: event.target.value }))} disabled={submitting} required /></label></div></div><div className="resident-borrow-actions"><button type="button" onClick={closeBorrowModal} disabled={submitting}>Cancel</button><button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</button></div></form></div>}
        </section>
    );
};

export default Equipment;
