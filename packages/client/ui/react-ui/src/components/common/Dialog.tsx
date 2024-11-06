"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { classNames } from "@/utils/classNames";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    showCloseButton?: boolean;
    closeButtonColor?: string;
    closeButtonRingColor?: string;
}

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
    ({ className, children, showCloseButton = true, closeButtonColor, closeButtonRingColor, ...props }, ref) => (
        <DialogPortal>
            {/* Because we're using modal={false}, the regular overlay is not shown. We need to add our own overlay */}
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm overflow-x-hidden" />
            <DialogPrimitive.Content
                ref={ref}
                className={classNames(
                    "fixed z-50 p-6 pb-4 bg-cm-background-primary border border-cm-border shadow-xl transition-none",
                    // Small viewport styles (bottom sheet)
                    "inset-x-0 bottom-0 w-full border-t rounded-t-xl",
                    "data-[state=closed]:animate-slide-out-to-bottom data-[state=open]:animate-slide-in-from-bottom",
                    // Regular viewport styles (centered modal)
                    "min-[480px]:inset-auto !min-[480px]:p-10 !min-[480px]:pb-8 min-[480px]:left-[50%] min-[480px]:top-[50%] min-[480px]:translate-x-[-50%] min-[480px]:translate-y-[-52%]",
                    "min-[480px]:max-w-[448px] min-[480px]:rounded-xl",
                    "min-[480px]:data-[state=closed]:animate-fade-out min-[480px]:data-[state=closed]:animate-zoom-out-95",
                    "min-[480px]:data-[state=open]:animate-fade-in min-[480px]:data-[state=open]:animate-zoom-in-95",
                    // Duration for animations
                    "data-[state=closed]:duration-300 data-[state=open]:duration-500",
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        className={classNames(
                            "absolute rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100",
                            "focus:outline-none focus:ring-2 focus:ring-cm-accent focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-text-primary",
                            "right-4 top-4 !min-[480px]:right-6 !min-[480px]:top-6"
                        )}
                        style={{ color: closeButtonColor ?? "#00150D" }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6"
                        >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={classNames("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={classNames("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
        {...props}
    />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={classNames("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
    />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={classNames("text-sm text-muted-foreground", className)}
        {...props}
    />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
    Dialog,
    DialogPortal,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
};
