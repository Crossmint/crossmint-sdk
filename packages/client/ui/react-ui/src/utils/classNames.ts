import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { tw } from "@/twind-instance";

/**
 * Combines multiple class names into a single string.
 *
 * @param inputs - The class names to combine.
 * @returns The combined class names as a string.
 * applies internal twind instance to the class names
 */
export function classNames(...inputs: ClassValue[]) {
    const processedInputs = inputs
        .filter(Boolean)
        .map((input) => {
            if (typeof input === "string") {
                return tw(input);
            }
            const resolved = clsx(input);
            return resolved ? tw(resolved) : "";
        })
        .filter(Boolean);

    return twMerge(clsx(processedInputs));
}
