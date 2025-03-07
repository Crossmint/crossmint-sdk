import { useCrossmintCheckout } from "@crossmint/client-sdk-react-ui";
import { useEffect, useState, useCallback } from "react";
import { MemecoinCheckoutWrapper } from "../../embed-v3/EmbeddedCheckoutV3Content";
import StatusMessage from "./StatusMessage";
import LandingPage from "./LandingPage";

interface MemecoinCheckoutContentProps {
    setShowCheckout: (show: boolean) => void;
    showCheckout: boolean;
}

export default function MemecoinCheckoutContent({ setShowCheckout, showCheckout }: MemecoinCheckoutContentProps) {
    const { order } = useCrossmintCheckout();
    const [price, setPrice] = useState("3");
    const [slippage, setSlippage] = useState("5");
    const [displaySlippage, setDisplaySlippage] = useState("5");
    const [showCompletedMessage, setShowCompletedMessage] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Get the estimated token quantity range from the order
    const estimatedTokenRange = (order as any)?.lineItems?.[0]?.quote?.quantityRange;
    const hasEstimatedRange = estimatedTokenRange?.lowerBound && estimatedTokenRange?.upperBound;

    useEffect(() => {
        console.log("memecoin order status:", order);
        if (order?.phase === "completed") {
            setShowCompletedMessage(true);
            const timer = setTimeout(() => {
                setShowCompletedMessage(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [order]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value) && parseFloat(value || "0") >= 0) {
            const numericValue = parseFloat(value || "0");
            if (numericValue <= 3) {
                setPrice(value);
            } else {
                setPrice("3");
            }
        }
    };

    const debouncedSetSlippage = useCallback(
        (value: string) => {
            const timeoutId = setTimeout(() => {
                setSlippage(value);
            }, 500); // Increased debounce delay to 500ms
            return () => clearTimeout(timeoutId);
        },
        []
    );

    const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDisplaySlippage(value);
    };

    const handleSlippageChangeEnd = () => {
        debouncedSetSlippage(displaySlippage);
    };

    const getStatusMessage = () => {
        if (!order) return null;

        switch (order.phase) {
            case "delivery":
                return "Delivering your $TRUMP...";
            case "completed":
                return showCompletedMessage ? "Purchase successful! 🎉" : null;
            default:
                return null;
        }
    };

    const statusMessage = getStatusMessage();

    const shouldShowLeftColumn = !order || (order.phase !== "delivery" && order.phase !== "completed");

    if (!showCheckout) {
        return <LandingPage setShowCheckout={setShowCheckout} />;
    }

    return (
        <>
            {statusMessage && <StatusMessage>{statusMessage}</StatusMessage>}
            <div style={{
                position: "relative",
                width: "100%",
                minHeight: "100%",
                display: "flex",
                flexDirection: "column",
            }}>
                <div style={{
                    display: "flex",
                    width: "100%",
                    minHeight: "100%",
                    flexDirection: isMobile ? "column" : "row",
                }}>
                    {/* Left Container */}
                    {shouldShowLeftColumn && (
                        <div style={{
                            width: "100%",
                            padding: "1.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1.5rem",
                            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)",
                            borderBottom: isMobile ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                            borderRight: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                        }}>
                            {/* Memecoin Image */}
                            <div style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                marginBottom: isMobile ? "0.5rem" : "0",
                            }}>
                                <img
                                    src="https://dd.dexscreener.com/ds-data/tokens/solana/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN.png?size=xl&key=f02e9e"
                                    alt="Memecoin"
                                    style={{
                                        width: "64px",
                                        height: "64px",
                                        borderRadius: "12px",
                                        display: "block",
                                        transition: "all 0.2s ease-in-out",
                                        filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))",
                                    }}
                                />
                            </div>

                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.25rem",
                            }}>
                                {/* Price Input */}
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                }}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "0.25rem",
                                    }}>
                                        <label style={{
                                            fontSize: "0.875rem",
                                            color: "rgba(255, 255, 255, 0.6)",
                                            fontWeight: "500",
                                        }}>
                                            Amount of $TRUMP to buy
                                        </label>
                                        <span style={{
                                            fontSize: "0.875rem",
                                            color: "rgba(255, 255, 255, 0.9)",
                                            fontWeight: "600",
                                        }}>
                                            ≈ ${price}
                                        </span>
                                    </div>
                                    <div style={{
                                        position: "relative",
                                    }}>
                                        <input
                                            type="text"
                                            value={price}
                                            onChange={handlePriceChange}
                                            style={{
                                                background: "rgba(255, 255, 255, 0.06)",
                                                border: "1px solid rgba(255, 255, 255, 0.12)",
                                                borderRadius: "4px",
                                                padding: isMobile ? "0.6rem" : "0.75rem",
                                                paddingLeft: isMobile ? "2rem" : "2.5rem",
                                                color: "#ffffff",
                                                fontSize: isMobile ? "0.9rem" : "1rem",
                                                width: "100%",
                                                outline: "none",
                                            }}
                                            placeholder="Enter amount"
                                        />
                                        <div style={{
                                            position: "absolute",
                                            left: "0.75rem",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            color: "rgba(255, 255, 255, 0.6)",
                                            fontSize: "1rem",
                                            pointerEvents: "none",
                                        }}>
                                            $
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: "0.75rem",
                                        color: "rgba(255, 255, 255, 0.4)",
                                        marginTop: "0.25rem",
                                    }}>
                                        Enter the amount in USD you want to spend (max $3)
                                    </div>
                                </div>

                                {/* Slippage Input */}
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                    marginTop: "0.5rem",
                                }}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}>
                                        <label style={{
                                            fontSize: "0.875rem",
                                            color: "rgba(255, 255, 255, 0.6)",
                                            fontWeight: "500",
                                        }}>
                                            Slippage Tolerance
                                        </label>
                                        <span style={{
                                            fontSize: "0.875rem",
                                            color: "rgba(255, 255, 255, 0.9)",
                                            fontWeight: "600",
                                        }}>
                                            {displaySlippage}%
                                        </span>
                                    </div>
                                    <div style={{
                                        position: "relative",
                                        height: "32px",
                                        display: "flex",
                                        alignItems: "center"
                                    }} className="range-slider">
                                        {/* Custom track background with gradient */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                height: "12px",
                                                width: "100%",
                                                borderRadius: "6px",
                                                background: `linear-gradient(to right, 
                                                    #059669 0%,
                                                    #0f766e ${(parseFloat(displaySlippage) / 20) * 100}%,
                                                    rgba(255, 255, 255, 0.06) ${(parseFloat(displaySlippage) / 20) * 100}%,
                                                    rgba(255, 255, 255, 0.06) 100%)`
                                            }}
                                        />
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="20"
                                            step="0.1"
                                            value={displaySlippage}
                                            onChange={handleSlippageChange}
                                            onMouseUp={handleSlippageChangeEnd}
                                            onTouchEnd={handleSlippageChangeEnd}
                                            style={{
                                                width: "100%",
                                                WebkitAppearance: "none",
                                                MozAppearance: "none",
                                                appearance: "none",
                                                height: "12px",
                                                margin: 0,
                                                padding: 0,
                                                background: "transparent",
                                                position: "relative",
                                                zIndex: 2,
                                                cursor: "pointer"
                                            }}
                                        />
                                        <style>
                                            {`
                                                input[type="range"]::-webkit-slider-thumb {
                                                    -webkit-appearance: none;
                                                    appearance: none;
                                                    width: 24px;
                                                    height: 24px;
                                                    border-radius: 50%;
                                                    background: #059669;
                                                    border: 2px solid rgba(255, 255, 255, 0.2);
                                                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                                                    cursor: pointer;
                                                    position: relative;
                                                    z-index: 10;
                                                }
                                                input[type="range"]::-moz-range-thumb {
                                                    width: 24px;
                                                    height: 24px;
                                                    border-radius: 50%;
                                                    background: #059669;
                                                    border: 2px solid rgba(255, 255, 255, 0.2);
                                                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                                                    cursor: pointer;
                                                    position: relative;
                                                    z-index: 10;
                                                }
                                            `}
                                        </style>
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginTop: "0.25rem",
                                    }}>
                                        <span style={{
                                            fontSize: "0.75rem",
                                            color: "rgba(255, 255, 255, 0.4)",
                                        }}>
                                            0.1%
                                        </span>
                                        <span style={{
                                            fontSize: "0.75rem",
                                            color: "rgba(255, 255, 255, 0.4)",
                                        }}>
                                            20%
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: "0.75rem",
                                        color: "rgba(255, 255, 255, 0.4)",
                                        marginTop: "0.25rem",
                                        lineHeight: "1.4",
                                    }}>
                                        Slippage tolerance is the maximum price difference you&apos;re willing to accept between the estimated and final price due to market fluctuations
                                    </div>
                                </div>
                            </div>

                            {/* Estimated Tokens Message */}
                            <div style={{
                                marginTop: "auto",
                                padding: "1rem",
                                background: "linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(15, 118, 110, 0.05) 100%)",
                                borderRadius: "8px",
                                border: "1px solid rgba(5, 150, 105, 0.2)",
                            }}>
                                <div style={{
                                    fontSize: "0.875rem",
                                    color: "rgba(255, 255, 255, 0.9)",
                                    fontWeight: "500",
                                    marginBottom: "0.25rem",
                                }}>
                                    You&apos;ll Receive (Estimated)
                                </div>
                                <div style={{
                                    fontSize: "1rem",
                                    color: "#059669",
                                    fontWeight: "600",
                                    marginBottom: "0.5rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                }}>
                                    {hasEstimatedRange ? (
                                        `${Number(estimatedTokenRange.lowerBound)} - ${Number(estimatedTokenRange.upperBound)} $TRUMP`
                                    ) : (
                                        <>
                                            <div
                                                style={{
                                                    width: "16px",
                                                    height: "16px",
                                                    border: "2px solid rgba(5, 150, 105, 0.3)",
                                                    borderTopColor: "#059669",
                                                    borderRadius: "50%",
                                                    animation: "spin 1s linear infinite",
                                                }}
                                            />
                                            <span>Calculating...</span>
                                            <style jsx>{`
                                                @keyframes spin {
                                                    to {
                                                        transform: rotate(360deg);
                                                    }
                                                }
                                            `}</style>
                                        </>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: "0.75rem",
                                    color: "rgba(255, 255, 255, 0.5)",
                                    lineHeight: "1.4",
                                }}>
                                    Final amount may vary slightly due to market fluctuations at the time of purchase
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Container - Checkout */}
                    <div style={{
                        width: "100%",
                        flex: isMobile ? "1" : "0 0 480px",
                        display: "flex",
                        flexDirection: "column",
                        height: isMobile ? "auto" : "100%",
                    }}>
                        <div style={{
                            padding: "1.5rem",
                            height: "auto",
                            minHeight: isMobile ? "600px" : "auto",
                        }}>
                            <MemecoinCheckoutWrapper
                                price={price}
                                slippage={(parseFloat(slippage) * 10).toString()}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 
