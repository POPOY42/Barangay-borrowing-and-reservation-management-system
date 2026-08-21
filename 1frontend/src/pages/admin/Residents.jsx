import { useCallback, useEffect, useRef, useState } from "react";
import { FiEye, FiSearch, FiUserCheck, FiUserX, FiX } from "react-icons/fi";
import AdminPagination from "../../components/admin/AdminPagination";
import { getResidentById, getResidents, updateResidentStatus } from "../../services/userService";
import "../../css/admin/residents.css";

const formatName = (resident) => [resident?.firstName, resident?.middleName, resident?.lastName].filter(Boolean).join(" ") || "Unavailable resident";
const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
};

const Residents = () => {
    const requestRef = useRef(null);
    const [residents, setResidents] = useState([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modal, setModal] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState("");
    const [success, setSuccess] = useState("");

    const loadResidents = useCallback(async () => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);
        setError("");
        try {
            const data = await getResidents({ page: currentPage, limit: 10, search: debouncedSearch, signal: controller.signal });
            const pagination = data.pagination || {};
            if ((pagination.totalPages || 0) > 0 && currentPage > pagination.totalPages) {
                setCurrentPage(pagination.totalPages);
                return;
            }
            setResidents(Array.isArray(data.residents) ? data.residents : []);
            setTotalPages(pagination.totalPages || 0);
            setTotalItems(pagination.totalItems || 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setResidents([]);
                setError(requestError.response?.data?.message || "Unable to load residents.");
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [currentPage, debouncedSearch]);

    useEffect(() => {
        const timer = window.setTimeout(() => { setCurrentPage(1); setDebouncedSearch(search.trim()); }, 400);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const timer = window.setTimeout(loadResidents, 0);
        return () => { window.clearTimeout(timer); requestRef.current?.abort(); };
    }, [loadResidents]);

    const closeModal = useCallback(() => {
        if (!actionLoading) { setModal(null); setActionError(""); }
    }, [actionLoading]);

    useEffect(() => {
        if (!modal) return undefined;
        const oldOverflow = document.body.style.overflow;
        const onKeyDown = (event) => { if (event.key === "Escape") closeModal(); };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKeyDown); };
    }, [closeModal, modal]);

    const openDetails = async (resident) => {
        setModal({ type: "details", resident });
        setDetailLoading(true);
        setActionError("");
        try {
            const data = await getResidentById(resident._id);
            setModal((current) => current?.type === "details" ? { ...current, resident: data.resident } : current);
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to load resident details.");
        } finally {
            setDetailLoading(false);
        }
    };

    const openStatus = (resident) => {
        setActionError("");
        setModal({ type: "status", resident, nextStatus: resident.accountStatus === "inactive" ? "active" : "inactive" });
    };

    const confirmStatus = async () => {
        if (modal?.type !== "status" || actionLoading) return;
        setActionLoading(true);
        setActionError("");
        try {
            const data = await updateResidentStatus(modal.resident._id, modal.nextStatus);
            setSuccess(data.message || "Resident account status updated.");
            setModal(null);
            await loadResidents();
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to update resident status.");
        } finally {
            setActionLoading(false);
        }
    };

    const resident = modal?.resident;
    return (
        <section className="admin-page admin-residents-page">
            <header><h1>Residents</h1><p>View registered residents and manage account access.</p></header>
            {success && <div className="admin-residents-success" role="status"><span>{success}</span><button type="button" aria-label="Dismiss message" onClick={() => setSuccess("")}><FiX /></button></div>}
            <label className="admin-residents-search"><FiSearch aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search residents..." aria-label="Search residents" />{search && <button type="button" onClick={() => { setSearch(""); setDebouncedSearch(""); setCurrentPage(1); }} aria-label="Clear search"><FiX /></button>}</label>
            <div className="admin-residents-panel">
                {loading ? <div className="admin-residents-state" role="status"><span className="admin-residents-loader" /><p>Loading residents...</p></div> : error ? <div className="admin-residents-state error" role="alert"><h2>Residents could not be loaded</h2><p>{error}</p><button type="button" onClick={loadResidents}>Retry</button></div> : residents.length === 0 ? <div className="admin-residents-state"><h2>No residents found.</h2><p>{debouncedSearch ? "Try a different search term." : "Registered resident accounts will appear here."}</p></div> : <>
                    <div className="admin-residents-table-wrap"><table><thead><tr><th>Resident</th><th>Contact</th><th>Address</th><th>Verified</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead><tbody>{residents.map((item) => <tr key={item._id}><td><strong>{formatName(item)}</strong></td><td><span>{item.email || "—"}</span><small>{item.phoneNumber || "No phone number"}</small></td><td>{[item.houseNumber, item.purok].filter(Boolean).join(", ") || "—"}</td><td><span className={`admin-resident-badge ${item.isVerified ? "verified" : "unverified"}`}>{item.isVerified ? "Verified" : "Unverified"}</span></td><td><span className={`admin-resident-badge ${item.accountStatus || "active"}`}>{item.accountStatus === "inactive" ? "Inactive" : "Active"}</span></td><td>{formatDate(item.createdAt)}</td><td><div className="admin-resident-actions"><button type="button" onClick={() => openDetails(item)}><FiEye />View</button><button type="button" className={item.accountStatus === "inactive" ? "activate" : "deactivate"} onClick={() => openStatus(item)}>{item.accountStatus === "inactive" ? <FiUserCheck /> : <FiUserX />}{item.accountStatus === "inactive" ? "Activate" : "Deactivate"}</button></div></td></tr>)}</tbody></table></div>
                    <AdminPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemLabel="resident" ariaLabel="Resident pages" onPageChange={setCurrentPage} />
                </>}
            </div>
            {modal && <div className="admin-residents-backdrop" onClick={closeModal}><div className="admin-residents-modal" role={modal.type === "status" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby="resident-modal-title" onClick={(event) => event.stopPropagation()}><button type="button" className="close" onClick={closeModal} disabled={actionLoading} aria-label="Close modal"><FiX /></button>{modal.type === "details" ? <><h2 id="resident-modal-title">Resident Details</h2>{detailLoading ? <p>Loading resident details...</p> : <dl><div><dt>Name</dt><dd>{formatName(resident)}</dd></div><div><dt>Email</dt><dd>{resident?.email || "—"}</dd></div><div><dt>Phone</dt><dd>{resident?.phoneNumber || "—"}</dd></div><div><dt>Birthday</dt><dd>{formatDate(resident?.birthday)}</dd></div><div><dt>House Number</dt><dd>{resident?.houseNumber || "—"}</dd></div><div><dt>Purok</dt><dd>{resident?.purok || "—"}</dd></div><div><dt>Email Verification</dt><dd>{resident?.isVerified ? "Verified" : "Unverified"}</dd></div><div><dt>Account Status</dt><dd>{resident?.accountStatus === "inactive" ? "Inactive" : "Active"}</dd></div></dl>}{actionError && <div className="modal-error" role="alert">{actionError}</div>}</> : <><h2 id="resident-modal-title">{modal.nextStatus === "inactive" ? "Deactivate" : "Activate"} Resident Account?</h2><p>{modal.nextStatus === "inactive" ? "This resident will no longer be able to sign in until the account is reactivated." : "This resident will be allowed to sign in again."}</p><strong>{formatName(resident)}</strong>{actionError && <div className="modal-error" role="alert">{actionError}</div>}<div className="modal-actions"><button type="button" onClick={closeModal} disabled={actionLoading}>Cancel</button><button type="button" className="confirm" onClick={confirmStatus} disabled={actionLoading}>{actionLoading ? "Saving..." : `Confirm ${modal.nextStatus === "inactive" ? "Deactivation" : "Activation"}`}</button></div></>}</div></div>}
        </section>
    );
};

export default Residents;
