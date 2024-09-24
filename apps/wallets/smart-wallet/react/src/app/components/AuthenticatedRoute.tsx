import type React from "react";
import { useContext } from "react";
import { Navigate } from "react-router-dom";

import { AppContext } from "../AppContext";

type AuthenticatedRouteProps = {
    element: React.ReactElement;
};

export const AuthenticatedRoute = ({ element }: AuthenticatedRouteProps) => {
    const { isAuthenticated } = useContext(AppContext);

    if (isAuthenticated === null) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return element;
};
