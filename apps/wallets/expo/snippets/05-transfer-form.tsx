import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Linking } from "react-native";
import { useWallet } from "@crossmint/client-sdk-react-native-ui";

const TOKENS = ["usdxm", "usdc"];

export function TransferForm() {
    const { wallet } = useWallet();
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [tokenIdx, setTokenIdx] = useState(0);
    const [txLink, setTxLink] = useState("");

    const token = TOKENS[tokenIdx];

    const handleTransfer = async () => {
        if (!wallet || !recipient || !amount) return;
        const { explorerLink } = await wallet.send(recipient, token, amount);
        setTxLink(explorerLink);
        setRecipient("");
        setAmount("");
    };

    return (
        <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase" }}>Transfer Funds</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {TOKENS.map((t, i) => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setTokenIdx(i)}
                        style={{
                            padding: 8,
                            borderRadius: 8,
                            flex: 1,
                            alignItems: "center",
                            backgroundColor: i === tokenIdx ? "#13b601" : "#fff",
                            borderWidth: 1,
                            borderColor: i === tokenIdx ? "#13b601" : "#E5E7EB",
                        }}
                    >
                        <Text style={{ color: i === tokenIdx ? "#fff" : "#1A1A1A", fontWeight: "500" }}>
                            {t.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput
                style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 8,
                    backgroundColor: "#fff",
                }}
                placeholder="Recipient address"
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
            />
            <TextInput
                style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 8,
                    backgroundColor: "#fff",
                }}
                placeholder="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />
            <TouchableOpacity
                style={{
                    backgroundColor: "#13b601",
                    padding: 14,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 12,
                    opacity: !recipient || !amount ? 0.5 : 1,
                }}
                onPress={handleTransfer}
                disabled={!recipient || !amount}
            >
                <Text style={{ color: "#fff", fontWeight: "500" }}>Transfer {token.toUpperCase()}</Text>
            </TouchableOpacity>
            {txLink ? (
                <TouchableOpacity onPress={() => Linking.openURL(txLink)} style={{ marginTop: 8 }}>
                    <Text style={{ color: "#13b601" }}>View transaction</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
