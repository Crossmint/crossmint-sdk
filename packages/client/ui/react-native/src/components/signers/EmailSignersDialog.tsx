import type { MutableRefObject } from "react";
import { View, Modal, StyleSheet, Dimensions, TouchableOpacity, Text } from "react-native";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { MailCheckIcon, MailIcon, X } from "lucide-react-native";
import { BaseConfirmation } from "./BaseConfirmation";
import { BaseCodeInput } from "./BaseCodeInput";
import { theme } from "../../styles/theme";

interface EmailSignersDialogProps {
    email?: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    step: "initial" | "otp";
    onSubmitOTP: (token: string) => Promise<void>;
    onResendOTPCode: () => Promise<void>;
    onSubmitEmail: () => Promise<void>;
    rejectRef: MutableRefObject<((error: Error) => void) | undefined>;
    appearance?: UIConfig;
}

const { width: screenWidth } = Dimensions.get("window");

export function EmailSignersDialog({
    email,
    open,
    setOpen,
    step,
    onSubmitOTP,
    onResendOTPCode,
    onSubmitEmail,
    rejectRef,
    appearance,
}: EmailSignersDialogProps) {
    function handleOnCancel() {
        if (open) {
            rejectRef.current?.(new Error());
            setOpen(false);
        }
    }

    const dynamicStyles = StyleSheet.create({
        centeredView: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
        },
        modalView: {
            backgroundColor: appearance?.colors?.background || theme["cm-background-primary"],
            borderRadius: appearance?.borderRadius || 12,
            padding: 32,
            alignItems: "center",
            width: Math.min(screenWidth - 32, 400),
            maxHeight: "80%",
            position: "relative",
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
        },
        closeButton: {
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: appearance?.colors?.inputBackground || theme["cm-muted-primary"],
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
        },
    });

    if (!open) {
        return null;
    }

    return (
        <Modal
            visible={open}
            transparent={true}
            animationType="fade"
            onRequestClose={handleOnCancel}
            statusBarTranslucent={true}
        >
            <View style={dynamicStyles.centeredView}>
                <View style={dynamicStyles.modalView}>
                    <TouchableOpacity
                        style={dynamicStyles.closeButton}
                        onPress={handleOnCancel}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={16} color={appearance?.colors?.textSecondary || theme["cm-text-secondary"]} />
                    </TouchableOpacity>

                    {step === "initial" ? (
                        <BaseConfirmation
                            contactInfo={email ?? ""}
                            contactType="email"
                            icon={
                                <MailIcon
                                    size={22}
                                    color={appearance?.colors?.textPrimary || theme["cm-text-primary"]}
                                />
                            }
                            onConfirm={onSubmitEmail}
                            onCancel={handleOnCancel}
                            appearance={appearance}
                        />
                    ) : (
                        <BaseCodeInput
                            contactInfo={email ?? ""}
                            contactType="email"
                            icon={
                                <View
                                    style={{
                                        backgroundColor: appearance?.colors?.accent || theme["cm-accent"],
                                        borderRadius: 999,
                                        padding: 12,
                                    }}
                                >
                                    <MailCheckIcon
                                        size={22}
                                        color={appearance?.colors?.background || theme["cm-background-primary"]}
                                    />
                                </View>
                            }
                            title="Check your email"
                            description={
                                <Text>
                                    A temporary login code has been sent to{" "}
                                    <Text style={{ fontWeight: "bold" }}>{email}</Text>
                                </Text>
                            }
                            helpText={`Can't find the email? Check spam folder.\nSome emails may take several minutes to arrive.`}
                            onSubmitOTP={onSubmitOTP}
                            onResendCode={onResendOTPCode}
                            appearance={appearance}
                            otpLength={9}
                            keyboardType="default"
                            autoComplete="one-time-code"
                            textContentType="oneTimeCode"
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}
