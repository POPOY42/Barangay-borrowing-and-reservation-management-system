import api from "./api";

const getResidents = async ({ page = 1, limit = 10, search = "", signal } = {}) => {
    const response = await api.get("/users/residents", {
        params: { page, limit, ...(search ? { search } : {}) },
        signal,
    });
    return response.data;
};

const getResidentById = async (id, signal) => {
    const response = await api.get(`/users/residents/${id}`, { signal });
    return response.data;
};

const updateResidentStatus = async (id, accountStatus) => {
    const response = await api.patch(`/users/residents/${id}/status`, { accountStatus });
    return response.data;
};

export { getResidentById, getResidents, updateResidentStatus };
