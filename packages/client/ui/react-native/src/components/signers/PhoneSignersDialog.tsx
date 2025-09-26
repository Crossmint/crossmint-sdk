import { useState, type MutableRefObject } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    Modal,
} from "react-native";
import type { UIConfig } from "@crossmint/common-sdk-base";

interface PhoneSignersDialogProps {
    phone?: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    step: "initial" | "otp";
    onSubmitOTP: (token: string) => Promise<void>;
    onResendOTPCode: () => Promise<void>;
    onSubmitPhone: () => Promise<void>;
    rejectRef: MutableRefObject<((error: Error) => void) | undefined>;
    appearance?: UIConfig;
}

const { width: screenWidth } = Dimensions.get("window");

export function PhoneSignersDialog({
    phone,
    open,
    setOpen,
    step,
    onSubmitOTP,
    onResendOTPCode,
    onSubmitPhone,
    rejectRef,
    appearance,
}: PhoneSignersDialogProps) {
    const [otpCode, setOtpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Colors from appearance or defaults
    const colors = {
        background: appearance?.colors?.background || "#ffffff",
        textPrimary: appearance?.colors?.textPrimary || "#000000",
        textSecondary: appearance?.colors?.textSecondary || "#666666",
        accent: appearance?.colors?.accent || "#007AFF",
        border: appearance?.colors?.border || "#E0E0E0",
        danger: appearance?.colors?.danger || "#FF3B30",
        inputBackground: appearance?.colors?.inputBackground || "#F9F9F9",
    };

    const borderRadius = appearance?.borderRadius || "12px";

    function handleOnCancel() {
        if (open) {
            rejectRef.current?.(new Error("User cancelled"));
            setOpen(false);
            setOtpCode("");
            setError(null);
        }
    }

    const handleSendPhone = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await onSubmitPhone();
        } catch (error) {
            console.error("Failed to send phone OTP", error);
            setError("Failed to send SMS. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

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
        if (resendCooldown > 0) {
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await onResendOTPCode();
            // Start cooldown
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
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
        },
        modalContainer: {
            backgroundColor: colors.background,
            borderRadius: parseInt(borderRadius.replace("px", ""), 10),
            padding: 32,
            width: Math.min(screenWidth - 32, 400),
            maxHeight: "80%",
        },
        title: {
            fontSize: 24,
            fontWeight: "600",
            color: colors.textPrimary,
            textAlign: "center",
            marginBottom: 8,
        },
        description: {
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 22,
        },
        phoneContainer: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: parseInt(borderRadius.replace("px", ""), 10),
            padding: 16,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
        },
        phoneText: {
            fontSize: 16,
            color: colors.textPrimary,
            marginLeft: 12,
            flex: 1,
        },
        otpInput: {
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: parseInt(borderRadius.replace("px", ""), 10),
            backgroundColor: colors.inputBackground,
            padding: 16,
            fontSize: 16,
            color: colors.textPrimary,
            marginBottom: 16,
            textAlign: "center",
        },
        errorText: {
            fontSize: 14,
            color: colors.danger,
            textAlign: "center",
            marginBottom: 16,
        },
        helpText: {
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: 16,
            lineHeight: 16,
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
            backgroundColor: colors.accent,
        },
        secondaryButton: {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: colors.border,
        },
        disabledButton: {
            opacity: 0.6,
        },
        buttonText: {
            fontSize: 16,
            fontWeight: "500",
            color: "#ffffff",
        },
        secondaryButtonText: {
            color: colors.textPrimary,
        },
        resendButton: {
            alignSelf: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
        },
        resendButtonText: {
            fontSize: 14,
            color: colors.accent,
            textAlign: "center",
        },
        resendButtonDisabled: {
            opacity: 0.6,
        },
        otpContainer: {
            alignItems: "center",
            marginBottom: 24,
        },
        otpTitle: {
            fontSize: 18,
            fontWeight: "600",
            color: colors.textPrimary,
            textAlign: "center",
            marginBottom: 8,
            marginTop: 16,
        },
        otpDescription: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 20,
        },
        submitButton: {
            backgroundColor: colors.accent,
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: parseInt(borderRadius.replace("px", ""), 10),
            alignItems: "center",
            marginBottom: 16,
        },
        submitButtonDisabled: {
            opacity: 0.6,
        },
        submitButtonText: {
            fontSize: 16,
            fontWeight: "500",
            color: "#ffffff",
        },
    });

    return (
        <Modal
            visible={open}
            transparent={true}
            animationType="fade"
            onRequestClose={handleOnCancel}
            statusBarTranslucent={true}
        >
            <View style={dynamicStyles.modalOverlay}>
                <View style={dynamicStyles.modalContainer}>
                    {step === "initial" ? (
                        <>
                            <Text style={dynamicStyles.title}>Confirm it's you</Text>
                            <Text style={dynamicStyles.description}>
                                You're using this wallet for the first time on this device. Click 'Send code' to get a
                                one-time verification code via SMS.
                            </Text>

                            <View style={dynamicStyles.phoneContainer}>
                                <View
                                    style={{ width: 24, height: 24, backgroundColor: colors.accent, borderRadius: 12 }}
                                />
                                <Text style={dynamicStyles.phoneText}>{phone}</Text>
                            </View>

                            {error && <Text style={dynamicStyles.errorText}>{error}</Text>}

                            <View style={dynamicStyles.buttonContainer}>
                                <TouchableOpacity
                                    style={[dynamicStyles.button, dynamicStyles.secondaryButton]}
                                    onPress={handleOnCancel}
                                    disabled={isLoading}
                                >
                                    <Text style={[dynamicStyles.buttonText, dynamicStyles.secondaryButtonText]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        dynamicStyles.button,
                                        dynamicStyles.primaryButton,
                                        isLoading && dynamicStyles.disabledButton,
                                    ]}
                                    onPress={handleSendPhone}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#ffffff" />
                                    ) : (
                                        <Text style={dynamicStyles.buttonText}>Send code</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={dynamicStyles.otpContainer}>
                                {/* Phone icon placeholder */}
                                <View
                                    style={{
                                        width: 48,
                                        height: 48,
                                        backgroundColor: colors.accent,
                                        borderRadius: 24,
                                        marginBottom: 16,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Text style={{ color: "#ffffff", fontSize: 20 }}>📱</Text>
                                </View>
                            </View>

                            <Text style={dynamicStyles.otpTitle}>Check your phone</Text>
                            <Text style={dynamicStyles.otpDescription}>
                                A temporary login code has been sent via SMS to {phone}
                            </Text>

                            <TextInput
                                style={dynamicStyles.otpInput}
                                placeholder="Enter code"
                                placeholderTextColor={colors.textSecondary}
                                value={otpCode}
                                onChangeText={(text) => {
                                    setOtpCode(text);
                                    setError(null);
                                }}
                                keyboardType="number-pad"
                                autoComplete="sms-otp"
                                textContentType="oneTimeCode"
                                editable={!isLoading}
                                maxLength={10}
                            />

                            {error && <Text style={dynamicStyles.errorText}>{error}</Text>}

                            <Text style={dynamicStyles.helpText}>
                                Can't receive the SMS? Check your phone number.{"\n"}Some messages may take several
                                minutes to arrive.
                            </Text>

                            <TouchableOpacity
                                style={[
                                    dynamicStyles.submitButton,
                                    (otpCode.length === 0 || isLoading) && dynamicStyles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmitOTP}
                                disabled={otpCode.length === 0 || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={dynamicStyles.submitButtonText}>Submit</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    dynamicStyles.resendButton,
                                    resendCooldown > 0 && dynamicStyles.resendButtonDisabled,
                                ]}
                                onPress={handleResendCode}
                                disabled={resendCooldown > 0 || isLoading}
                            >
                                <Text style={dynamicStyles.resendButtonText}>
                                    {resendCooldown > 0 ? `Re-send code in ${resendCooldown}s` : "Re-send code"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}
