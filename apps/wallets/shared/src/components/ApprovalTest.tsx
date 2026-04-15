import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";

const inputStyle = {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#fff",
} as const;

export function ApprovalTest({ wallet, copyToClipboard }: { wallet: any; copyToClipboard?: (text: string) => void }) {
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [pendingTxId, setPendingTxId] = useState("");
    const [approveId, setApproveId] = useState("");
    const [result, setResult] = useState("");

    const prepareTx = async () => {
        if (!wallet || !recipient || !amount) return;
        const res = await wallet.send(recipient, "usdxm", amount, { prepareOnly: true });
        setPendingTxId(res.transactionId ?? JSON.stringify(res));
        setResult("Prepared: " + JSON.stringify(res));
    };

    const approveTx = async () => {
        if (!wallet || !approveId) return;
        const res = await wallet.approve({ transactionId: approveId });
        setResult("Approved: " + JSON.stringify(res));
    };

    const approveSig = async () => {
        if (!wallet || !approveId) return;
        const res = await wallet.approve({ signatureId: approveId });
        setResult("Approved sig: " + JSON.stringify(res));
    };

    return (
        <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase" }}>Approval Test</Text>
            <TextInput
                style={inputStyle}
                placeholder="Recipient"
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
            />
            <TextInput
                style={inputStyle}
                placeholder="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />
            <TouchableOpacity
                style={{
                    backgroundColor: "#fff",
                    padding: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    opacity: !recipient || !amount ? 0.5 : 1,
                }}
                onPress={prepareTx}
                disabled={!recipient || !amount}
            >
                <Text style={{ fontWeight: "500" }}>Prepare Transaction</Text>
            </TouchableOpacity>
            {pendingTxId ? (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: "#6B7280", flex: 1 }} numberOfLines={1}>
                        TX ID: {pendingTxId}
                    </Text>
                    <TouchableOpacity
                        onPress={() => copyToClipboard?.(pendingTxId)}
                        style={{
                            backgroundColor: "#E5E7EB",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                        }}
                    >
                        <Text style={{ fontSize: 11, color: "#374151" }}>Copy</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
            <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 }} />
            <TextInput
                style={{ ...inputStyle, marginTop: 0 }}
                placeholder="Transaction or Signature ID"
                value={approveId}
                onChangeText={setApproveId}
                autoCapitalize="none"
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: "#13b601",
                        padding: 10,
                        borderRadius: 8,
                        flex: 1,
                        alignItems: "center",
                        opacity: !approveId ? 0.5 : 1,
                    }}
                    onPress={approveTx}
                    disabled={!approveId}
                >
                    <Text style={{ color: "#fff", fontWeight: "500" }}>Approve TX</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        backgroundColor: "#fff",
                        padding: 10,
                        borderRadius: 8,
                        flex: 1,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        opacity: !approveId ? 0.5 : 1,
                    }}
                    onPress={approveSig}
                    disabled={!approveId}
                >
                    <Text style={{ fontWeight: "500" }}>Approve Sig</Text>
                </TouchableOpacity>
            </View>
            {result ? (
                <ScrollView
                    style={{ maxHeight: 100, marginTop: 8, backgroundColor: "#fff", padding: 8, borderRadius: 6 }}
                >
                    <Text style={{ fontSize: 11, fontFamily: "monospace" }}>{result}</Text>
                </ScrollView>
            ) : null}
        </View>
    );
}
