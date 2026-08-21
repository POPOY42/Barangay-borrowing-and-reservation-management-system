import "../../css/admin/adminPagination.css";

const getPageItems = (currentPage, totalPages) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [...new Set([
        1,
        totalPages,
        currentPage - 2,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        currentPage + 2,
    ])]
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((first, second) => first - second);

    return pages.flatMap((page, index) => {
        const previousPage = pages[index - 1];
        return previousPage && page - previousPage > 1
            ? [`ellipsis-${previousPage}`, page]
            : [page];
    });
};

const AdminPagination = ({
    currentPage,
    totalPages,
    totalItems,
    itemLabel = "record",
    pluralItemLabel,
    onPageChange,
    ariaLabel = "Pagination",
}) => {
    const safeTotalPages = Math.max(Number(totalPages) || 0, 1);
    const safeCurrentPage = Math.min(
        Math.max(Number(currentPage) || 1, 1),
        safeTotalPages
    );
    const itemCount = Math.max(Number(totalItems) || 0, 0);
    const irregularLabels = {
        facility: "facilities",
        history: "histories",
    };
    const pluralLabel = pluralItemLabel || irregularLabels[itemLabel] || `${itemLabel}s`;
    const countLabel = itemCount === 1 ? itemLabel : pluralLabel;

    return (
        <footer className="admin-pagination-footer">
            <p>
                Page {safeCurrentPage} of {safeTotalPages} · {itemCount} {countLabel}
            </p>
            <nav className="admin-pagination" aria-label={ariaLabel}>
                <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => onPageChange(safeCurrentPage - 1)}
                >
                    Previous
                </button>
                {getPageItems(safeCurrentPage, safeTotalPages).map((item) =>
                    typeof item === "number" ? (
                        <button
                            type="button"
                            key={item}
                            className={item === safeCurrentPage ? "active" : ""}
                            aria-current={item === safeCurrentPage ? "page" : undefined}
                            onClick={() => onPageChange(item)}
                        >
                            {item}
                        </button>
                    ) : (
                        <span key={item} aria-hidden="true">…</span>
                    )
                )}
                <button
                    type="button"
                    disabled={safeCurrentPage === safeTotalPages}
                    onClick={() => onPageChange(safeCurrentPage + 1)}
                >
                    Next
                </button>
            </nav>
        </footer>
    );
};

export default AdminPagination;
