import { useCallback, useEffect, useState } from "react";
import AdminPagination from "../../../components/admin/AdminPagination";
import { getEquipmentReport } from "../../../services/reportService";
import "../../../css/admin/report.css";

const SUMMARY_FIELDS = [
    ["totalEquipmentTypes", "Equipment Types"],
    ["activeEquipmentTypes", "Active Types"],
    ["inactiveEquipmentTypes", "Inactive Types"],
    ["totalUnits", "Total Units"],
    ["availableUnits", "Available Units"],
    ["maintenanceUnits", "Maintenance Units"],
    ["borrowedUnits", "Borrowed Units"],
];

const EquipmentReports = () => {
    const [page, setPage] = useState(1);
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({});
    const [pagination, setPagination] = useState({ totalPages: 0, totalItems: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadReport = useCallback(async (signal) => {
        setLoading(true); setError("");
        try {
            const data = await getEquipmentReport({ page, signal });
            setRecords(Array.isArray(data.records) ? data.records : []); setSummary(data.summary || {}); setPagination(data.pagination || { totalPages: 0, totalItems: 0 });
        } catch (requestError) {
            if (!signal?.aborted) { setRecords([]); setSummary({}); setError(requestError.response?.data?.message || "Unable to load equipment report."); }
        } finally { if (!signal?.aborted) setLoading(false); }
    }, [page]);

    useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => loadReport(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [loadReport]);

    return <section className="admin-page admin-report-page">
        <header className="admin-report-heading"><h1>Equipment Reports</h1><p>Review inventory types and real unit totals.</p></header>
        {!loading && !error && <div className="admin-report-summary">{SUMMARY_FIELDS.map(([key, label]) => <article key={key}><strong>{summary[key] || 0}</strong><span>{label}</span></article>)}</div>}
        <div className="admin-report-panel">{loading ? <div className="admin-report-state" role="status"><span className="admin-report-loader" /><p>Loading equipment report...</p></div> : error ? <div className="admin-report-state" role="alert"><h2>Equipment report could not be loaded</h2><p>{error}</p><button type="button" onClick={() => loadReport()}>Retry</button></div> : records.length === 0 ? <div className="admin-report-state"><h2>No equipment records found.</h2><p>Equipment inventory will appear here once created.</p></div> : <><div className="admin-report-table-wrap"><table className="admin-report-table"><thead><tr><th>Equipment</th><th>Category</th><th>Total</th><th>Available</th><th>Maintenance</th><th>Borrowed</th><th>Status</th></tr></thead><tbody>{records.map((record) => { const borrowed = Math.max(0, (record.totalQuantity || 0) - (record.availableQuantity || 0) - (record.maintenanceQuantity || 0)); return <tr key={record._id}><td><strong>{record.equipmentName || "Unavailable equipment"}</strong></td><td>{record.category || "—"}</td><td>{record.totalQuantity || 0}</td><td>{record.availableQuantity || 0}</td><td>{record.maintenanceQuantity || 0}</td><td>{borrowed}</td><td><span className="admin-report-status">{record.status}</span></td></tr>; })}</tbody></table></div><AdminPagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} itemLabel="equipment record" ariaLabel="Equipment report pages" onPageChange={setPage} /></>}</div>
    </section>;
};

export default EquipmentReports;
