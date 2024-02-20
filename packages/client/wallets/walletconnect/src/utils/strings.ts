export function pluralize(singular: string, plural: string, count: number) {
    return count === 1 ? singular : plural;
}
