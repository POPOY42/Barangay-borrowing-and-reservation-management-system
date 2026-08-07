import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRole }) => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    console.log("PROTECTED ROUTE RUNNING");
    console.log("TOKEN:", token);
    console.log("USER:", storedUser);
    console.log("ALLOWED ROLE:", allowedRole);

    if (!token || !storedUser) {
        console.log("NO LOGIN → REDIRECTING TO LOGIN");

        return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(storedUser);

    if (allowedRole && user.role !== allowedRole) {
        console.log("WRONG ROLE → REDIRECTING TO LOGIN");

        return <Navigate to="/login" replace />;
    }

    console.log("ACCESS GRANTED");

    return children;
};

export default ProtectedRoute;