import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthForm } from "./AuthForm";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../common/Dialog";

export default function AuthFormDialog({ open }: { open: boolean }) {
    const { appearance, setDialogOpen } = useAuthForm();

    return (
        <Dialog open={open} onOpenChange={setDialogOpen}>
            <DialogContent
                onInteractOutside={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="py-12 px-10 rounded-t-lg"
                style={{
                    borderTopLeftRadius: appearance?.borderRadius,
                    borderTopRightRadius: appearance?.borderRadius,
                }}
            >
                <VisuallyHidden asChild>
                    <DialogTitle>Crossmint Auth</DialogTitle>
                </VisuallyHidden>
                <VisuallyHidden asChild>
                    <DialogDescription>Sign in via Crossmint</DialogDescription>
                </VisuallyHidden>
                <AuthForm />
            </DialogContent>
        </Dialog>
    );
}
