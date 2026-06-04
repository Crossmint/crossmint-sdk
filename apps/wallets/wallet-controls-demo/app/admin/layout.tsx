"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </>
    );
}
