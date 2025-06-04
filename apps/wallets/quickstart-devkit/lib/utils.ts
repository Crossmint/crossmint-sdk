import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

export function shortenAddress(addr: string) {
    return addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";
}

export function shortenHash(hash: string) {
    return hash ? hash.slice(0, 8) + "..." + hash.slice(-6) : "";
}
