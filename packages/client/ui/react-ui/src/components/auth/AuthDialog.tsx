import { PoweredByCrossmint } from "../common/PoweredByCrossmint";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../common/Dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { EmailAuthFlow } from "./methods/email/EmailAuthFlow";
import { GoogleSignIn } from "./methods/google/GoogleSignIn";
import { Divider } from "../common/Divider";
import { FarcasterSignIn } from "./methods/farcaster/FarcasterSignIn";
import { useAuthDialog } from "@/providers/auth/AuthDialogProvider";
import { FarcasterProvider } from "@/providers/auth/FarcasterProvider";

export default function AuthDialog() {
    const { step, appearance, baseUrl, setDialogOpen } = useAuthDialog();

    return (
        <Dialog open onOpenChange={setDialogOpen}>
            <DialogContent
                onInteractOutside={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="py-12 px-10"
                style={{ borderRadius: appearance?.borderRadius }}
            >
                <VisuallyHidden asChild>
                    <DialogTitle>Crossmint Auth</DialogTitle>
                </VisuallyHidden>
                <VisuallyHidden>
                    <DialogDescription>Sign in via Crossmint</DialogDescription>
                </VisuallyHidden>

                {step === "initial" ? (
                    <div>
                        <h1
                            className="text-2xl font-semibold text-custom-text-primary"
                            style={{ color: appearance?.colors?.textPrimary }}
                        >
                            Sign In
                        </h1>
                        <p
                            className="text-base font-normal mb-5 text-[#67797F]"
                            style={{ color: appearance?.colors?.textSecondary }}
                        >
                            Sign in using one of the options below
                        </p>
                    </div>
                ) : null}

                <EmailAuthFlow />

                <Divider appearance={appearance} text="OR" />

                <GoogleSignIn />

                <FarcasterProvider baseUrl={baseUrl}>
                    <FarcasterSignIn />
                </FarcasterProvider>

                {step === "initial" || step === "otp" ? (
                    <PoweredByCrossmint
                        className="justify-center"
                        color={appearance?.colors?.textSecondary ?? "#A4AFB2"}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
