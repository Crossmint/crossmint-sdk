"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme-context";
import { themeList } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

export function Navbar() {
    const pathname = usePathname();
    const { theme, setThemeId } = useTheme();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <nav className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
                <div className="flex items-center gap-6">
                    <span className="font-semibold text-base">Smart Wallet Controls</span>
                    <div className="flex gap-1">
                        <Link
                            href="/admin"
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                pathname === "/admin"
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-secondary"
                            )}
                        >
                            Admin ({theme.adminRole})
                        </Link>
                        <Link
                            href="/employee"
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                pathname === "/employee"
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-secondary"
                            )}
                        >
                            {theme.userRole}
                        </Link>
                    </div>
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-secondary transition-colors"
                    >
                        {theme.label}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {dropdownOpen && (
                        <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg border shadow-lg z-50">
                            {themeList.map((t) => (
                                <button
                                    key={t.id}
                                    disabled={!t.enabled}
                                    onClick={() => {
                                        if (t.enabled) {
                                            setThemeId(t.id);
                                            setDropdownOpen(false);
                                        }
                                    }}
                                    className={cn(
                                        "w-full text-left px-4 py-3 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors",
                                        t.enabled
                                            ? "hover:bg-secondary cursor-pointer"
                                            : "opacity-50 cursor-not-allowed",
                                        t.id === theme.id && t.enabled && "bg-accent/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{t.label}</span>
                                        {!t.enabled && (
                                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                                Coming Soon
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
