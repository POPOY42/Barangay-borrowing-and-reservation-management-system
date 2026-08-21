import api from "./api";

const getResidentDashboardStats = async (signal) => {
    const response = await api.get("/dashboard/resident", { signal });
    return response.data;
};

export { getResidentDashboardStats };
