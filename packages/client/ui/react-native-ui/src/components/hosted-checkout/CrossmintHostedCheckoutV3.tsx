import { TouchableOpacity, Text, StyleSheet } from "react-native";

export type CrossmintHostedCheckoutV3ReactNativeProps = {
    onPress?: () => void;
    style?: any;
};

// TODO: This is a placeholder for the actual implementation
export function CrossmintHostedCheckout(props: CrossmintHostedCheckoutV3ReactNativeProps) {
    const { onPress, style } = props;

    const handlePress = () => {
        // TODO: Implement hosted checkout window creation
        if (onPress) {
            onPress();
        }
    };

    return (
        <TouchableOpacity style={[styles.button, style]} onPress={handlePress}>
            <Text style={styles.text}>Buy with Crossmint</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: "#007AFF",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
