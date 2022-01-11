import React, { FC, useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCrossMintModal } from "./useCrossMintModal";

export interface CrossMintModalProps {
    className?: string;
    container?: string;
}

export const CrossMintModal: FC<CrossMintModalProps> = ({ className = "", container = "body" }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { setVisible } = useCrossMintModal();

    const [fadeIn, setFadeIn] = useState(false);
    const [portal, setPortal] = useState<Element | null>(null);

    const hideModal = useCallback(() => {
        setFadeIn(false);
        setTimeout(() => setVisible(false), 150);
    }, [setFadeIn, setVisible]);

    useLayoutEffect(() => {
        // Get original overflow
        const { overflow } = window.getComputedStyle(document.body);
        // Hack to enable fade in animation after mount
        setTimeout(() => setFadeIn(true), 0);
        // Prevent scrolling on mount
        document.body.style.overflow = "hidden";

        return () => {
            // Re-enable scrolling when component unmounts
            document.body.style.overflow = overflow;
        };
    }, [hideModal]);

    useLayoutEffect(() => setPortal(document.querySelector(container)), [setPortal, container]);

    return (
        portal &&
        createPortal(
            <div
                aria-modal="true"
                className={`client-sdk-modal ${fadeIn ? "client-sdk-modal-fade-in" : ""} ${className}`}
                ref={ref}
            >
                <div className="client-sdk-modal-container">
                    <span className="client-sdk-modal-loader" />
                </div>
                <div className="client-sdk-modal-overlay" />
            </div>,
            portal
        )
    );
};
