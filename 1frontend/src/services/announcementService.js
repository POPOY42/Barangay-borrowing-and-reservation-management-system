import api from "./api";

const getAnnouncements = async ({
    page = 1,
    limit = 10,
    search = "",
    status = "",
    signal,
} = {}) => {
    const response = await api.get("/announcements", {
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

const getAnnouncementById = async (id, signal) => {
    const response = await api.get(`/announcements/${id}`, { signal });
    return response.data;
};

const createAnnouncement = async (data) => {
    const response = await api.post("/announcements", data);
    return response.data;
};

const updateAnnouncement = async (id, data) => {
    const response = await api.patch(`/announcements/${id}`, data);
    return response.data;
};

const deleteAnnouncement = async (id) => {
    const response = await api.delete(`/announcements/${id}`);
    return response.data;
};

export {
    createAnnouncement,
    deleteAnnouncement,
    getAnnouncementById,
    getAnnouncements,
    updateAnnouncement,
};
