import api from "./api";

const getBorrowingReport = async ({ page = 1, limit = 10, status = "", dateFrom = "", dateTo = "", signal } = {}) => {
    const response = await api.get("/reports/borrowings", { params: { page, limit, ...(status ? { status } : {}), ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) }, signal });
    return response.data;
};

const getReservationReport = async ({ page = 1, limit = 10, status = "", facility = "", dateFrom = "", dateTo = "", signal } = {}) => {
    const response = await api.get("/reports/reservations", { params: { page, limit, ...(status ? { status } : {}), ...(facility ? { facility } : {}), ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) }, signal });
    return response.data;
};

const getEquipmentReport = async ({ page = 1, limit = 10, signal } = {}) => {
    const response = await api.get("/reports/equipment", { params: { page, limit }, signal });
    return response.data;
};

export { getBorrowingReport, getEquipmentReport, getReservationReport };
