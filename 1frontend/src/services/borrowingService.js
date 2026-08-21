import api from "./api";

const createBorrowing = async (data) => {
    const response = await api.post("/borrowing", data);
    return response.data;
};

const getMyBorrowings = async (page = 1, status = "", signal, limit = 10) => {
    const response = await api.get("/borrowing", {
        params: { page, limit, ...(status ? { status } : {}) },
        signal,
    });
    return response.data;
};

const getGroupedMyBorrowings = async (page = 1, signal) => {
    const response = await api.get("/borrowing/grouped", {
        params: { page, limit: 10 },
        signal,
    });
    return response.data;
};

const getMyEquipmentBorrowingHistory = async (equipmentId, signal) => {
    const response = await api.get(`/borrowing/equipment/${equipmentId}/history`, {
        signal,
    });
    return response.data;
};

const updateBorrowing = async (id, data) => {
    const response = await api.patch(`/borrowing/${id}`, data);
    return response.data;
};

const cancelBorrowing = async (id) => {
    const response = await api.patch(`/borrowing/${id}/cancel`);
    return response.data;
};

const getAllBorrowings = async ({
    page = 1,
    status = "",
    type = "",
    signal,
} = {}) => {
    const response = await api.get("/borrowing/all", {
        params: {
            page,
            limit: 10,
            ...(status ? { status } : {}),
            ...(type ? { type } : {}),
        },
        signal,
    });
    return response.data;
};

const approveBorrowing = async (id) => {
    const response = await api.patch(`/borrowing/${id}/approve`);
    return response.data;
};

const rejectBorrowing = async (id, rejectionReason) => {
    const response = await api.patch(`/borrowing/${id}/reject`, { rejectionReason });
    return response.data;
};

const markAsBorrowed = async (id) => {
    const response = await api.patch(`/borrowing/${id}/borrow`);
    return response.data;
};

const markAsReturned = async (id) => {
    const response = await api.patch(`/borrowing/${id}/return`);
    return response.data;
};

export {
    approveBorrowing,
    cancelBorrowing,
    createBorrowing,
    getAllBorrowings,
    getGroupedMyBorrowings,
    getMyBorrowings,
    getMyEquipmentBorrowingHistory,
    markAsBorrowed,
    markAsReturned,
    rejectBorrowing,
    updateBorrowing,
};
