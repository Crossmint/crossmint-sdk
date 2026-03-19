import CryptoKit
import CrossmintDeviceSigner
import ExpoModulesCore
import Security

/// Expo native module that exposes device signer key storage to React Native.
///
/// On physical iOS devices the module delegates to ``SecureEnclaveKeyStorage`` so all
/// key material lives in the Secure Enclave. On simulators it always uses
/// ``KeychainKeyStorage`` (Secure Enclave is not available on simulators).
///
/// The module is registered as `"CrossmintDeviceSigner"` and consumed on the JS side by
/// `NativeDeviceSignerKeyStorage` from `@crossmint/expo-device-signer`.
public class DeviceSignerModule: Module {

    // MARK: - Module definition

    public func definition() -> ModuleDefinition {
        Name("CrossmintDeviceSigner")

        // Returns true — the module always has a storage backend available (hardware
        // on real devices, software fallback on simulators).
        AsyncFunction("isAvailable") { () -> Bool in
            true
        }

        // Generates a new P-256 key and persists it.
        AsyncFunction("generateKey") { (address: String?) async throws -> String in
            do {
                let pubKey = try await self.defaultStorage().generateKey(address: address)
                self.trackPublicKey(pubKey)
                return pubKey
            } catch {
                throw Exception(
                    name: "GenerateKeyFailed",
                    description: "generateKey failed: \(error)"
                )
            }
        }

        // Renames the pending Keychain entry to a wallet-address entry.
        AsyncFunction("mapAddressToKey") { (address: String, publicKeyBase64: String) async throws in
            do {
                try await self.defaultStorage().mapAddressToKey(address: address, publicKeyBase64: publicKeyBase64)
            } catch {
                throw Exception(name: "MapAddressToKeyFailed", description: "mapAddressToKey failed: \(error)")
            }
        }

        // Returns the stored public key for a wallet address, or nil.
        AsyncFunction("getKey") { (address: String) async -> String? in
            await self.defaultStorage().getKey(address: address)
        }

        // Returns true if a key with the given public key was generated on this device.
        AsyncFunction("hasKey") { (publicKeyBase64: String) -> Bool in
            self.trackedPublicKeys().contains(publicKeyBase64)
        }

        // Signs a base64-encoded message; returns { r, s } hex strings.
        AsyncFunction("signMessage") { (address: String, message: String) async throws -> [String: String] in
            do {
                let sig = try await self.defaultStorage().signMessage(address: address, message: message)
                return ["r": sig.r, "s": sig.s]
            } catch {
                throw Exception(name: "SignMessageFailed", description: "signMessage failed: \(error)")
            }
        }

        // Deletes the key for a wallet address.
        AsyncFunction("deleteKey") { (address: String) async throws in
            let pubKey = await self.defaultStorage().getKey(address: address)
            try await self.defaultStorage().deleteKey(address: address)
            if let pubKey = pubKey {
                self.untrackPublicKey(pubKey)
            }
        }

        // Deletes a pending key that was never promoted to a wallet-address key.
        AsyncFunction("deletePendingKey") { (publicKeyBase64: String) async throws in
            try await self.defaultStorage().deletePendingKey(publicKeyBase64: publicKeyBase64)
            self.untrackPublicKey(publicKeyBase64)
        }
    }

    // MARK: - Public key index (Keychain-backed)
    //
    // `hasKey(publicKeyBase64)` needs to answer "does this device hold the private key
    // for this public key?" without knowing the associated wallet address. We maintain
    // a lightweight index stored in the Keychain so it survives app reinstalls —
    // just like the private keys themselves do.

    private static let indexService = "com.crossmint.device-signer"
    private static let indexAccount = "public_key_index"

    private func trackedPublicKeys() -> Set<String> {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.indexService,
            kSecAttrAccount as String: Self.indexAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let keys = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return Set(keys)
    }

    private func saveTrackedPublicKeys(_ keys: Set<String>) {
        guard let data = try? JSONEncoder().encode(Array(keys)) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.indexService,
            kSecAttrAccount as String: Self.indexAccount,
        ]
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var addQuery = query
            addQuery[kSecValueData as String] = data
            SecItemAdd(addQuery as CFDictionary, nil)
        }
    }

    private func trackPublicKey(_ pubKey: String) {
        var keys = trackedPublicKeys()
        keys.insert(pubKey)
        saveTrackedPublicKeys(keys)
    }

    private func untrackPublicKey(_ pubKey: String) {
        var keys = trackedPublicKeys()
        keys.remove(pubKey)
        saveTrackedPublicKeys(keys)
    }

    // MARK: - Private helpers

    private func defaultStorage() -> any DeviceSignerKeyStorage {
        #if targetEnvironment(simulator)
        return SoftwareDeviceSignerKeyStorage()
        #else
        if SecureEnclave.isAvailable {
            return SecureEnclaveKeyStorage()
        } else {
            return SoftwareDeviceSignerKeyStorage()
        }
        #endif
    }
}
