const escapeRegex = (value = "") =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePagination = (query, defaultLimit = 10) => {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? defaultLimit : Number(query.limit);

    if (!Number.isInteger(page) || page < 1) {
        return { error: "Page must be a valid positive whole number." };
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return { error: "Limit must be between 1 and 100." };
    }

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
};

const buildPagination = (page, limit, totalItems) => ({
    currentPage: page,
    totalPages: Math.ceil(totalItems / limit),
    totalItems,
    limit,
});

export { escapeRegex, parsePagination, buildPagination };
