import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function shortenAddress(addr: string) {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

export function formatInterval(seconds: number | undefined): string {
    if (seconds == null) {
        return "One-time";
    }
    if (seconds === 86400) {
        return "Daily";
    }
    if (seconds === 604800) {
        return "Weekly";
    }
    return `${seconds}s`;
}
