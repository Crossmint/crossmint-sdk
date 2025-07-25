"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { CSSTransition } from "react-transition-group";
import { theme, globalReset } from "@/styles";

interface DialogProps {
    open: boolean;
    setDialogOpen?: (open: boolean) => void;
    appearance?: UIConfig;
    style?: React.CSSProperties;
    children: React.ReactNode;
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
}

interface DialogTitleProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
}

interface DialogDescriptionProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
}

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 999;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    
    /* Transition classes */
    &.dialog-enter {
        opacity: 0;
    }
    &.dialog-enter-active {
        opacity: 1;
        transition: opacity 100ms ease;
    }
    &.dialog-exit {
        opacity: 1;
    }
    &.dialog-exit-active {
        opacity: 0;
        transition: opacity 200ms ease;
    }
`;

const DialogContainer = styled.dialog<{
    appearance?: UIConfig;
}>`
    ${globalReset}
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    
    /* Modal styling */
    position: relative;
    background-color: ${(props) => props.appearance?.colors?.background || theme["cm-background-primary"]};
    border-radius: ${(props) => props.appearance?.borderRadius || "16px"};
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 100%;
    max-height: 90vh;
    padding: 32px;
    overflow-y: auto;
    
    /* Focus management */
    &:focus {
        outline: none;
    }

    /* Desktop styles and animations */
    @media (min-width: 480px) {
        max-width: 448px;
        border-radius: ${(props) => props.appearance?.borderRadius || "24px"};
        padding: 40px 40px 30px;
        
        /* Desktop transition classes */
        .dialog-enter & {
            transform: scale(0.95);
            opacity: 0;
        }
        .dialog-enter-active & {
            transform: scale(1);
            opacity: 1;
            transition: transform 200ms ease, opacity 100ms ease;
        }
        .dialog-exit & {
            transform: scale(1);
            opacity: 1;
        }
        .dialog-exit-active & {
            transform: scale(0.95);
            opacity: 0;
            transition: transform 200ms ease, opacity 200ms ease;
        }
    }

    /* Mobile styles and animations */
    @media (max-width: 479px) {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 8px;
        width: calc(100% - 16px);
        max-height: calc(100vh - 18px);
        border-radius: ${(props) => props.appearance?.borderRadius || "36px 36px 50px 50px"};
        padding: 40px 30px;
        margin: 0 auto;
        
        /* Mobile transition classes */
        .dialog-enter & {
            transform: translateY(100%);
        }
        .dialog-enter-active & {
            transform: translateY(0);
            transition: transform 200ms ease;
        }
        .dialog-exit & {
            transform: translateY(0);
        }
        .dialog-exit-active & {
            transform: translateY(100%);
            transition: transform 200ms ease;
        }
    }
`;

const CloseButton = styled.button<{
    appearance?: UIConfig;
}>`
    ${globalReset}
    
    /* Close button styling */
    position: absolute;
    top: 28px;
    right: 28px;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    z-index: 1000;
    background-color: transparent;
    color: ${(props) => props.appearance?.colors?.textPrimary ?? theme["cm-text-secondary"]};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    
    &:hover {
        background-color: ${(props) => props?.appearance?.colors?.backgroundSecondary || theme["cm-hover"]};
        color: ${(props) => props.appearance?.colors?.textPrimary ?? theme["cm-text-secondary"]};
    }
    
    &:focus {
        outline: none;
        background-color:  ${(props) => props?.appearance?.colors?.backgroundSecondary || theme["cm-hover"]};
        box-shadow: 0 0 0 2px ${(props) => props.appearance?.colors?.accent || theme["cm-accent"]};
    }
    
    svg {
        width: 28px;
        height: 28px;
    }
`;

const TitleStyled = styled.h2<{ appearance?: UIConfig }>`
    ${globalReset}
    
    /* Title styling */
    display: block;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.3;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    margin: 0 0 2px 0;
`;

const DescriptionStyled = styled.p<{ appearance?: UIConfig }>`
    ${globalReset}
    
    /* Description styling */
    display: block;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-secondary"]};
    margin: 0 0 12px 0;
`;

const DialogContent = styled.div`
    /* Content wrapper */
    display: flex;
    flex-direction: column;
`;

// Components
const Dialog: React.FC<DialogProps> = ({
    open,
    setDialogOpen,
    appearance,
    style,
    children,
    closeOnOverlayClick = false,
    showCloseButton = true,
}) => {
    const [mounted, setMounted] = React.useState(false);
    const nodeRef = React.useRef(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                setDialogOpen?.(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, setDialogOpen]);

    if (!mounted) {
        return null;
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setDialogOpen?.(false);
        }
    };

    return createPortal(
        <CSSTransition nodeRef={nodeRef} in={open} timeout={200} classNames="dialog" unmountOnExit mountOnEnter>
            <Overlay ref={nodeRef} onClick={closeOnOverlayClick ? handleOverlayClick : undefined}>
                <DialogContainer appearance={appearance} style={{ ...style }}>
                    {showCloseButton && (
                        <CloseButton onClick={() => setDialogOpen?.(false)} appearance={appearance}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </CloseButton>
                    )}
                    <DialogContent>{children}</DialogContent>
                </DialogContainer>
            </Overlay>
        </CSSTransition>,
        document.body
    );
};

const DialogTitle: React.FC<DialogTitleProps & { appearance?: UIConfig }> = ({ children, style, appearance }) => (
    <TitleStyled style={style} appearance={appearance}>
        {children}
    </TitleStyled>
);

const DialogDescription: React.FC<DialogDescriptionProps & { appearance?: UIConfig }> = ({
    children,
    style,
    appearance,
}) => (
    <DescriptionStyled style={style} appearance={appearance}>
        {children}
    </DescriptionStyled>
);

export { Dialog, DialogTitle, DialogDescription };
