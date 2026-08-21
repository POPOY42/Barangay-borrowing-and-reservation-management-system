import api from "./api";

const getFacilities = async ({
    page = 1,
    limit = 10,
    search = "",
    status = "",
    signal,
} = {}) => {
    const response = await api.get("/facilities", {
        params: {
            page,
            limit,
            ...(search ? { search } : {}),
            ...(status ? { status } : {}),
        },
        signal,
    });

    return response.data;
};

const getFacilityById = async (id, signal) => {
    const response = await api.get(`/facilities/${id}`, { signal });
    return response.data;
};

const createFacility = async (formData) => {
    const response = await api.post("/facilities", formData);
    return response.data;
};

const updateFacility = async (id, formData) => {
    const response = await api.patch(`/facilities/${id}`, formData);
    return response.data;
};

const deleteFacility = async (id) => {
    const response = await api.delete(`/facilities/${id}`);
    return response.data;
};

export {
    createFacility,
    deleteFacility,
    getFacilities,
    getFacilityById,
    updateFacility,
};
