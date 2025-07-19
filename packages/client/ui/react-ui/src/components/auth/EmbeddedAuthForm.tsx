import { tw } from "@/twind-instance";
import { AuthForm } from "./AuthForm";

export function EmbeddedAuthForm() {
    return <AuthForm className={tw("w-full")} />;
}
