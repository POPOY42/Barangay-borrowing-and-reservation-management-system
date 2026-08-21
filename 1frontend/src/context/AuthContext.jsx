import { createContext, useCallback, useContext, useState } from "react";
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

    const loginUser = useCallback((token, user) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setAuth({ token, user });
    }, []);

    const logoutUser = useCallback(() => {
        clearAuthData();
        setAuth({ token: null, user: null });
    }, []);

    const updateUser = useCallback((userUpdates) => {
        setAuth((current) => {
            if (!current.user) return current;

            const user = { ...current.user, ...userUpdates };
            localStorage.setItem("user", JSON.stringify(user));

            return { ...current, user };
        });
    }, []);

    return (
        <AuthContext.Provider
            value={{
                token: auth.token,
                user: auth.user,
                loginUser,
                logoutUser,
                updateUser,
                isAuthenticated: Boolean(auth.token && auth.user),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
// Auth hooks intentionally share this module with the provider component.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
