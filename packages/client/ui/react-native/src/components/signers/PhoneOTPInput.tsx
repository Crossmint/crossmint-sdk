import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { OTP_LENGTH } from "./consts";

interface PhoneOTPInputProps {
    phone: string;
    onSubmitOTP: (token: string) => Promise<void>;
    onResendCode?: () => Promise<void>;
    appearance?: UIConfig;
}

export function PhoneOTPInput({ phone, onSubmitOTP, onResendCode, appearance }: PhoneOTPInputProps) {
    const [token, setToken] = useState("");
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendCountdown, setResendCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef<TextInput[]>([]);
    const countdownInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        startCountdown();
        return () => {
            if (countdownInterval.current) {
                clearInterval(countdownInterval.current);
            }
        };
    }, []);

    useEffect(() => {
        if (token.length === OTP_LENGTH) {
            handleOnSubmitOTP();
        }
    }, [token]);

    const startCountdown = () => {
        setCanResend(false);
        setResendCountdown(60);
        countdownInterval.current = setInterval(() => {
            setResendCountdown((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    if (countdownInterval.current) {
                        clearInterval(countdownInterval.current);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleOnSubmitOTP = async () => {
        if (token.length !== OTP_LENGTH) return;

        setLoading(true);
        try {
            await onSubmitOTP(token);
            setHasError(false);
            setError(null);
        } catch (error) {
            console.error("Error confirming recovery key OTP", error);
            setError("Invalid code. Please try again.");
            setHasError(true);
            setToken("");
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!canResend || !onResendCode) return;

        try {
            await onResendCode();
            startCountdown();
            setError(null);
            setHasError(false);
        } catch (error) {
            console.error("Error resending code", error);
            setError("Failed to resend code. Please try again.");
        }
    };

    const handleChangeText = (text: string, index: number) => {
        const newToken = token.split("");
        newToken[index] = text;
        const updatedToken = newToken.join("").slice(0, OTP_LENGTH);

        setToken(updatedToken);
        setHasError(false);
        setError(null);

        if (text && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === "Backspace" && !token[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const accentColor = appearance?.colors?.accent ?? "#04AA6D";
    const dangerColor = appearance?.colors?.danger ?? "#f44336";
    const borderColor = appearance?.colors?.border ?? "#E5E7EB";
    const textPrimaryColor = appearance?.colors?.textPrimary ?? "#000000";
    const textSecondaryColor = appearance?.colors?.textSecondary ?? "#909ca3";
    const inputBackgroundColor = appearance?.colors?.inputBackground ?? "#FFFFFF";
    const backgroundColor = appearance?.colors?.background ?? "#FFFFFF";

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <View style={styles.iconContainer}>
                <Text style={styles.phoneIcon}>📱</Text>
            </View>

            <Text style={[styles.title, { color: textPrimaryColor }]}>Check your phone</Text>

            <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
                A temporary login code has been sent to {phone}
            </Text>

            <View style={styles.otpContainer}>
                {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                    <TextInput
                        key={index}
                        ref={(ref) => {
                            if (ref) {
                                inputRefs.current[index] = ref;
                            }
                        }}
                        style={[
                            styles.otpInput,
                            {
                                backgroundColor: inputBackgroundColor,
                                borderColor: hasError ? dangerColor : borderColor,
                                color: textPrimaryColor,
                            },
                            token[index] && { borderColor: accentColor },
                        ]}
                        value={token[index] || ""}
                        onChangeText={(text) => handleChangeText(text, index)}
                        onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                        keyboardType="numeric"
                        maxLength={1}
                        editable={!loading}
                        selectTextOnFocus
                        autoFocus={index === 0}
                    />
                ))}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.helpTextContainer}>
                <Text style={[styles.helpText, { color: textSecondaryColor }]}>
                    Didn't receive the SMS? Check your signal.{"\n"}
                    Some messages may take several minutes to arrive.
                </Text>
            </View>

            {onResendCode && (
                <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={!canResend}
                    style={[styles.resendButton, !canResend && styles.disabledButton]}
                >
                    <Text style={[styles.resendButtonText, { color: canResend ? accentColor : textSecondaryColor }]}>
                        {canResend ? "Re-send code" : `Re-send code in ${resendCountdown}s`}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const { width } = Dimensions.get("window");
const inputSize = Math.min((width - 120) / OTP_LENGTH, 40);

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        paddingHorizontal: 24,
    },
    iconContainer: {
        marginBottom: 16,
    },
    phoneIcon: {
        fontSize: 48,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        paddingHorizontal: 16,
        marginBottom: 32,
        lineHeight: 20,
    },
    otpContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 16,
    },
    otpInput: {
        width: inputSize,
        height: inputSize,
        borderWidth: 1,
        borderRadius: 8,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
    },
    errorText: {
        color: "#f44336",
        fontSize: 14,
        marginBottom: 16,
        textAlign: "center",
    },
    helpTextContainer: {
        marginBottom: 24,
    },
    helpText: {
        fontSize: 12,
        textAlign: "center",
        lineHeight: 16,
        paddingHorizontal: 16,
    },
    resendButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    resendButtonText: {
        fontSize: 14,
        fontWeight: "500",
        textAlign: "center",
    },
    disabledButton: {
        opacity: 0.6,
    },
});
