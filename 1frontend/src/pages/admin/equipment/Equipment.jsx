import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    deleteEquipment,
    getAllEquipment,
} from "../../../services/equipmentService";
import "../../../css/admin/equipment.css";

const getPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set([
        1,
        totalPages,
        currentPage - 1,
        currentPage,
        currentPage + 1,
    ]);
    const visiblePages = [...pages]
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((first, second) => first - second);
    const items = [];

    visiblePages.forEach((page, index) => {
        const previousPage = visiblePages[index - 1];

        if (previousPage && page - previousPage > 1) {
            items.push(`ellipsis-${previousPage}`);
        }

        items.push(page);
    });

    return items;
};

const Equipment = () => {
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [deletingId, setDeletingId] = useState("");
    const [equipmentToDelete, setEquipmentToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const requestControllerRef = useRef(null);

    const fetchEquipment = useCallback(async () => {
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;

        setLoading(true);
        setError("");

        try {
            const data = await getAllEquipment(
                currentPage,
                debouncedSearch,
                controller.signal
            );
            const pagination = data.pagination ?? {};

            setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
            setCurrentPage(pagination.currentPage ?? currentPage);
            setTotalPages(pagination.totalPages ?? 0);
            setTotalItems(pagination.totalItems ?? 0);
        } catch (requestError) {
            if (!controller.signal.aborted) {
                setEquipment([]);
                setError(
                    requestError.response?.data?.message ||
                        "Unable to load equipment. Please try again."
                );
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [currentPage, debouncedSearch]);

    useEffect(() => {
        const debounceTimer = window.setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearch(search.trim());
        }, 400);

        return () => window.clearTimeout(debounceTimer);
    }, [search]);

    useEffect(() => {
        const fetchTimer = window.setTimeout(fetchEquipment, 0);

        return () => {
            window.clearTimeout(fetchTimer);
            requestControllerRef.current?.abort();
        };
    }, [fetchEquipment]);

    useEffect(() => {
        if (!selectedImage) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setSelectedImage(null);
            }
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedImage]);

    useEffect(() => {
        if (!equipmentToDelete) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !deletingId) {
                setEquipmentToDelete(null);
                setDeleteError("");
            }
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [deletingId, equipmentToDelete]);

    const openDeleteModal = (item) => {
        setEquipmentToDelete(item);
        setDeleteError("");
    };

    const closeDeleteModal = () => {
        if (!deletingId) {
            setEquipmentToDelete(null);
            setDeleteError("");
        }
    };

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

    const handleDelete = async () => {
        if (!equipmentToDelete || deletingId) {
            return;
        }

        setDeletingId(equipmentToDelete._id);
        setDeleteError("");

        try {
            await deleteEquipment(equipmentToDelete._id);
            setEquipmentToDelete(null);

            if (equipment.length === 1 && currentPage > 1) {
                setCurrentPage((page) => page - 1);
            } else {
                await fetchEquipment();
            }
        } catch (requestError) {
            setDeleteError(
                requestError.response?.data?.message ||
                    "Failed to delete equipment. Please try again."
            );
        } finally {
            setDeletingId("");
        }
    };

    const paginationItems = getPaginationItems(currentPage, totalPages);

    return (
        <section className="admin-page equipment-page">
            <div className="equipment-page-header">
                <div>
                    <h1>All Equipment</h1>
                    <p>View and manage the barangay equipment inventory.</p>
                </div>
                <Link className="equipment-add-link" to="/admin/equipment/add">
                    Add Equipment
                </Link>
            </div>

            <div className="equipment-search">
                <svg
                    className="equipment-search-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
                </svg>
                <input
                    type="search"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Search equipment..."
                    aria-label="Search equipment"
                />
                {search && (
                    <button
                        type="button"
                        className="equipment-search-clear"
                        onClick={clearSearch}
                        aria-label="Clear equipment search"
                    >
                        ×
                    </button>
                )}
            </div>

            {loading ? (
                <div className="equipment-state" role="status">
                    <span className="equipment-loader" aria-hidden="true" />
                    <p>Loading equipment...</p>
                </div>
            ) : error ? (
                <div className="equipment-state equipment-error" role="alert">
                    <h2>Equipment could not be loaded</h2>
                    <p>{error}</p>
                    <button type="button" onClick={fetchEquipment}>
                        Retry
                    </button>
                </div>
            ) : equipment.length === 0 ? (
                <div className="equipment-state">
                    {debouncedSearch ? (
                        <>
                            <h2>No equipment found for &quot;{debouncedSearch}&quot;.</h2>
                            <p>Try a different equipment name, category, or description.</p>
                        </>
                    ) : (
                        <>
                            <h2>No equipment found.</h2>
                            <p>Add equipment to begin building the inventory.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="equipment-list-card">
                    <div className="equipment-table-wrap">
                        <table className="equipment-table">
                            <thead>
                                <tr>
                                    <th>Equipment</th>
                                    <th>Category</th>
                                    <th>Total</th>
                                    <th>Available</th>
                                    <th>Maintenance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equipment.map((item) => (
                                    <tr key={item._id}>
                                        <td>
                                            <div className="equipment-identity">
                                                {item.image ? (
                                                    <button
                                                        type="button"
                                                        className="equipment-image-button"
                                                        aria-label={`View larger image of ${item.equipmentName}`}
                                                        onClick={() =>
                                                            setSelectedImage({
                                                                src: item.image,
                                                                name: item.equipmentName,
                                                            })
                                                        }
                                                    >
                                                        <img
                                                            src={item.image}
                                                            alt={item.equipmentName}
                                                            className="equipment-thumbnail"
                                                        />
                                                    </button>
                                                ) : (
                                                    <span
                                                        className="equipment-image-placeholder"
                                                        aria-hidden="true"
                                                    >
                                                        {item.equipmentName?.charAt(0).toUpperCase() ||
                                                            "E"}
                                                    </span>
                                                )}
                                                <div>
                                                    <strong>{item.equipmentName}</strong>
                                                    {item.description && (
                                                        <span className="equipment-description">
                                                            {item.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>{item.category}</td>
                                        <td>{item.totalQuantity}</td>
                                        <td>{item.availableQuantity}</td>
                                        <td>{item.maintenanceQuantity}</td>
                                        <td>
                                            <span
                                                className={`equipment-status equipment-status-${item.status}`}
                                            >
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="equipment-actions">
                                                <Link
                                                    to={`/admin/equipment/${item._id}/edit`}
                                                    aria-label={`Edit ${item.equipmentName}`}
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="equipment-delete-button"
                                                    disabled={deletingId === item._id}
                                                    onClick={() => openDeleteModal(item)}
                                                >
                                                    {deletingId === item._id
                                                        ? "Deleting..."
                                                        : "Delete"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="equipment-pagination-footer">
                        <p>
                            Showing page {currentPage} of {totalPages} · {totalItems}{" "}
                            total equipment {totalItems === 1 ? "record" : "records"}
                        </p>

                        {totalPages > 1 && (
                            <nav className="equipment-pagination" aria-label="Equipment pages">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
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
                                        <span key={item} aria-hidden="true">
                                            …
                                        </span>
                                    )
                                )}

                                <button
                                    type="button"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((page) => page + 1)}
                                >
                                    Next
                                </button>
                            </nav>
                        )}
                    </div>
                </div>
            )}

            {selectedImage && (
                <div
                    className="equipment-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Image preview for ${selectedImage.name}`}
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        type="button"
                        className="equipment-lightbox-close"
                        aria-label="Close image preview"
                        onClick={() => setSelectedImage(null)}
                    >
                        ×
                    </button>
                    <div
                        className="equipment-lightbox-content"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <img
                            src={selectedImage.src}
                            alt={selectedImage.name}
                            className="equipment-lightbox-image"
                        />
                        <p>{selectedImage.name}</p>
                    </div>
                </div>
            )}

            {equipmentToDelete && (
                <div
                    className="equipment-delete-modal-backdrop"
                    role="presentation"
                    onClick={closeDeleteModal}
                >
                    <div
                        className="equipment-delete-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-equipment-title"
                        aria-describedby="delete-equipment-description"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="equipment-delete-modal-icon" aria-hidden="true">
                            !
                        </div>
                        <h2 id="delete-equipment-title">Delete Equipment?</h2>
                        <p id="delete-equipment-description">
                            Are you sure you want to delete{" "}
                            <strong>{equipmentToDelete.equipmentName}</strong>? This action
                            cannot be undone.
                        </p>

                        {deleteError && (
                            <div className="equipment-delete-modal-error" role="alert">
                                {deleteError}
                            </div>
                        )}

                        <div className="equipment-delete-modal-actions">
                            <button
                                type="button"
                                className="equipment-cancel-btn"
                                onClick={closeDeleteModal}
                                disabled={Boolean(deletingId)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="equipment-confirm-delete-btn"
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

export default Equipment;
