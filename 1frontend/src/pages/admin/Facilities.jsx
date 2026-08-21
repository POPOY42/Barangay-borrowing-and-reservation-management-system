import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    FiAlertTriangle,
    FiEdit2,
    FiFilter,
    FiHome,
    FiPlus,
    FiSearch,
    FiTrash2,
    FiX,
} from "react-icons/fi";
import {
    deleteFacility,
    getFacilities,
} from "../../services/facilityService";
import "../../css/admin/facility.css";

const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "maintenance", label: "Maintenance" },
];

const getPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set([
        1,
        totalPages,
        currentPage - 2,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        currentPage + 2,
    ]);
    const visiblePages = [...pages]
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((a, b) => a - b);
    const items = [];

    visiblePages.forEach((page, index) => {
        if (index > 0 && page - visiblePages[index - 1] > 1) {
            items.push(`ellipsis-${page}`);
        }
        items.push(page);
    });

    return items;
};

const FacilityThumbnail = ({ facility, onOpen }) => {
    const [failed, setFailed] = useState(false);

    if (!facility.image || failed) {
        return (
            <span className="facility-image-placeholder" aria-hidden="true">
                <FiHome />
            </span>
        );
    }

    return (
        <button
            type="button"
            className="facility-image-button"
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

const Facilities = () => {
    const requestControllerRef = useRef(null);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedImage, setSelectedImage] = useState(null);
    const [facilityToDelete, setFacilityToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const loadFacilities = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setError("");

        try {
            const data = await getFacilities({
                page: currentPage,
                limit: 10,
                search: debouncedSearch,
                status,
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
                setError(
                    requestError.response?.data?.message ||
                        "Unable to load facilities. Please try again."
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
        const timer = window.setTimeout(loadFacilities, 0);
        return () => {
            window.clearTimeout(timer);
            requestControllerRef.current?.abort();
        };
    }, [loadFacilities]);

    useEffect(() => {
        if (!selectedImage && !facilityToDelete) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (selectedImage) setSelectedImage(null);
            else if (!deletingId) {
                setFacilityToDelete(null);
                setDeleteError("");
            }
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [deletingId, facilityToDelete, selectedImage]);

    const handleSearchChange = (event) => {
        requestControllerRef.current?.abort();
        setSearch(event.target.value);
    };

    const clearSearch = () => {
        requestControllerRef.current?.abort();
        setSearch("");
        setDebouncedSearch("");
        setCurrentPage(1);
    };

    const handleStatusChange = (event) => {
        requestControllerRef.current?.abort();
        setStatus(event.target.value);
        setCurrentPage(1);
    };

    const openDeleteModal = (facility) => {
        setFacilityToDelete(facility);
        setDeleteError("");
    };

    const closeDeleteModal = () => {
        if (deletingId) return;
        setFacilityToDelete(null);
        setDeleteError("");
    };

    const handleDelete = async () => {
        if (!facilityToDelete || deletingId) return;

        setDeletingId(facilityToDelete._id);
        setDeleteError("");
        try {
            await deleteFacility(facilityToDelete._id);
            setFacilityToDelete(null);
            if (facilities.length === 1 && currentPage > 1) {
                setCurrentPage((page) => page - 1);
            } else {
                await loadFacilities();
            }
        } catch (requestError) {
            setDeleteError(
                requestError.response?.data?.message ||
                    "Failed to delete facility. Please try again."
            );
        } finally {
            setDeletingId("");
        }
    };

    const paginationItems = getPaginationItems(currentPage, totalPages);
    const hasActiveFilters = Boolean(debouncedSearch || status);

    return (
        <section className="admin-page facility-page">
            <header className="facility-page-heading">
                <div>
                    <h1>Facilities</h1>
                    <p>Manage barangay facilities available for reservation.</p>
                </div>
            </header>

            <div className="facility-toolbar">
                <div className="facility-search">
                    <FiSearch aria-hidden="true" />
                    <input
                        type="search"
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="Search facilities..."
                        aria-label="Search facilities"
                    />
                    {search && (
                        <button type="button" onClick={clearSearch} aria-label="Clear search">
                            <FiX aria-hidden="true" />
                        </button>
                    )}
                </div>

                <div className="facility-filter">
                    <FiFilter aria-hidden="true" />
                    <label className="facility-visually-hidden" htmlFor="facilityStatus">
                        Filter facilities by status
                    </label>
                    <select id="facilityStatus" value={status} onChange={handleStatusChange}>
                        {STATUS_OPTIONS.map((option) => (
                            <option value={option.value} key={option.value || "all"}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <Link className="facility-add-link" to="/admin/facilities/add">
                    <FiPlus aria-hidden="true" />
                    Add Facility
                </Link>
            </div>

            {loading ? (
                <div className="facility-state" role="status">
                    <span className="facility-loader" aria-hidden="true" />
                    <p>Loading facilities...</p>
                </div>
            ) : error ? (
                <div className="facility-state facility-state-error" role="alert">
                    <h2>Facilities could not be loaded</h2>
                    <p>{error}</p>
                    <button type="button" onClick={loadFacilities}>Retry</button>
                </div>
            ) : facilities.length === 0 ? (
                <div className="facility-state">
                    <FiHome aria-hidden="true" />
                    <h2>
                        {hasActiveFilters
                            ? "No facilities match your search or filter."
                            : "No facilities found."}
                    </h2>
                    <p>
                        {hasActiveFilters
                            ? "Try changing the search text or selected status."
                            : "Add a facility to begin managing reservation spaces."}
                    </p>
                </div>
            ) : (
                <div className="facility-table-card">
                    <div className="facility-table-wrap">
                        <table className="facility-table">
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Facility</th>
                                    <th>Category</th>
                                    <th>Location</th>
                                    <th>Capacity</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facilities.map((facility) => (
                                    <tr key={facility._id}>
                                        <td>
                                            <FacilityThumbnail
                                                facility={facility}
                                                onOpen={(item) => setSelectedImage({
                                                    src: item.image,
                                                    name: item.facilityName,
                                                })}
                                            />
                                        </td>
                                        <td>
                                            <div className="facility-identity">
                                                <strong>{facility.facilityName}</strong>
                                                {facility.description && (
                                                    <span>{facility.description}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{facility.category}</td>
                                        <td>{facility.location || "—"}</td>
                                        <td>{facility.capacity ?? "—"}</td>
                                        <td>
                                            <span className={`facility-status facility-status-${facility.status}`}>
                                                {facility.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="facility-actions">
                                                <Link
                                                    to={`/admin/facilities/${facility._id}/edit`}
                                                    aria-label={`Edit ${facility.facilityName}`}
                                                >
                                                    <FiEdit2 aria-hidden="true" />
                                                    Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteModal(facility)}
                                                    disabled={deletingId === facility._id}
                                                >
                                                    <FiTrash2 aria-hidden="true" />
                                                    {deletingId === facility._id ? "Deleting..." : "Delete"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="facility-pagination-footer">
                        <p>
                            Showing page {currentPage} of {totalPages} · {totalItems} total {totalItems === 1 ? "facility" : "facilities"}
                        </p>
                        <nav className="facility-pagination" aria-label="Facility pages">
                            <button
                                type="button"
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage((page) => page - 1)}
                            >
                                Previous
                            </button>
                            {paginationItems.map((item) =>
                                typeof item === "number" ? (
                                    <button
                                        type="button"
                                        key={item}
                                        className={item === currentPage ? "active" : ""}
                                        aria-current={item === currentPage ? "page" : undefined}
                                        onClick={() => setCurrentPage(item)}
                                    >
                                        {item}
                                    </button>
                                ) : (
                                    <span key={item} aria-hidden="true">…</span>
                                )
                            )}
                            <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage((page) => page + 1)}
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                </div>
            )}

            {selectedImage && (
                <div
                    className="facility-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Image preview for ${selectedImage.name}`}
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        type="button"
                        className="facility-lightbox-close"
                        aria-label="Close image preview"
                        onClick={() => setSelectedImage(null)}
                    >
                        <FiX aria-hidden="true" />
                    </button>
                    <div
                        className="facility-lightbox-content"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <img src={selectedImage.src} alt={selectedImage.name} />
                        <p>{selectedImage.name}</p>
                    </div>
                </div>
            )}

            {facilityToDelete && (
                <div className="facility-modal-backdrop" onClick={closeDeleteModal}>
                    <div
                        className="facility-delete-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-facility-title"
                        aria-describedby="delete-facility-description"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <span className="facility-delete-icon" aria-hidden="true">
                            <FiAlertTriangle />
                        </span>
                        <h2 id="delete-facility-title">Delete Facility</h2>
                        <p id="delete-facility-description">
                            Are you sure you want to delete <strong>{facilityToDelete.facilityName}</strong>?
                            This action cannot be undone.
                        </p>
                        {deleteError && (
                            <div className="facility-delete-error" role="alert">
                                {deleteError}
                            </div>
                        )}
                        <div className="facility-delete-actions">
                            <button
                                type="button"
                                className="facility-secondary-button"
                                onClick={closeDeleteModal}
                                disabled={Boolean(deletingId)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="facility-primary-button"
                                onClick={handleDelete}
                                disabled={Boolean(deletingId)}
                            >
                                {deletingId ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default Facilities;
