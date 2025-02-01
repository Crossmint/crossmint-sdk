import React from 'react';

interface LandingPageProps {
    setShowCheckout: (show: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setShowCheckout }) => (
    <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "2rem",
        textAlign: "center",
        position: "relative",
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
    }}>
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            maxWidth: "440px",
            width: "100%",
        }}>
            <img
                src="https://dd.dexscreener.com/ds-data/tokens/solana/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN.png?size=xl&key=f02e9e"
                alt="Memecoin"
                style={{
                    width: "140px",
                    height: "140px",
                    borderRadius: "20px",
                    display: "block",
                    transition: "all 0.2s ease-in-out",
                    filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02) translateY(-2px)";
                    e.currentTarget.style.filter = "drop-shadow(0 8px 16px rgba(255, 255, 255, 0.15))";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1) translateY(0)";
                    e.currentTarget.style.filter = "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))";
                }}
            />

            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                padding: "0.5rem",
            }}>
                <h1 style={{
                    fontSize: "2.75rem",
                    fontWeight: "600",
                    fontFamily: "'Inter', sans-serif",
                    background: "linear-gradient(135deg, #ecfdf5 0%, #ccfbf1 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "200% 200%",
                    animation: "gradient 8s ease infinite",
                    letterSpacing: "-0.01em",
                    lineHeight: "1.1",
                    margin: 0,
                    position: "relative",
                }}>
                    GET<span style={{ marginLeft: "5px" }}> $TRUMP</span>
                    <div style={{
                        content: '""',
                        position: "absolute",
                        inset: "-4px",
                        filter: "blur(8px)",
                        zIndex: -1,
                    }} />
                </h1>
                <p style={{
                    fontSize: "1.125rem",
                    fontFamily: "'Inter', sans-serif",
                    color: "#DCF7EC",
                    lineHeight: "1.6",
                    fontWeight: "500",
                    margin: 0,
                    maxWidth: "90%",
                    marginInline: "auto",
                    letterSpacing: "-0.01em",
                }}>
                    Join the Trump Community. This is History in the Making!
                </p>
            </div>

            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                width: "100%",
                padding: "1rem",
            }}>
                <button
                    onClick={() => setShowCheckout(true)}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #10b981 0%, #0d9488 100%)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = `
                            0 12px 24px rgba(0, 0, 0, 0.25),
                            0 4px 8px rgba(16, 185, 129, 0.2),
                            inset 0 0 0 1px rgba(255, 255, 255, 0.2)
                        `;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #059669 0%, #0f766e 100%)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = `
                            0 8px 16px rgba(0, 0, 0, 0.2),
                            0 2px 4px rgba(16, 185, 129, 0.15),
                            inset 0 0 0 1px rgba(255, 255, 255, 0.1)
                        `;
                    }}
                    style={{
                        background: "linear-gradient(135deg, #059669 0%, #0f766e 100%)",
                        color: "#ffffff",
                        padding: "1.25rem",
                        borderRadius: "16px",
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        cursor: "pointer",
                        transition: "all 0.2s ease-in-out",
                        boxShadow: `
                            0 8px 16px rgba(0, 0, 0, 0.2),
                            0 2px 4px rgba(16, 185, 129, 0.15),
                            inset 0 0 0 1px rgba(255, 255, 255, 0.1)
                        `,
                        backdropFilter: "blur(20px)",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
                        width: "100%",
                        position: "relative",
                        overflow: "hidden",
                        fontFamily: "'Clash Display', sans-serif",
                        letterSpacing: "0.01em",
                        textTransform: "uppercase",
                    }}
                >
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)",
                        transform: "translateX(-100%)",
                        animation: "shine 1.5s infinite",
                    }} />
                    Buy Now
                </button>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "0.875rem",
                    fontFamily: "'Inter', sans-serif",
                }}>
                    <span>Powered by</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <mask id="mask0_794_7000" className="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                            <mask id="path-1-inside-1_794_7000" fill="white">
                                <path fillRule="evenodd" clipRule="evenodd" d="M9.93305 2.1844C11.7533 0.10829 15.9222 0.568901 15.9222 0.568901C15.9222 0.568901 16.0057 4.96897 14.2683 6.27064C13.1587 7.63127 10.5073 8.00011 9.1514 8.1001C10.1475 8.17355 11.8426 8.39208 13.1121 9.04226C13.9798 9.48668 14.7297 10.2076 15.1404 11.0918C15.9743 12.887 15.9222 15.6313 15.9222 15.6313C15.9222 15.6313 11.7533 16.0919 9.93305 14.0158C8.80036 12.8878 8.44965 10.9282 8.34864 9.5668C8.24764 10.9282 7.89692 12.8878 6.76423 14.0158C4.94398 16.0919 0.775056 15.6313 0.775056 15.6313C0.775056 15.6313 0.72298 12.887 1.55684 11.0918C1.96755 10.2076 2.71747 9.48668 3.5852 9.04226C4.85413 8.39237 6.54831 8.17374 7.54455 8.1002C6.54829 8.02664 4.85418 7.80801 3.5853 7.15814C2.71756 6.71372 1.96765 5.99276 1.55694 5.10857C0.723074 3.31341 0.77515 0.569103 0.77515 0.569103C0.77515 0.569103 4.94407 0.108492 6.76431 2.1846C7.89682 3.31239 8.2476 5.27155 8.34868 6.6329C8.44973 5.27155 8.80049 3.31224 9.93305 2.1844Z" />
                            </mask>
                            <path fillRule="evenodd" clipRule="evenodd" d="M9.93305 2.1844C11.7533 0.10829 15.9222 0.568901 15.9222 0.568901C15.9222 0.568901 16.0057 4.96897 14.2683 6.27064C13.1587 7.63127 10.5073 8.00011 9.1514 8.1001C10.1475 8.17355 11.8426 8.39208 13.1121 9.04226C13.9798 9.48668 14.7297 10.2076 15.1404 11.0918C15.9743 12.887 15.9222 15.6313 15.9222 15.6313C15.9222 15.6313 11.7533 16.0919 9.93305 14.0158C8.80036 12.8878 8.44965 10.9282 8.34864 9.5668C8.24764 10.9282 7.89692 12.8878 6.76423 14.0158C4.94398 16.0919 0.775056 15.6313 0.775056 15.6313C0.775056 15.6313 0.72298 12.887 1.55684 11.0918C1.96755 10.2076 2.71747 9.48668 3.5852 9.04226C4.85413 8.39237 6.54831 8.17374 7.54455 8.1002C6.54829 8.02664 4.85418 7.80801 3.5853 7.15814C2.71756 6.71372 1.96765 5.99276 1.55694 5.10857C0.723074 3.31341 0.77515 0.569103 0.77515 0.569103C0.77515 0.569103 4.94407 0.108492 6.76431 2.1846C7.89682 3.31239 8.2476 5.27155 8.34868 6.6329C8.44973 5.27155 8.80049 3.31224 9.93305 2.1844Z" fill="white" />
                        </mask>
                        <g mask="url(#mask0_794_7000)">
                            <path fillRule="evenodd" clipRule="evenodd" d="M9.93528 2.18471C11.7555 0.108595 15.9244 0.569206 15.9244 0.569206C15.9244 0.569206 16.0079 4.96927 14.2706 6.27095C13.1619 7.63046 10.5139 7.99981 9.15694 8.10016C10.1535 8.17385 11.8462 8.39261 13.1143 9.04207C13.982 9.4865 14.7319 10.2074 15.1427 11.0916C15.9765 12.8868 15.9244 15.6311 15.9244 15.6311C15.9244 15.6311 11.7555 16.0917 9.93528 14.0156C8.79837 12.8834 8.44927 10.9134 8.34975 9.55144C8.25023 10.9134 7.90113 12.8834 6.76422 14.0156C4.94397 16.0917 0.775056 15.6311 0.775056 15.6311C0.775056 15.6311 0.72298 12.8868 1.55684 11.0916C1.96755 10.2074 2.71747 9.4865 3.5852 9.04207C4.85328 8.39261 6.54604 8.17385 7.54256 8.10016C6.54605 8.02647 4.85328 7.8077 3.5852 7.15824C2.71747 6.71382 1.96755 5.99287 1.55684 5.10868C0.72298 3.31351 0.775056 0.569206 0.775056 0.569206C0.775056 0.569206 4.94397 0.108595 6.76422 2.18471C7.90113 3.31688 8.25023 5.28692 8.34975 6.64887C8.44927 5.28692 8.79837 3.31688 9.93528 2.18471Z" fill="currentColor" />
                            <path d="M3.69043 12.6953C3.69043 12.6953 6.75864 9.28222 8.29495 8.30401C9.1246 9.78129 12.139 12.638 13.0052 12.7762C13.0052 12.7762 9.478 9.79445 8.56104 8.14912C10.0352 7.30769 12.8672 4.29295 13.0044 3.42521C13.0044 3.42521 10.0582 6.93929 8.41574 7.87685C7.50345 6.25536 4.8679 3.86566 3.77333 3.42365C3.77333 3.42365 7.14486 6.47956 8.1346 8.02836C6.51967 8.93948 4.13153 11.5942 3.69043 12.6953Z" fill="currentColor" stroke="currentColor" strokeWidth="0.180625" />
                        </g>
                    </svg>
                    <span>Crossmint</span>
                </div>
            </div>
        </div>
    </div>
); 