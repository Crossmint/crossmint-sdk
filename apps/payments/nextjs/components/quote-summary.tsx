import type { InitialQuotePayload } from "@crossmint/client-sdk-base";

export default function QuoteSummary({ initialQuotePayload }: { initialQuotePayload: InitialQuotePayload }) {
    return (
        <div
            style={{
                padding: "20px",
                border: "1px solid #ccc",
            }}
        >
            <h4 style={{ textAlign: "center", textDecoration: "underline" }}>Summary</h4>

            {initialQuotePayload.lineItems.map((item, i) => (
                <div
                    key={i}
                    style={{
                        marginBottom: "10px",
                        ...(i != initialQuotePayload.lineItems.length - 1 ? { borderBottom: "1px dashed #ccc" } : {}),
                        paddingBottom: "10px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <div style={{ display: "flex", width: "100%" }}>
                        <div>
                            {item.metadata.imageUrl != null && (
                                <img
                                    src={item.metadata.imageUrl}
                                    alt={`${item.metadata.title} image`}
                                    style={{ width: "30px", height: "43px", marginRight: "10px" }}
                                />
                            )}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                marginRight: "10px",
                                flexGrow: 1,
                            }}
                        >
                            <span>
                                {item.quantity}x {item.metadata.title}
                            </span>
                        </div>

                        <div
                            style={{
                                paddingTop: "10px",
                                display: "flex",
                                alignItems: "flex-end",
                                fontSize: "12px",
                                flexDirection: "column",
                            }}
                        >
                            <span>
                                Price: {item.price.amount} {item.price.currency.toUpperCase()}
                            </span>
                            {item.gasFee && (
                                <span>
                                    Gas: {item.gasFee?.amount} {item.gasFee?.currency.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>
                    <div
                        style={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "start",
                            flexDirection: "column",
                        }}
                    >
                        {item.metadata.collection && (
                            <div style={{ fontSize: "10px", color: "#666" }}>{item.metadata.collection}</div>
                        )}
                        {item.metadata.description && (
                            <div style={{ fontSize: "10px", color: "#888" }}>{item.metadata.description}</div>
                        )}
                    </div>
                </div>
            ))}

            <div
                style={{
                    marginTop: "20px",
                    borderTop: "2px solid #000",
                    paddingTop: "10px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                <span>Subtotal</span>
                <span>
                    {initialQuotePayload.totalPrice.amount} {initialQuotePayload.totalPrice.currency.toUpperCase()}
                </span>
            </div>
        </div>
    );
}
