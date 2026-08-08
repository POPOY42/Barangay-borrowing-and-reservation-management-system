import { createContext, useContext, useState } from "react";
import { clearAuthData } from "../services/auth";

const AuthContext = createContext(null);

const getStoredAuth = () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
        return { token: null, user: null };
    }

    try {
        return { token, user: JSON.parse(storedUser) };
    } catch {
        clearAuthData();
        return { token: null, user: null };
    }
};

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(getStoredAuth);

    const loginUser = (token, user) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setAuth({ token, user });
    };

    const logoutUser = () => {
        clearAuthData();
        setAuth({ token: null, user: null });
    };

    return (
        <AuthContext.Provider
            value={{
                token: auth.token,
                user: auth.user,
                loginUser,
                logoutUser,
                isAuthenticated: Boolean(auth.token && auth.user),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
export const useAuth = () => useContext(AuthContext);
