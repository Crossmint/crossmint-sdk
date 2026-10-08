import { AuthForm } from "./AuthForm";

/**
 * Renders the Crossmint auth form inline in your page instead of in a modal.
 * Displays the same login methods configured on `CrossmintAuthProvider`, which it must be rendered inside of.
 */
export function EmbeddedAuthForm() {
    return <AuthForm style={{ width: "100%" }} />;
}
