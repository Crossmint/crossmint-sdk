import { useState, type ReactNode } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { theme } from "../../styles/theme";

interface BaseCodeInputProps {
    contactInfo: string;
    contactType: "email" | "phone";
    icon: ReactNode;
    title: string;
    description: string | ReactNode;
    helpText: string;
    onSubmitOTP: (token: string) => Promise<void>;
    onResendCode?: () => Promise<void>;
    appearance?: UIConfig;
    otpLength?: number;
    keyboardType?: "default" | "number-pad";
    autoComplete?: "one-time-code" | "sms-otp";
    textContentType?: "oneTimeCode";
}

export function BaseCodeInput({
    icon,
    title,
    description,
    helpText,
    onSubmitOTP,
    onResendCode,
    appearance,
    otpLength = 9,
    keyboardType = "default",
    autoComplete = "one-time-code",
    textContentType = "oneTimeCode",
}: BaseCodeInputProps) {
    const [otpCode, setOtpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    const handleSubmitOTP = async () => {
        if (otpCode.length === 0) {
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await onSubmitOTP(otpCode);
            setOtpCode("");
        } catch (error) {
            console.error("Failed to verify OTP", error);
            setError("Invalid code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0 || !onResendCode) {
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await onResendCode();
            setResendCooldown(60);
            const timer = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            console.error("Failed to resend OTP", error);
            setError("Failed to resend code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const dynamicStyles = StyleSheet.create({
        container: {
            width: "100%",
        },
        iconContainer: {
            alignItems: "center",
            marginBottom: 8,
        },
        title: {
            fontSize: 18,
            fontWeight: "600",
            color: appearance?.colors?.textPrimary || theme["cm-text-primary"],
            textAlign: "center",
            marginBottom: 8,
            marginTop: 16,
        },
        description: {
            fontSize: 14,
            color: appearance?.colors?.textSecondary || theme["cm-text-secondary"],
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 20,
        },
        otpInput: {
            borderWidth: 1,
            borderColor: error
                ? appearance?.colors?.danger || theme["cm-danger"]
                : appearance?.colors?.border || theme["cm-border"],
            borderRadius: appearance?.borderRadius || 12,
            backgroundColor: appearance?.colors?.inputBackground || theme["cm-muted-primary"],
            padding: 16,
            fontSize: 16,
            color: appearance?.colors?.textPrimary || theme["cm-text-primary"],
            marginBottom: 16,
            textAlign: "center",
        },
        errorText: {
            fontSize: 14,
            color: appearance?.colors?.danger || theme["cm-danger"],
            textAlign: "center",
            marginBottom: 16,
        },
        helpText: {
            fontSize: 12,
            color: appearance?.colors?.textSecondary || theme["cm-text-secondary"],
            textAlign: "center",
            marginBottom: 16,
            lineHeight: 16,
        },
        submitButton: {
            backgroundColor: appearance?.colors?.accent || theme["cm-accent"],
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: appearance?.borderRadius || 12,
            alignItems: "center",
            marginBottom: 16,
        },
        submitButtonDisabled: {
            opacity: 0.6,
        },
        submitButtonText: {
            fontSize: 16,
            fontWeight: "500",
            color: appearance?.colors?.background || theme["cm-background-primary"],
        },
        resendButton: {
            alignSelf: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
        },
        resendButtonText: {
            fontSize: 14,
            color: appearance?.colors?.accent || theme["cm-accent"],
            textAlign: "center",
        },
        resendButtonDisabled: {
            opacity: 0.6,
        },
    });

    return (
        <View style={dynamicStyles.container}>
            <View style={dynamicStyles.iconContainer}>{icon}</View>

            <Text style={dynamicStyles.title}>{title}</Text>
            <Text style={dynamicStyles.description}>{description}</Text>

            <TextInput
                style={dynamicStyles.otpInput}
                placeholder="Enter code"
                placeholderTextColor={appearance?.colors?.textSecondary || theme["cm-text-secondary"]}
                value={otpCode}
                onChangeText={(text) => {
                    setOtpCode(text);
                    setError(null);
                }}
                keyboardType={keyboardType}
                autoComplete={autoComplete}
                textContentType={textContentType}
                editable={!isLoading}
                maxLength={otpLength}
            />

            {error && <Text style={dynamicStyles.errorText}>{error}</Text>}

            <Text style={dynamicStyles.helpText}>{helpText}</Text>

            <TouchableOpacity
                style={[
                    dynamicStyles.submitButton,
                    (otpCode.length === 0 || isLoading) && dynamicStyles.submitButtonDisabled,
                ]}
                onPress={handleSubmitOTP}
                disabled={otpCode.length === 0 || isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color={appearance?.colors?.background || theme["cm-background-primary"]} />
                ) : (
                    <Text style={dynamicStyles.submitButtonText}>Submit</Text>
                )}
            </TouchableOpacity>

            {onResendCode && (
                <TouchableOpacity
                    style={[dynamicStyles.resendButton, resendCooldown > 0 && dynamicStyles.resendButtonDisabled]}
                    onPress={handleResendCode}
                    disabled={resendCooldown > 0 || isLoading}
                >
                    <Text style={dynamicStyles.resendButtonText}>
                        {resendCooldown > 0 ? `Re-send code in ${resendCooldown}s` : "Re-send code"}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
