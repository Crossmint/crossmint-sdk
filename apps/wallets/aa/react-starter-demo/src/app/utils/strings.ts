export function cutAndAddEllipsis(string: string, cutLength: number) {
    if (string.length <= cutLength) {
        return string;
    }
    return string.slice(0, cutLength) + "…";
}
