import { useCallback, useEffect, useRef, useState } from "react";
import {
    FiAlertTriangle,
    FiCheckCircle,
    FiEdit2,
    FiEye,
    FiPlus,
    FiSearch,
    FiTrash2,
    FiX,
} from "react-icons/fi";
import AdminPagination from "../../components/admin/AdminPagination";
import {
    createAnnouncement,
    deleteAnnouncement,
    getAnnouncements,
    updateAnnouncement,
} from "../../services/announcementService";
import "../../css/admin/announcement.css";

const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
];

const EMPTY_FORM = {
    title: "",
    content: "",
    priority: "normal",
    status: "published",
};

const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
};

const getCreatorName = (createdBy) => {
    if (!createdBy) return "Unavailable admin";
    return [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ") ||
        "Unavailable admin";
};

const validateForm = (values) => {
    if (!values.title.trim()) return "Title is required.";
    if (!values.content.trim()) return "Content is required.";
    if (!["normal", "important"].includes(values.priority)) {
        return "Priority must be normal or important.";
    }
    if (!["published", "draft"].includes(values.status)) {
        return "Status must be published or draft.";
    }
    return "";
};

const Announcements = () => {
    const requestControllerRef = useRef(null);
    const submittingRef = useRef(false);
    const [announcements, setAnnouncements] = useState([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [modal, setModal] = useState(null);
    const [formValues, setFormValues] = useState(EMPTY_FORM);
    const [actionError, setActionError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const loadAnnouncements = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setLoadError("");
        try {
            const data = await getAnnouncements({
                page: currentPage,
                limit: 10,
                search: debouncedSearch,
                status,
                signal: controller.signal,
            });
            const pagination = data.pagination || {};
            const nextTotalPages = pagination.totalPages ?? 0;
            if (nextTotalPages > 0 && currentPage > nextTotalPages) {
                setAnnouncements([]);
                setCurrentPage(nextTotalPages);
                return;
            }
            setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
            setTotalPages(nextTotalPages);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setAnnouncements([]);
                setLoadError(
                    requestError.response?.data?.message || "Unable to load announcements."
                );
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [currentPage, debouncedSearch, status]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearch(search.trim());
        }, 400);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const timer = window.setTimeout(loadAnnouncements, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [loadAnnouncements]);

    const closeModal = useCallback(() => {
        if (submitting) return;
        setModal(null);
        setActionError("");
    }, [submitting]);

    useEffect(() => {
        if (!modal) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") closeModal();
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [closeModal, modal]);

    const openCreateModal = () => {
        setFormValues(EMPTY_FORM);
        setActionError("");
        setSuccessMessage("");
        setModal({ mode: "create" });
    };

    const openEditModal = (announcement) => {
        setFormValues({
            title: announcement.title || "",
            content: announcement.content || "",
            priority: announcement.priority || "normal",
            status: announcement.status || "draft",
        });
        setActionError("");
        setSuccessMessage("");
        setModal({ mode: "edit", announcement });
    };

    const openStaticModal = (mode, announcement) => {
        setActionError("");
        setSuccessMessage("");
        setModal({ mode, announcement });
    };

    const updateFormValue = (event) => {
        const { name, value } = event.target;
        setFormValues((current) => ({ ...current, [name]: value }));
        setActionError("");
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!modal || submittingRef.current) return;
        const validationError = validateForm(formValues);
        if (validationError) {
            setActionError(validationError);
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        setActionError("");
        try {
            const payload = {
                title: formValues.title.trim(),
                content: formValues.content.trim(),
                priority: formValues.priority,
                status: formValues.status,
            };
            const isCreating = modal.mode === "create";
            const data = isCreating
                ? await createAnnouncement(payload)
                : await updateAnnouncement(modal.announcement._id, payload);
            setModal(null);
            setSuccessMessage(
                data.message || (isCreating
                    ? "Announcement created successfully."
                    : "Announcement updated successfully.")
            );
            if (isCreating && currentPage !== 1) setCurrentPage(1);
            else await loadAnnouncements();
        } catch (requestError) {
            setActionError(
                requestError.response?.data?.message || "Unable to save announcement."
            );
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (modal?.mode !== "delete" || submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        setActionError("");
        try {
            const data = await deleteAnnouncement(modal.announcement._id);
            const shouldMoveBack = announcements.length === 1 && currentPage > 1;
            setModal(null);
            setSuccessMessage(data.message || "Announcement deleted successfully.");
            if (shouldMoveBack) setCurrentPage((page) => page - 1);
            else await loadAnnouncements();
        } catch (requestError) {
            setActionError(
                requestError.response?.data?.message || "Unable to delete announcement."
            );
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const handleStatusChange = (event) => {
        requestControllerRef.current?.abort();
        setStatus(event.target.value);
        setCurrentPage(1);
    };

    const clearSearch = () => {
        requestControllerRef.current?.abort();
        setSearch("");
        setDebouncedSearch("");
        setCurrentPage(1);
    };

    return (
        <section className="admin-page admin-announcement-page">
            <header className="admin-announcement-header">
                <div>
                    <h1>Announcements</h1>
                    <p>Create and manage barangay announcements for residents.</p>
                </div>
                <button type="button" className="admin-announcement-add" onClick={openCreateModal}>
                    <FiPlus aria-hidden="true" />Add Announcement
                </button>
            </header>

            {successMessage && (
                <div className="admin-announcement-success" role="status">
                    <FiCheckCircle aria-hidden="true" />
                    <span>{successMessage}</span>
                    <button type="button" aria-label="Dismiss message" onClick={() => setSuccessMessage("")}>
                        <FiX aria-hidden="true" />
                    </button>
                </div>
            )}

            <div className="admin-announcement-toolbar">
                <label className="admin-announcement-search">
                    <FiSearch aria-hidden="true" />
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search announcements..." aria-label="Search announcements" />
                    {search && <button type="button" onClick={clearSearch} aria-label="Clear search"><FiX aria-hidden="true" /></button>}
                </label>
                <label className="admin-announcement-filter">
                    <span>Status</span>
                    <select value={status} onChange={handleStatusChange}>
                        {STATUS_OPTIONS.map((option) => <option value={option.value} key={option.value || "all"}>{option.label}</option>)}
                    </select>
                </label>
            </div>

            <div className="admin-announcement-panel">
                {loading ? (
                    <div className="admin-announcement-state" role="status"><span className="admin-announcement-loader" aria-hidden="true" /><p>Loading announcements...</p></div>
                ) : loadError ? (
                    <div className="admin-announcement-state error" role="alert"><h2>Announcements could not be loaded</h2><p>{loadError}</p><button type="button" onClick={loadAnnouncements}>Retry</button></div>
                ) : announcements.length === 0 ? (
                    <div className="admin-announcement-state"><h2>{debouncedSearch ? "No announcements match your search." : "No announcements found."}</h2><p>Try changing the search or status filter.</p></div>
                ) : (
                    <div className="admin-announcement-table-wrap">
                        <table className="admin-announcement-table">
                            <thead><tr><th>Title</th><th>Preview</th><th>Priority</th><th>Status</th><th>Published</th><th>Created By</th><th>Actions</th></tr></thead>
                            <tbody>
                                {announcements.map((announcement) => (
                                    <tr key={announcement._id}>
                                        <td><strong>{announcement.title}</strong></td>
                                        <td><p className="admin-announcement-preview">{announcement.content}</p></td>
                                        <td><span className={`admin-announcement-priority ${announcement.priority}`}>{announcement.priority === "important" ? "Important" : "Normal"}</span></td>
                                        <td><span className={`admin-announcement-status ${announcement.status}`}>{announcement.status === "published" ? "Published" : "Draft"}</span></td>
                                        <td>{formatDateTime(announcement.publishedAt)}</td>
                                        <td>{getCreatorName(announcement.createdBy)}</td>
                                        <td>
                                            <div className="admin-announcement-row-actions">
                                                <button type="button" onClick={() => openStaticModal("view", announcement)} aria-label={`View ${announcement.title}`}><FiEye aria-hidden="true" />View</button>
                                                <button type="button" onClick={() => openEditModal(announcement)} aria-label={`Edit ${announcement.title}`}><FiEdit2 aria-hidden="true" />Edit</button>
                                                <button type="button" className="delete" onClick={() => openStaticModal("delete", announcement)} aria-label={`Delete ${announcement.title}`}><FiTrash2 aria-hidden="true" />Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !loadError && announcements.length > 0 && (
                    <AdminPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemLabel="announcement" ariaLabel="Announcement pages" onPageChange={setCurrentPage} />
                )}
            </div>

            {modal && (
                <div className="admin-announcement-backdrop" onClick={closeModal}>
                    {modal.mode === "view" ? (
                        <article className="admin-announcement-modal admin-announcement-details" role="dialog" aria-modal="true" aria-labelledby="announcement-details-title" onClick={(event) => event.stopPropagation()}>
                            <button type="button" className="admin-announcement-close" onClick={closeModal} aria-label="Close announcement details"><FiX aria-hidden="true" /></button>
                            <div className="admin-announcement-detail-badges">
                                <span className={`admin-announcement-priority ${modal.announcement.priority}`}>{modal.announcement.priority === "important" ? "Important" : "Normal"}</span>
                                <span className={`admin-announcement-status ${modal.announcement.status}`}>{modal.announcement.status === "published" ? "Published" : "Draft"}</span>
                            </div>
                            <h2 id="announcement-details-title">{modal.announcement.title}</h2>
                            <dl>
                                <div><dt>Published Date</dt><dd>{formatDateTime(modal.announcement.publishedAt)}</dd></div>
                                <div><dt>Created Date</dt><dd>{formatDateTime(modal.announcement.createdAt)}</dd></div>
                                <div><dt>Created By</dt><dd>{getCreatorName(modal.announcement.createdBy)}</dd></div>
                            </dl>
                            <div className="admin-announcement-full-content">{modal.announcement.content}</div>
                        </article>
                    ) : modal.mode === "delete" ? (
                        <div className="admin-announcement-modal admin-announcement-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-announcement-title" onClick={(event) => event.stopPropagation()}>
                            <span className="admin-announcement-warning" aria-hidden="true"><FiAlertTriangle /></span>
                            <h2 id="delete-announcement-title">Delete Announcement</h2>
                            <p>Are you sure you want to delete:</p>
                            <strong>“{modal.announcement.title}”</strong>
                            <p>This action cannot be undone.</p>
                            {actionError && <div className="admin-announcement-modal-error" role="alert">{actionError}</div>}
                            <div className="admin-announcement-modal-actions">
                                <button type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                                <button type="button" className="danger" onClick={handleDelete} disabled={submitting}>{submitting ? "Deleting..." : "Delete"}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="admin-announcement-modal admin-announcement-form-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-form-title" onClick={(event) => event.stopPropagation()}>
                            <button type="button" className="admin-announcement-close" onClick={closeModal} disabled={submitting} aria-label="Close announcement form"><FiX aria-hidden="true" /></button>
                            <h2 id="announcement-form-title">{modal.mode === "create" ? "Create Announcement" : "Edit Announcement"}</h2>
                            <p>{modal.mode === "create" ? "Share a new barangay update with residents." : "Update this barangay announcement."}</p>
                            {actionError && <div className="admin-announcement-modal-error" role="alert">{actionError}</div>}
                            <form onSubmit={handleSave} noValidate>
                                <label><span>Title *</span><input name="title" value={formValues.title} onChange={updateFormValue} disabled={submitting} maxLength="200" required /></label>
                                <label><span>Content *</span><textarea name="content" value={formValues.content} onChange={updateFormValue} disabled={submitting} rows="8" required /></label>
                                <div className="admin-announcement-form-grid">
                                    <label><span>Priority</span><select name="priority" value={formValues.priority} onChange={updateFormValue} disabled={submitting}><option value="normal">Normal</option><option value="important">Important</option></select></label>
                                    <label><span>Status</span><select name="status" value={formValues.status} onChange={updateFormValue} disabled={submitting}><option value="published">Published</option><option value="draft">Draft</option></select></label>
                                </div>
                                <div className="admin-announcement-modal-actions">
                                    <button type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                                    <button type="submit" className="primary" disabled={submitting}>{submitting ? modal.mode === "create" ? "Creating..." : "Saving..." : modal.mode === "create" ? "Create Announcement" : "Save Changes"}</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default Announcements;
