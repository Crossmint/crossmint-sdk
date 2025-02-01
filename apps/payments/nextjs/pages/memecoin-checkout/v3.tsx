import { useState } from "react";
import { EmbeddedCheckoutV3ClientProviders } from "../../components/embed-v3/EmbeddedCheckoutV3ClientProviders";
import { MemecoinCheckoutContent } from "./MemecoinCheckoutContent";

export default function MemecoinCheckoutV3Page() {
    const [showCheckout, setShowCheckout] = useState(false);

    return (
        <>
            <style jsx global>{`
                @import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700,400&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
                
                html, body {
                    background: linear-gradient(135deg, #042f2e 0%, #022c22 100%) !important;
                    font-family: 'Inter', sans-serif;
                }
                
                @keyframes float {
                    0% { transform: translate(-25%, -25%); }
                    50% { transform: translate(-20%, -20%); }
                    100% { transform: translate(-25%, -25%); }
                }
                @keyframes floatBottom {
                    0% { transform: translate(25%, 25%); }
                    50% { transform: translate(20%, 20%); }
                    100% { transform: translate(25%, 25%); }
                }
                @keyframes shine {
                    0% { transform: translateX(-100%); }
                    50%, 100% { transform: translateX(100%); }
                }
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
            <div style={{
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #042f2e 0%, #022c22 100%)",
                padding: "1.5rem",
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{
                    position: "absolute",
                    width: "140%",
                    height: "140%",
                    background: "radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.01) 45%, rgba(255,255,255,0) 60%)",
                    top: "-20%",
                    left: "-20%",
                    animation: "float 8s ease-in-out infinite",
                    pointerEvents: "none",
                }} />
                <div style={{
                    position: "absolute",
                    width: "140%",
                    height: "140%",
                    background: "radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.015) 35%, rgba(255,255,255,0.005) 45%, rgba(255,255,255,0) 60%)",
                    bottom: "-20%",
                    right: "-20%",
                    animation: "floatBottom 8s ease-in-out infinite",
                    pointerEvents: "none",
                }} />
                <div style={{
                    width: "100%",
                    maxWidth: showCheckout ? "900px" : "520px",
                    height: showCheckout ? "820px" : "600px",
                    background: "rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "24px",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.12)",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}>
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "1px",
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent)",
                    }} />
                    <EmbeddedCheckoutV3ClientProviders>
                        <MemecoinCheckoutContent setShowCheckout={setShowCheckout} showCheckout={showCheckout} />
                    </EmbeddedCheckoutV3ClientProviders>
                </div>
            </div>
        </>
    );
}
