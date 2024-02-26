export function urlToOrigin(url: string): string {
    const urlObject = new URL(url);
    return urlObject.origin;
}
