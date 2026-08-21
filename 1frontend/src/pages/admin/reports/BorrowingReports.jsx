import { useCallback, useEffect, useState } from "react";
import AdminPagination from "../../../components/admin/AdminPagination";
import { getBorrowingReport } from "../../../services/reportService";
import "../../../css/admin/report.css";

const STATUSES = ["pending", "approved", "borrowed", "returned", "rejected", "cancelled"];
const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
};
const residentName = (user) => [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") || "Unavailable resident";

const BorrowingReports = () => {
    const [filters, setFilters] = useState({ status: "", dateFrom: "", dateTo: "" });
    const [page, setPage] = useState(1);
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({});
    const [pagination, setPagination] = useState({ totalPages: 0, totalItems: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadReport = useCallback(async (signal) => {
        setLoading(true); setError("");
        try {
            const data = await getBorrowingReport({ page, ...filters, signal });
            setRecords(Array.isArray(data.records) ? data.records : []);
            setSummary(data.summary || {});
            setPagination(data.pagination || { totalPages: 0, totalItems: 0 });
        } catch (requestError) {
            if (!signal?.aborted) { setRecords([]); setSummary({}); setError(requestError.response?.data?.message || "Unable to load borrowing report."); }
        } finally { if (!signal?.aborted) setLoading(false); }
    }, [filters, page]);

    useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => loadReport(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [loadReport]);
    const changeFilter = (event) => { const { name, value } = event.target; setFilters((current) => ({ ...current, [name]: value })); setPage(1); };
    const clearFilters = () => { setFilters({ status: "", dateFrom: "", dateTo: "" }); setPage(1); };

    return <section className="admin-page admin-report-page">
        <header className="admin-report-heading"><h1>Borrowing Reports</h1><p>Review real borrowing records and lifecycle totals.</p></header>
        <div className="admin-report-filters"><label>Status<select name="status" value={filters.status} onChange={changeFilter}><option value="">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label><label>Date From<input type="date" name="dateFrom" value={filters.dateFrom} onChange={changeFilter} /></label><label>Date To<input type="date" name="dateTo" value={filters.dateTo} onChange={changeFilter} /></label><button type="button" onClick={clearFilters}>Clear Filters</button></div>
        {!loading && !error && <div className="admin-report-summary"><article><strong>{summary.total || 0}</strong><span>Total Records</span></article>{STATUSES.map((status) => <article key={status}><strong>{summary[status] || 0}</strong><span>{status[0].toUpperCase() + status.slice(1)}</span></article>)}</div>}
        <div className="admin-report-panel">{loading ? <div className="admin-report-state" role="status"><span className="admin-report-loader" /><p>Loading borrowing report...</p></div> : error ? <div className="admin-report-state" role="alert"><h2>Borrowing report could not be loaded</h2><p>{error}</p><button type="button" onClick={() => loadReport()}>Retry</button></div> : records.length === 0 ? <div className="admin-report-state"><h2>No borrowing records found.</h2><p>Try changing the report filters.</p></div> : <><div className="admin-report-table-wrap"><table className="admin-report-table"><thead><tr><th>Resident</th><th>Equipment</th><th>Qty</th><th>Borrow Date</th><th>Return Date</th><th>Status</th><th>Requested</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td><strong>{residentName(record.user)}</strong><small>{record.user?.email || "—"}</small></td><td><strong>{record.equipment?.equipmentName || "Unavailable equipment"}</strong><small>{record.equipment?.category || "—"}</small></td><td>{record.quantity}</td><td>{formatDate(record.borrowDate)}</td><td>{formatDate(record.returnDate)}</td><td><span className="admin-report-status">{record.status}</span></td><td>{formatDate(record.createdAt)}</td></tr>)}</tbody></table></div><AdminPagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} itemLabel="borrowing record" ariaLabel="Borrowing report pages" onPageChange={setPage} /></>}</div>
    </section>;
};

export default BorrowingReports;
