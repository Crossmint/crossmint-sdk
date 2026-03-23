package com.crossmint.client.sdk.reactnativeui

import com.crossmint.kotlin.devicesigner.DeviceSignerStorageFactory
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking

/**
 * Expo native module that exposes device signer key storage to React Native.
 *
 * Delegates to [com.crossmint.kotlin.devicesigner.KeystoreKeyStorage] via
 * [DeviceSignerStorageFactory], which uses Android Keystore backed by StrongBox
 * (API 28+) or the TEE.
 *
 * Registered as "CrossmintDeviceSigner" and consumed on the JS side by
 * NativeDeviceSignerKeyStorage from @crossmint/client-sdk-react-native-ui.
 */
class DeviceSignerModule : Module() {

    private val storage by lazy {
        DeviceSignerStorageFactory.create()
            ?: throw IllegalStateException("Device signer storage is not available on this platform")
    }

    override fun definition() = ModuleDefinition {
        Name("CrossmintDeviceSigner")

        AsyncFunction("isAvailable") {
            runBlocking { storage.isAvailable() }
        }

        AsyncFunction("generateKey") { address: String? ->
            runBlocking { storage.generateKey(address).getOrThrow() }
        }

        AsyncFunction("mapAddressToKey") { address: String, publicKeyBase64: String ->
            runBlocking { storage.mapAddressToKey(address, publicKeyBase64).getOrThrow() }
        }

        AsyncFunction("getKey") { address: String ->
            runBlocking { storage.getKey(address) }
        }

        AsyncFunction("hasKey") { publicKeyBase64: String ->
            runBlocking { storage.hasKey(publicKeyBase64) }
        }

        AsyncFunction("signMessage") { address: String, message: String ->
            val (r, s) = runBlocking { storage.signMessage(address, message).getOrThrow() }
            mapOf("r" to r, "s" to s)
        }

        AsyncFunction("deleteKey") { address: String ->
            runBlocking { storage.deleteKey(address).getOrThrow() }
        }

        AsyncFunction("deletePendingKey") { publicKeyBase64: String ->
            runBlocking { storage.deletePendingKey(publicKeyBase64).getOrThrow() }
        }
    }
}
