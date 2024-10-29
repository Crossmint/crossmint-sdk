import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthForm } from "./AuthForm";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../common/Dialog";
import { useEffect } from "react";

export default function AuthFormDialog({ open }: { open: boolean }) {
    const { appearance, setDialogOpen } = useAuthForm();

    // todo come up with a better solution for this!
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
    }, [open]);

    return (
        <Dialog modal={false} open={open} onOpenChange={setDialogOpen}>
            <DialogContent
                onInteractOutside={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => e.preventDefault()}
                closeButtonColor={appearance?.colors?.textPrimary}
                closeButtonRingColor={appearance?.colors?.accent}
                className="cm-responsive-border-radius-auth-dialog"
                style={{
                    borderRadius: appearance?.borderRadius,
                    backgroundColor: appearance?.colors?.background,
                }}
            >
                <VisuallyHidden asChild>
                    <DialogTitle>Crossmint Auth</DialogTitle>
                </VisuallyHidden>
                <VisuallyHidden asChild>
                    <DialogDescription>Sign in via Crossmint</DialogDescription>
                </VisuallyHidden>

                <AuthForm className="max-w-[448px]" />
            </DialogContent>
        </Dialog>
    );
}
