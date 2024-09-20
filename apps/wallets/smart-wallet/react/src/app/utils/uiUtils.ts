import type { FormikErrors, FormikTouched } from "formik";
import type { DivProps } from "react-html-props";

export function classNames(...classes: (boolean | string | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

export const isClientSide = typeof window !== "undefined";

// TODO move to a more appropriate class
// TODO include the wallet address in the message
export function payWithCryptoSignatureTemplate(uid: string) {
    return `Sign this message so Crossmint can tell which wallet made this purchase. Purchase ID:\n\n${uid}`;
}

export function removeClassesFromElementThatStartWith(str: string, element: Element) {
    if (element) {
        const prefix = "theme";
        const classes = element.className.split(" ").filter((c: string) => !c.startsWith(prefix));
        element.className = classes.join(" ").trim();
    } else {
        console.error("removeClassesFromElementThatStartWith: element param does not exist");
    }
}

export type CrossmintElementProps<T = DivProps> = T;

export function hasNullishElements(params: any[]) {
    return params.some((p) => p == null);
}
export function getFieldErrorProps<T>(key: keyof T, errors: FormikErrors<T>, touched: FormikTouched<T>) {
    if (touched[key] && errors[key]) {
        return {
            error: true,
            errorMessage: errors[key],
        };
    }

    return {
        error: false,
    };
}
export const textOverFlowEllipsis = "overflow-ellipsis overflow-hidden whitespace-nowrap";
