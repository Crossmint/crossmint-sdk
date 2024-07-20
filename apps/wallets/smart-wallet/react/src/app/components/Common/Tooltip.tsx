import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { forwardRef } from "react";

import { classNames } from "../../utils/uiUtils";

const Tooltip = TooltipPrimitive.Root;
const TooltipPortal = TooltipPrimitive.Portal;

const TooltipContent = forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
    <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={classNames(
            "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-50 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 bg-custom-text-primary text-white",
            className
        )}
        {...props}
    >
        {children}
        <TooltipPrimitive.Arrow className="fill-custom-text-primary" />
    </TooltipPrimitive.Content>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const TooltipTrigger = forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ children, ...props }, ref) => (
    <TooltipPrimitive.Trigger ref={ref} {...props} asChild>
        <button className="cursor-auto">{children}</button>
    </TooltipPrimitive.Trigger>
));
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const TooltipProvider = (props: any) => {
    return <TooltipPrimitive.Provider delayDuration={100} {...props} />;
};
TooltipProvider.displayName = TooltipPrimitive.Provider.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipPortal };
