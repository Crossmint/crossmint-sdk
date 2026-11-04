/**
 * Name of a project-scoped auth cookie, e.g. `crossmint-jwt-<projectId>`.
 *
 * The client SDK stores the session under these names so that several Crossmint projects can share a
 * domain without reading each other's tokens. The server SDK reads and writes the same names.
 */
export function getScopedCookieName(name: string, projectId: string): string {
    return `${name}-${projectId}`;
}
