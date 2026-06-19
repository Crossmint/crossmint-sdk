import CryptoKit
import CrossmintDeviceSigner
import ExpoModulesCore
import Security

public class DeviceSignerModule: Module {

    public func definition() -> ModuleDefinition {
        Name("CrossmintDeviceSigner")

        AsyncFunction("isAvailable") { () -> Bool in
            true
        }

        AsyncFunction("generateKey") { (address: String?) async throws -> String in
            do {
                return try await self.defaultStorage().generateKey(address: address)
            } catch {
                throw Exception(
                    name: "GenerateKeyFailed",
                    description: "generateKey failed: \(error)"
                )
            }
        }

        AsyncFunction("mapAddressToKey") { (address: String, publicKeyBase64: String) async throws in
            do {
                try await self.defaultStorage().mapAddressToKey(address: address, publicKeyBase64: publicKeyBase64)
            } catch {
                throw Exception(name: "MapAddressToKeyFailed", description: "mapAddressToKey failed: \(error)")
            }
        }

        AsyncFunction("getKey") { (address: String) async -> String? in
            await self.defaultStorage().getKey(address: address)
        }

        AsyncFunction("hasKey") { (publicKeyBase64: String) -> Bool in
            self.defaultStorage().hasKey(publicKeyBase64: publicKeyBase64)
        }

        AsyncFunction("signMessage") { (address: String, message: String) async throws -> [String: String] in
            do {
                let sig = try await self.defaultStorage().signMessage(address: address, message: message)
                return ["r": sig.r, "s": sig.s]
            } catch {
                throw Exception(name: "SignMessageFailed", description: "signMessage failed: \(error)")
            }
        }

        AsyncFunction("deleteKey") { (address: String) async throws in
            try await self.defaultStorage().deleteKey(address: address)
        }

        AsyncFunction("deletePendingKey") { (publicKeyBase64: String) async throws in
            try await self.defaultStorage().deletePendingKey(publicKeyBase64: publicKeyBase64)
        }
    }

    private func defaultStorage() -> any DeviceSignerKeyStorage {
        #if targetEnvironment(simulator)
        return KeychainKeyStorage()
        #else
        if SecureEnclave.isAvailable {
            return SecureEnclaveKeyStorage()
        } else {
            return KeychainKeyStorage()
        }
        #endif
    }
}
