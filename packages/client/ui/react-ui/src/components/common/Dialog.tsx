"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { classNames } from "@/utils/classNames";
import { tw } from "@/twind-instance";

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
            <div className={tw("fixed inset-0 z-40 bg-black/60 backdrop-blur-sm overflow-x-hidden")} />
            <DialogPrimitive.Content
                ref={ref}
                className={classNames(
                    "fixed z-50 p-6 pb-4 bg-cm-background-primary border border-cm-border shadow-xl transition-none",
                    // Mobile viewport styles (bottom sheet) - updated with margins
                    "inset-x-[9px] bottom-2 w-[calc(100%-18px)] border-t rounded-t-[36px] rounded-b-[50px]",
                    "max-[479px]:data-[state=closed]:animate-slide-out-to-bottom max-[479px]:data-[state=open]:animate-slide-in-from-bottom",
                    // Desktop viewport styles (centered modal)
                    "min-[480px]:inset-auto min-[480px]:left-[50%] min-[480px]:top-[50%]",
                    "min-[480px]:[transform:translate(-50%,-50%)]",
                    "min-[480px]:max-w-[448px] min-[480px]:rounded-3xl !min-[480px]:p-10 !min-[480px]:pb-8",
                    "min-[480px]:data-[state=closed]:animate-fade-out min-[480px]:data-[state=open]:animate-fade-in",
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
                            "right-5 top-5 !min-[480px]:right-7 !min-[480px]:top-7"
                        )}
                        style={{ color: closeButtonColor ?? "#67797F" }}
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
                            className={tw("h-7 w-7")}
                        >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                        <span className={tw("sr-only")}>Close</span>
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
