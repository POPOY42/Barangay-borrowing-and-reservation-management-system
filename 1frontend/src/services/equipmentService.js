import api from "./api";

const getAllEquipment = async (page = 1, search = "", signal, borrowable = false) => {
    const response = await api.get("/equipment", {
        params: {
            page,
            limit: 10,
            ...(search ? { search } : {}),
            ...(borrowable ? { borrowable: true } : {}),
        },
        signal,
    });

    return response.data;
};

const createEquipment = async (formData) => {
    const response = await api.post("/equipment", formData);

    return response.data;
};

const getEquipmentById = async (id, signal) => {
    const response = await api.get(`/equipment/${id}`, { signal });

    return response.data;
};

const updateEquipment = async (id, formData) => {
    const response = await api.patch(`/equipment/${id}`, formData);

    return response.data;
};

const deleteEquipment = async (id) => {
    const response = await api.delete(`/equipment/${id}`);

    return response.data;
};

export {
    createEquipment,
    deleteEquipment,
    getAllEquipment,
    getEquipmentById,
    updateEquipment,
};
