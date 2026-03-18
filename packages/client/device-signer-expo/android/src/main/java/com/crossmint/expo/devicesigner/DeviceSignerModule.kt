package com.crossmint.expo.devicesigner

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo native module that exposes device signer key storage to React Native.
 *
 * Delegates to [DeviceSignerKeyStorage], which uses Android Keystore
 * backed by StrongBox (if available) or the TEE.
 *
 * Registered as "CrossmintDeviceSigner" and consumed on the JS side by
 * NativeDeviceSignerKeyStorage from @crossmint/expo-device-signer.
 */
class DeviceSignerModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("CrossmintDeviceSigner")

        // Returns true — Android Keystore is always available on API 23+.
        AsyncFunction("isAvailable") {
            true
        }

        // Generates a new P-256 key in Android Keystore (StrongBox or TEE).
        AsyncFunction("generateKey") { address: String? ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            DeviceSignerKeyStorage(context).generateKey(address).getOrThrow()
        }

        // Stores the wallet-address → pubkey mapping.
        AsyncFunction("mapAddressToKey") { address: String, publicKeyBase64: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            DeviceSignerKeyStorage(context).mapAddressToKey(address, publicKeyBase64).getOrThrow()
        }

        // Returns the stored public key for a wallet address, or null.
        AsyncFunction("getKey") { address: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            DeviceSignerKeyStorage(context).getKey(address).getOrNull()
        }

        // Returns true if a key with the given public key exists on this device.
        AsyncFunction("hasKey") { publicKeyBase64: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            DeviceSignerKeyStorage(context).hasKey(publicKeyBase64).getOrThrow()
        }

        // Signs a base64-encoded message; returns a map { r, s } as hex strings.
        AsyncFunction("signMessage") { address: String, message: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            val (r, s) = DeviceSignerKeyStorage(context).signMessage(address, message).getOrThrow()
            mapOf("r" to r, "s" to s)
        }

        // Deletes the key for a wallet address.
        AsyncFunction("deleteKey") { address: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            DeviceSignerKeyStorage(context).deleteKey(address).getOrThrow()
        }

        // Deletes a pending key that was never promoted to a wallet-address key.
        AsyncFunction("deletePendingKey") { publicKeyBase64: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            DeviceSignerKeyStorage(context).deletePendingKey(publicKeyBase64).getOrThrow()
        }
    }
}
