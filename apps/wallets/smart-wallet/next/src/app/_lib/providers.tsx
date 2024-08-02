"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useContext } from "react";

import { AppContext, AppProvider } from "./app-context";

export const useAppContext = () => useContext(AppContext);

export function Providers({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient();

    return (
        <AppProvider>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </AppProvider>
    );
}
