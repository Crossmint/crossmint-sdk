import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

const CHAINS = ["base-sepolia", "solana"] as const;
type SupportedChain = (typeof CHAINS)[number];

interface ChainSwitcherProps {
    wallet: any;
    onSwitchChain: (chain: SupportedChain) => Promise<void>;
}

export function ChainSwitcher({ wallet, onSwitchChain }: ChainSwitcherProps) {
    const [isSwitching, setIsSwitching] = useState(false);
    const activeChain = wallet?.chain ?? "base-sepolia";

    const switchChain = async (chain: SupportedChain) => {
        if (chain === activeChain || isSwitching) {
            return;
        }
        setIsSwitching(true);
        try {
            await onSwitchChain(chain);
        } finally {
            setIsSwitching(false);
        }
    };

    return (
        <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase", marginBottom: 8 }}>
                Chain
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
                {CHAINS.map((chain) => {
                    const isActive = chain === activeChain;
                    const isLoading = isSwitching && !isActive;
                    return (
                        <TouchableOpacity
                            key={chain}
                            testID={`chain-option-${chain}`}
                            onPress={() => switchChain(chain)}
                            disabled={isSwitching}
                            style={{
                                flex: 1,
                                padding: 10,
                                borderRadius: 8,
                                alignItems: "center",
                                backgroundColor: isActive ? "#13b601" : "#fff",
                                borderWidth: 1,
                                borderColor: isActive ? "#13b601" : "#E5E7EB",
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            <Text style={{ color: isActive ? "#fff" : "#1A1A1A", fontWeight: "500", fontSize: 13 }}>
                                {isLoading ? "..." : chain}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}
