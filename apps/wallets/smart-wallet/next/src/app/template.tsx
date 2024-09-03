"use client";

import { Header } from "@/components/header";
import { Toaster } from "@/components/toaster";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <Toaster />
            {children}
        </>
    );
}
