import { CrossmintEmbeddedCheckout, useCrossmintCheckout } from "@crossmint/client-sdk-react-ui";
import { useEffect } from "react";

const USE_CUSTOM_RENDERING = false;

export function EmbeddedCheckoutV3Content() {
    const { order } = useCrossmintCheckout();

    useEffect(() => {
        console.log("order in sdk", order);
    }, [order]);

    if (USE_CUSTOM_RENDERING) {
        switch (order?.phase) {
            case "completed":
                return <div>Custom completed screen</div>;
            case "delivery":
                return <div>Custom delivery screen</div>;
            default:
                return <CrossmintEmbeddedCheckoutWrapper />;
        }
    }

    return <CrossmintEmbeddedCheckoutWrapper />;
}

function CrossmintEmbeddedCheckoutWrapper() {
    return (
        <CrossmintEmbeddedCheckout
            recipient={{
                // email: "maxwell@paella.dev",
                walletAddress: "0x8b821dd648599B0D093F55B5BaAA48c709ec455A",
            }}
            lineItems={{
                collectionLocator: "crossmint:206b3146-f526-444e-bd9d-0607d581b0e9",
                callData: {
                    totalPrice: "0.001",
                    quantity: 1,
                },
            }}
            payment={{
                receiptEmail: "maxwell@paella.dev",
                crypto: {
                    enabled: false,
                },
                fiat: {
                    enabled: true,
                },
                defaultMethod: "fiat",
            }}
        // appearance={{
        //     variables: {
        //         colors: {
        //             backgroundPrimary: "black",
        //         },
        //     },
        // }}
        />
    );
}

interface MemecoinCheckoutWrapperProps {
    price: string;
    slippage: string;
}

export function MemecoinCheckoutWrapper({ price, slippage }: MemecoinCheckoutWrapperProps) {
    return (
        <CrossmintEmbeddedCheckout
            recipient={{
                walletAddress: "4y3HNUyoSdzTjFwpAYTdFPXqGYiMneJjnefWYiSgd52Z",
            }}
            lineItems={{
                "tokenLocator": "solana:6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",

                callData: {
                    totalPrice: price,
                    slippageBps: slippage
                }
            } as any}
            payment={{

                receiptEmail: "test@email.com",
                crypto: {
                    enabled: false,
                },
                fiat: {
                    allowedMethods: {
                        card: true, // Enable/disable credit cards
                        applePay: true, // Enable/disable Apple Pay
                        googlePay: true, // Enable/disable Google Pay
                    },
                    enabled: true,
                },
                defaultMethod: "fiat",
            }}
            appearance={{
                fonts: [
                    { cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" }
                ],
                variables: {
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSizeUnit: "4px",
                    spacingUnit: "0.3rem",
                    borderRadius: "4px",
                    colors: {
                        borderPrimary: "rgba(255, 255, 255, 0.12)",
                        backgroundPrimary: "rgba(255, 255, 255, 0.04)",
                        textPrimary: "rgba(255, 255, 255, 0.9)",
                        textSecondary: "rgba(255, 255, 255, 0.4)",
                        accent: "#059669",
                    },
                },
                rules: {
                    Input: {
                        borderRadius: "4px",
                        font: {
                            family: "Inter",
                            size: "14px",
                            weight: "400",
                        },
                        colors: {
                            text: "rgba(255, 255, 255, 0.9)",
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "rgba(255, 255, 255, 0.12)",
                            boxShadow: "none",
                            placeholder: "rgba(255, 255, 255, 0.4)",
                        },
                        hover: {
                            colors: {
                                border: "rgba(255, 255, 255, 0.2)",
                            },
                        },
                        focus: {
                            colors: {
                                border: "rgba(255, 255, 255, 0.25)",
                                boxShadow: "none",
                            },
                        },
                    },
                    Label: {
                        font: {
                            family: "Inter",
                            size: "13px",
                            weight: "500",
                        },
                        colors: {
                            text: "rgba(255, 255, 255, 0.5)",
                        },
                    },
                    Tab: {
                        borderRadius: "4px",
                        font: {
                            family: "Inter",
                            size: "13px",
                            weight: "500",
                        },
                        colors: {
                            text: "rgba(255, 255, 255, 0.5)",
                            background: "transparent",
                        },
                        selected: {
                            colors: {
                                text: "rgba(255, 255, 255, 0.9)",
                                background: "rgba(255, 255, 255, 0.08)",
                            },
                        },
                        hover: {
                            colors: {
                                background: "rgba(255, 255, 255, 0.04)",
                            },
                        },
                    },
                    PrimaryButton: {
                        borderRadius: "4px",
                        font: {
                            family: "Inter",
                            size: "15px",
                            weight: "600",
                        },
                        colors: {
                            text: "#FFFFFF",
                            background: "#059669",
                        },
                        hover: {
                            colors: {
                                text: "#FFFFFF",
                                background: "#10b981",
                            },
                        },
                        disabled: {
                            colors: {
                                text: "rgba(255, 255, 255, 0.4)",
                                background: "rgba(255, 255, 255, 0.04)",
                            },
                        },
                    },
                    // DestinationInput: {
                    //     display: "hidden"
                    // },
                },
            }}
        />
    );
}

