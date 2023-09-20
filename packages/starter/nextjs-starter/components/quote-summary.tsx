import { InitialQuotePayload } from "@crossmint/client-sdk-base";

export default function QuoteSummary({ initialQuotePayload }: { initialQuotePayload: InitialQuotePayload }) {
    return (
        <div style={{
            padding: "20px",
            border: "1px solid #ccc",
        }}>
            <h4 style={{ textAlign: "center", textDecoration: "underline" }}>Summary</h4>

            {initialQuotePayload.lineItems.map((item, i) => (
                <div key={i} style={{
                    marginBottom: "10px",
                    ...(i === initialQuotePayload.lineItems.length - 1 ? {} : { borderBottom: "1px dashed #ccc" }),
                    paddingBottom: "10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}>
                    <div style={{ display: "flex"}}>
                        <div>
                            {item.metadata.imageUrl != null && (
                                <img
                                    src={item.metadata.imageUrl}
                                    alt={`${item.metadata.title} image`}
                                    style={{ width: "30px", height: "43px", marginRight: "10px" }}
                                />
                            )}
                        </div>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",

                            flexDirection: "column",
                        }}>
                            <span>{item.quantity}x {item.metadata.title}</span>
                            <div style={{ fontSize: "10px", color: "#666" }}>{item.metadata.collection}</div>
                            <div style={{ fontSize: "10px", color: "#888" }}>{item.metadata.description}</div>

                        </div>
                    </div>

                    <div style={{
                        paddingTop: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        fontSize: "12px",
                        flexGrow:"1",
                        flexDirection: "column",
                        width:"100%"
                    }}>
                        <span>Price: {item.price.amount} {item.price.currency.toUpperCase()}</span>
                        {item.gasFee &&
                            <span>Gas fees: {item.gasFee?.amount} {item.gasFee?.currency.toUpperCase()}</span>}
                    </div>


                </div>
            ))}

            <div style={{
                marginTop: "20px",
                borderTop: "2px solid #000",
                paddingTop: "10px",
                fontSize: "16px",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
            }}>
                <span>Subtotal</span>
                <span>{initialQuotePayload.totalPrice.amount} {initialQuotePayload.totalPrice.currency.toUpperCase()}</span>
            </div>
        </div>
    );
}
