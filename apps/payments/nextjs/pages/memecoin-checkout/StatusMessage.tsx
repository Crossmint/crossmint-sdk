import React from 'react';

interface StatusMessageProps {
    children: React.ReactNode;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ children }) => (
    <div style={{
        position: "absolute",
        top: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "16px 32px",
        textAlign: "center",
        fontSize: "16px",
        color: "rgba(255, 255, 255, 0.9)",
        background: "rgba(20, 20, 20, 0.95)",
        borderRadius: "24px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.12)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backdropFilter: "blur(20px)",
        zIndex: 1000,
        maxWidth: "90%",
        width: "auto",
        whiteSpace: "nowrap",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        animation: "slideDown 0.3s ease-out",
    }}>
        <style>
            {`
                @keyframes slideDown {
                    from {
                        transform: translate(-50%, -20px);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
            `}
        </style>
        {children}
    </div>
); 