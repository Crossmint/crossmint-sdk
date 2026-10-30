import { Alert } from "react-native";
import type { CrossmintWalletBaseContext } from "@crossmint/client-sdk-react-native-ui";

// The descriptor shape expected by `wallet.addSigner` for passkeys
// (RegisterSignerPasskeyParams from @crossmint/wallets-sdk), derived from the
// provider context so it stays in sync with the SDK.
type PasskeySignerDescriptor = Awaited<ReturnType<CrossmintWalletBaseContext["createPasskeySigner"]>>;

function randomHex(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    // Polyfilled by react-native-get-random-values (see utils/polyfills.ts).
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * MOCK passkey creator for the playground app only. Only injected when
 * EXPO_PUBLIC_MOCK_PASSKEY=true (CI e2e test mode) — see snippets/07-permissions.tsx;
 * default builds keep the real provider path for local/manual testing.
 *
 * The React Native provider guards real passkey creation (`createPasskeySigner`
 * throws — there is no WebAuthn on native), but `wallet.addSigner` accepts a
 * passkey descriptor, and the register-signer API does not validate the WebAuthn
 * attestation. This mock lets Maestro e2e flows exercise the "add passkey signer"
 * path on CI, mirroring the Flutter sample's mock passkey dialog
 * (example/lib/wallets_v1_playground/views/dialogs/passkey_dialog.dart).
 *
 * Note: publicKey.x/y must be valid positive BigInt decimal or hex strings —
 * the API rejects bare hex without the 0x prefix with HTTP 400.
 */
export function createMockPasskeySigner(name: string): Promise<PasskeySignerDescriptor> {
    return new Promise((resolve, reject) => {
        Alert.alert(
            "Create Passkey (Mock)",
            "This playground simulates passkey creation with random credentials. No real WebAuthn ceremony takes place.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => reject(new Error("Passkey creation cancelled")),
                },
                {
                    text: "Simulate",
                    onPress: () =>
                        resolve({
                            type: "passkey",
                            id: `mock-credential-${randomHex(8)}`,
                            name,
                            publicKey: {
                                x: `0x${randomHex(32)}`,
                                y: `0x${randomHex(32)}`,
                            },
                        }),
                },
            ],
            // Treat dismissing the alert (tap outside / back button) as cancel.
            { cancelable: true, onDismiss: () => reject(new Error("Passkey creation cancelled")) }
        );
    });
}
