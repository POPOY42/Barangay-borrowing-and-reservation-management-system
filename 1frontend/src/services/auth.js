export const clearAuthData = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
};