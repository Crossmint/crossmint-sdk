import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import type { UIConfig } from "@crossmint/common-sdk-base";

interface PhoneConfirmationProps {
    phone: string;
    onConfirm: (phone: string) => Promise<void>;
    onCancel?: () => void;
    appearance?: UIConfig;
}

export function PhoneConfirmation({ phone, onConfirm, onCancel, appearance }: PhoneConfirmationProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSendCode = async () => {
        setIsLoading(true);
        try {
            await onConfirm(phone);
        } catch (error) {
            console.error("Error sending authorization code:", error);
            setError("Failed to send code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const accentColor = appearance?.colors?.accent || "#4CAF50";
    const textColor = appearance?.colors?.textPrimary || "#000000";
    const borderColor = appearance?.colors?.border || "#E0E0E0";
    const backgroundColor = appearance?.colors?.background || "#FFFFFF";

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <Text style={[styles.title, { color: textColor }]}>Send authorization code to</Text>

            <View style={[styles.phoneContainer, { borderColor }]}>
                <View style={styles.phoneRow}>
                    <View style={styles.phoneIcon}>
                        <Text style={styles.phoneIconText}>📱</Text>
                    </View>
                    <Text style={[styles.phoneText, { color: textColor }]}>{phone}</Text>
                </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttonRow}>
                <TouchableOpacity onPress={onCancel} style={[styles.cancelButton, { borderColor }]}>
                    <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={isLoading}
                    style={[styles.sendButton, { backgroundColor: accentColor }, isLoading && styles.disabledButton]}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.sendButtonText}>Send code</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        maxWidth: 400,
        alignSelf: "center",
        borderRadius: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 16,
    },
    phoneContainer: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 32,
    },
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    phoneIcon: {
        marginRight: 12,
    },
    phoneIconText: {
        fontSize: 20,
    },
    phoneText: {
        fontSize: 16,
        flex: 1,
    },
    errorText: {
        color: "#f44336",
        fontSize: 14,
        marginBottom: 16,
        textAlign: "center",
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 25,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "500",
    },
    sendButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "500",
    },
    disabledButton: {
        opacity: 0.7,
    },
});
