import api from "./api";

const getMyProfile = async (signal) => {
    const response = await api.get("/profile", { signal });
    return response.data;
};

const updateMyProfile = async (data) => {
    const response = await api.patch("/profile", data);
    return response.data;
};

const changePassword = async (data) => {
    const response = await api.patch("/profile/change-password", data);
    return response.data;
};

const getNotificationPreferences = async (signal) => {
    const response = await api.get("/profile/notifications", { signal });
    return response.data;
};

const updateNotificationPreferences = async (data) => {
    const response = await api.patch("/profile/notifications", data);
    return response.data;
};

export {
    changePassword,
    getMyProfile,
    getNotificationPreferences,
    updateMyProfile,
    updateNotificationPreferences,
};
