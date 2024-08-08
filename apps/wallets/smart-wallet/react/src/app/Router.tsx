import { useContext } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppContext } from "./AppContext";
import { AuthenticatedRoute } from "./components/AuthenticatedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { Login } from "./pages/login";
import { Mint } from "./pages/mint";
import { Wallet } from "./pages/wallet";

export const AppRouter = () => {
    const { isAuthenticated } = useContext(AppContext);

    return (
        <MainLayout>
            <Routes>
                {isAuthenticated === null ? null : (
                    <>
                        <Route path="/" element={isAuthenticated ? <Navigate to="/mint" replace /> : <Login />} />
                        <Route path="/mint" element={<AuthenticatedRoute element={<Mint />} />} />
                        <Route path="/wallet" element={<AuthenticatedRoute element={<Wallet />} />} />
                        {/* Redirección para rutas no especificadas */}
                        <Route
                            path="*"
                            element={isAuthenticated ? <Navigate to="/mint" replace /> : <Navigate to="/" replace />}
                        />
                    </>
                )}
            </Routes>
        </MainLayout>
    );
};
