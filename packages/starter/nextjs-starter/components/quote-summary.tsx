import { InitialQuotePayload } from "@crossmint/client-sdk-base";

export default function QuoteSummary({initialQuotePayload}:{initialQuotePayload:InitialQuotePayload}) {
    return (
        <div style={{
            fontFamily: "Courier New, monospace",
            padding: "20px",
            border: "1px solid #ccc",
        }}>
            <h3 style={{ textAlign: "center", textDecoration: "underline" }}>Summary</h3>

            {initialQuotePayload.lineItems.map((item, i) => (
                <div key={i} style={{
                    marginBottom: "10px",
                    ...(i === initialQuotePayload.lineItems.length - 1 ? {} : {borderBottom: "1px dashed #ccc", }),
                    paddingBottom: "10px",
                    display: "flex",
                    alignItems: "center",
                }}>
                    <div>
                        {item.metadata.imageUrl != null && (
                            <img
                                src={item.metadata.imageUrl}
                                alt={`${item.metadata.title} image`}
                                style={{ width: "50px", height: "50px", marginRight: "10px" }}
                            />
                        )}
                    </div>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        flexGrow: "1",
                        flexDirection: "column",
                    }}>
                        <span>{item.quantity}x {item.metadata.title}</span>
                        <div style={{ fontSize: "12px", color: "#666" }}>{item.metadata.collection}</div>
                        <div style={{ fontSize: "12px", color: "#888" }}>{item.metadata.description}</div>

                    </div>
                    <span>{item.price.amount} {item.price.currency.toUpperCase()}</span>
                </div>
            ))}

            <div style={{
                marginTop: "20px",
                borderTop: "2px solid #000",
                paddingTop: "10px",
                fontSize: "18px",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
            }}>
                <span>Subtotal</span>
                <span>{initialQuotePayload.totalPrice.amount} {initialQuotePayload.totalPrice.currency.toUpperCase()}</span>
            </div>
        </div>
    )
}
