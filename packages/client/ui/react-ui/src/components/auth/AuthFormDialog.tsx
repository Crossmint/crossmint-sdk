import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthForm } from "./AuthForm";
import { Dialog } from "../common/Dialog";

export default function AuthFormDialog({ open }: { open: boolean }) {
    const { appearance, setDialogOpen } = useAuthForm();

    return (
        <Dialog open={open} setDialogOpen={setDialogOpen} appearance={appearance}>
            <AuthForm style={{ maxWidth: "448px", padding: "0px" }} />
        </Dialog>
    );
}
