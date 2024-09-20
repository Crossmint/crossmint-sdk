import type { HTMLAttributeAnchorTarget } from "react";

export function isEmpty(str: string | undefined | null): str is undefined | null {
    return !str || str.length === 0 || str.trim().length === 0;
}

export function getTarget(href?: string, target?: HTMLAttributeAnchorTarget) {
    if (!isEmpty(target)) {
        return target;
    }

    if (href?.startsWith("http")) {
        return "_blank";
    }

    return undefined;
}
