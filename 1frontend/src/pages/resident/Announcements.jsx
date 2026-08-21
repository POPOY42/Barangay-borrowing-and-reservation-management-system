import { useCallback, useEffect, useRef, useState } from "react";
import { FiArrowRight, FiBell, FiCalendar, FiSearch, FiX } from "react-icons/fi";
import ResidentPagination from "../../components/resident/ResidentPagination";
import { getAnnouncements } from "../../services/announcementService";
import "../../css/resident/announcement.css";

const formatDate = (value) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(date);
};

const Announcements = () => {
    const requestControllerRef = useRef(null);
    const [announcements, setAnnouncements] = useState([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    const loadAnnouncements = useCallback(async () => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setLoading(true);
        setLoadError("");
        try {
            const data = await getAnnouncements({
                page: currentPage,
                limit: 9,
                search: debouncedSearch,
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
    }, [currentPage, debouncedSearch]);

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

    useEffect(() => {
        if (!selectedAnnouncement) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setSelectedAnnouncement(null);
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedAnnouncement]);

    const clearSearch = () => {
        requestControllerRef.current?.abort();
        setSearch("");
        setDebouncedSearch("");
        setCurrentPage(1);
    };

    return (
        <section className="resident-page resident-announcement-page">
            <header className="resident-page-heading">
                <span>Community Updates</span>
                <h1>Announcements</h1>
                <p>Stay updated with the latest barangay news and notices.</p>
            </header>

            <label className="resident-announcement-search">
                <FiSearch aria-hidden="true" />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search announcements..." aria-label="Search announcements" />
                {search && <button type="button" onClick={clearSearch} aria-label="Clear search"><FiX aria-hidden="true" /></button>}
            </label>

            {loading ? (
                <div className="resident-announcement-state" role="status">
                    <span className="resident-announcement-loader" aria-hidden="true" />
                    <p>Loading announcements...</p>
                </div>
            ) : loadError ? (
                <div className="resident-announcement-state error" role="alert">
                    <FiBell aria-hidden="true" />
                    <h2>Announcements could not be loaded</h2>
                    <p>{loadError}</p>
                    <button type="button" onClick={loadAnnouncements}>Retry</button>
                </div>
            ) : announcements.length === 0 ? (
                <div className="resident-announcement-state">
                    <FiBell aria-hidden="true" />
                    <h2>{debouncedSearch ? "No announcements match your search." : "No announcements have been published yet."}</h2>
                    <p>{debouncedSearch ? "Try a different title or keyword." : "New barangay news and notices will appear here."}</p>
                </div>
            ) : (
                <>
                    <div className="resident-announcement-grid">
                        {announcements.map((announcement) => (
                            <article className={`resident-announcement-card ${announcement.priority}`} key={announcement._id}>
                                <div className="resident-announcement-card-top">
                                    {announcement.priority === "important" && <span className="resident-announcement-important">Important</span>}
                                    <span className="resident-announcement-date"><FiCalendar aria-hidden="true" />Published {formatDate(announcement.publishedAt)}</span>
                                </div>
                                <h2>{announcement.title}</h2>
                                <p className="resident-announcement-preview">{announcement.content}</p>
                                <button type="button" onClick={() => setSelectedAnnouncement(announcement)}>
                                    Read More<FiArrowRight aria-hidden="true" />
                                </button>
                            </article>
                        ))}
                    </div>

                    <ResidentPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        limit={9}
                        itemLabel="announcement"
                        onPageChange={setCurrentPage}
                    />
                </>
            )}

            {selectedAnnouncement && (
                <div className="resident-announcement-backdrop" onClick={() => setSelectedAnnouncement(null)}>
                    <article className={`resident-announcement-modal ${selectedAnnouncement.priority}`} role="dialog" aria-modal="true" aria-labelledby="resident-announcement-title" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="resident-announcement-close" onClick={() => setSelectedAnnouncement(null)} aria-label="Close announcement"><FiX aria-hidden="true" /></button>
                        {selectedAnnouncement.priority === "important" && <span className="resident-announcement-important">Important</span>}
                        <h2 id="resident-announcement-title">{selectedAnnouncement.title}</h2>
                        <p className="resident-announcement-modal-date"><FiCalendar aria-hidden="true" />Published {formatDate(selectedAnnouncement.publishedAt)}</p>
                        <div className="resident-announcement-full-content">{selectedAnnouncement.content}</div>
                    </article>
                </div>
            )}
        </section>
    );
};

export default Announcements;
