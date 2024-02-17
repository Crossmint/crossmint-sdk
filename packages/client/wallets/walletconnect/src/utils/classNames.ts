export function classNames(...classes: (boolean | string | undefined | { [key: string]: boolean | undefined })[]) {
    return classes
        .map((c) => {
            if (typeof c === "object") {
                return Object.keys(c)
                    .filter((k) => c[k])
                    .join(" ");
            }
            return c || "";
        })
        .join(" ")
        .trim();
}
