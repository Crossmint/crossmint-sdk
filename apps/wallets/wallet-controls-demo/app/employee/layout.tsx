"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        </>
    );
}
