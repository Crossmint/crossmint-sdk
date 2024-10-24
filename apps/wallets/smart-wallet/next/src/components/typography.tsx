import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils";

export const typographyVariants = cva("font-body transition-colors", {
    variants: {
        variant: {
            h1: "font-display text-4xl font-extrabold",
            h2: "font-display text-2xl font-extrabold leading-7",
            h3: "font-display text-xl font-extrabold leading-6",
            h4: "font-body text-lg font-semibold leading-6",
            h5: "font-body text-sm font-medium leading-6",
            h6: "font-body text-xs font-medium",
            tag: "font-body text-xs",
            body: "font-body text-base",
        },
    },
    defaultVariants: {
        variant: "body",
    },
});

export type TypographyProps = React.HTMLAttributes<HTMLElement> &
    VariantProps<typeof typographyVariants> & {
        children: React.ReactNode;
        tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "p";
    };

export function Typography({ variant, tag, className, children, ...props }: TypographyProps) {
    let Component: React.ElementType;

    if (tag) {
        Component = tag;
    } else {
        switch (variant) {
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
                Component = variant;
                break;
            case "tag":
                Component = "span";
                break;
            case "body":
            default:
                Component = "p";
        }
    }

    return (
        <Component className={cn(typographyVariants({ variant, className }))} {...props}>
            {children}
        </Component>
    );
}
