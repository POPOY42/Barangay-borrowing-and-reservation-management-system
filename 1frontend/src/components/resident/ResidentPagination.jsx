import "../../css/resident/residentPages.css";

const getPaginationItems = (currentPage, totalPages) => {
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
        .sort((a, b) => a - b);
    const items = [];

    pages.forEach((page, index) => {
        if (index > 0 && page - pages[index - 1] > 1) {
            items.push(`ellipsis-${page}`);
        }
        items.push(page);
    });

    return items;
};

const ResidentPagination = ({
    currentPage,
    totalPages,
    totalItems,
    limit = 10,
    itemLabel = "item",
    onPageChange,
}) => {
    const pageCount = Math.max(Number(totalPages) || 0, 1);
    const activePage = Math.min(Math.max(Number(currentPage) || 1, 1), pageCount);
    const itemCount = Math.max(Number(totalItems) || 0, 0);
    const labelForms = {
        announcement: ["announcement", "announcements"],
        borrowing: ["borrowing", "borrowings"],
        equipment: ["equipment item", "equipment items"],
        facility: ["facility", "facilities"],
        reservation: ["reservation", "reservations"],
    };
    const [singularLabel, pluralLabel] = labelForms[itemLabel] || [
        itemLabel,
        `${itemLabel}s`,
    ];
    const countLabel = itemCount === 1 ? singularLabel : pluralLabel;
    const paginationItems = getPaginationItems(activePage, pageCount);

    return (
        <footer className="resident-pagination" data-page-size={limit}>
            <p>Page {activePage} of {pageCount} · {itemCount} {countLabel}</p>
            <nav className="resident-pagination-controls" aria-label={`${pluralLabel} pages`}>
                <button
                    type="button"
                    disabled={activePage <= 1}
                    onClick={() => onPageChange(activePage - 1)}
                >
                    Previous
                </button>
                {paginationItems.map((item) =>
                    typeof item === "number" ? (
                        <button
                            type="button"
                            key={item}
                            className={item === activePage ? "active" : ""}
                            aria-current={item === activePage ? "page" : undefined}
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
                    disabled={activePage >= pageCount}
                    onClick={() => onPageChange(activePage + 1)}
                >
                    Next
                </button>
            </nav>
        </footer>
    );
};

export default ResidentPagination;
