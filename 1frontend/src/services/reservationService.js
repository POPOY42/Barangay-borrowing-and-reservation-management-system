import api from "./api";

const createReservation = async (data) => {
    const response = await api.post("/reservations", data);
    return response.data;
};

const getMyReservations = async ({
    page = 1,
    limit = 10,
    status = "",
    type = "",
    signal,
} = {}) => {
    const response = await api.get("/reservations", {
        params: {
            page,
            limit,
            ...(status ? { status } : {}),
            ...(type ? { type } : {}),
        },
        signal,
    });

    return response.data;
};

const getGroupedMyReservations = async (page = 1, signal) => {
    const response = await api.get("/reservations/grouped", {
        params: { page, limit: 10 },
        signal,
    });
    return response.data;
};

const getMyFacilityReservationHistory = async (facilityId, signal) => {
    const response = await api.get(`/reservations/facility/${facilityId}/history`, {
        signal,
    });
    return response.data;
};

const updateReservation = async (id, data) => {
    const response = await api.patch(`/reservations/${id}`, data);
    return response.data;
};

const cancelReservation = async (id) => {
    const response = await api.patch(`/reservations/${id}/cancel`);
    return response.data;
};

const getAllReservations = async ({
    page = 1,
    limit = 10,
    status = "",
    type = "",
    search = "",
    signal,
} = {}) => {
    const response = await api.get("/reservations/all", {
        params: {
            page,
            limit,
            ...(status ? { status } : {}),
            ...(type ? { type } : {}),
            ...(search ? { search } : {}),
        },
        signal,
    });

    return response.data;
};

const approveReservation = async (id) => {
    const response = await api.patch(`/reservations/${id}/approve`);
    return response.data;
};

const rejectReservation = async (id, rejectionReason) => {
    const response = await api.patch(`/reservations/${id}/reject`, {
        rejectionReason,
    });
    return response.data;
};

const completeReservation = async (id) => {
    const response = await api.patch(`/reservations/${id}/complete`);
    return response.data;
};

export {
    approveReservation,
    cancelReservation,
    completeReservation,
    createReservation,
    getAllReservations,
    getGroupedMyReservations,
    getMyFacilityReservationHistory,
    getMyReservations,
    rejectReservation,
    updateReservation,
};
