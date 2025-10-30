import { useState, type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { theme } from "../../styles/theme";

interface BaseConfirmationProps {
    contactInfo: string;
    contactType: "email" | "phone";
    icon: ReactNode;
    onConfirm: () => Promise<void>;
    onCancel?: () => void;
    appearance?: UIConfig;
}

export function BaseConfirmation({
    contactInfo,
    contactType,
    icon,
    onConfirm,
    onCancel,
    appearance,
}: BaseConfirmationProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await onConfirm();
        } catch (error) {
            console.error(`Failed to send ${contactType} code`, error);
            setError(`Failed to send ${contactType === "email" ? "email" : "SMS"}. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    const dynamicStyles = StyleSheet.create({
        container: {
            width: "100%",
        },
        title: {
            fontSize: 24,
            fontWeight: "600",
            color: appearance?.colors?.textPrimary || theme["cm-text-primary"],
            textAlign: "center",
            marginBottom: 8,
        },
        description: {
            fontSize: 16,
            color: appearance?.colors?.textSecondary || theme["cm-text-secondary"],
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 22,
        },
        contactContainer: {
            borderWidth: 1,
            borderColor: appearance?.colors?.border || theme["cm-border"],
            borderRadius: appearance?.borderRadius || 12,
            padding: 16,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
        },
        contactText: {
            fontSize: 16,
            color: appearance?.colors?.textPrimary || theme["cm-text-primary"],
            marginLeft: 12,
            flex: 1,
        },
        errorText: {
            fontSize: 14,
            color: appearance?.colors?.danger || theme["cm-danger"],
            textAlign: "center",
            marginBottom: 16,
        },
        buttonContainer: {
            flexDirection: "row",
            gap: 12,
        },
        button: {
            flex: 1,
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 52,
        },
        primaryButton: {
            backgroundColor: appearance?.colors?.accent || theme["cm-accent"],
        },
        secondaryButton: {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: appearance?.colors?.border || theme["cm-border"],
        },
        disabledButton: {
            opacity: 0.6,
        },
        buttonText: {
            fontSize: 16,
            fontWeight: "500",
            color: appearance?.colors?.background || theme["cm-background-primary"],
        },
        secondaryButtonText: {
            color: appearance?.colors?.textPrimary || theme["cm-text-primary"],
        },
    });

    return (
        <View style={dynamicStyles.container}>
            <Text style={dynamicStyles.title}>Confirm it's you</Text>
            <Text style={dynamicStyles.description}>
                You're using this wallet for the first time on this device. Click 'Send code' to get a one-time
                verification code{contactType === "phone" ? " via SMS" : ""}.
            </Text>

            <View style={dynamicStyles.contactContainer}>
                {icon}
                <Text style={dynamicStyles.contactText}>{contactInfo}</Text>
            </View>

            {error && <Text style={dynamicStyles.errorText}>{error}</Text>}

            <View style={dynamicStyles.buttonContainer}>
                <TouchableOpacity
                    style={[dynamicStyles.button, dynamicStyles.secondaryButton]}
                    onPress={onCancel}
                    disabled={isLoading}
                >
                    <Text style={[dynamicStyles.buttonText, dynamicStyles.secondaryButtonText]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        dynamicStyles.button,
                        dynamicStyles.primaryButton,
                        isLoading && dynamicStyles.disabledButton,
                    ]}
                    onPress={handleConfirm}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={appearance?.colors?.background || theme["cm-background-primary"]} />
                    ) : (
                        <Text style={dynamicStyles.buttonText}>Send code</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
