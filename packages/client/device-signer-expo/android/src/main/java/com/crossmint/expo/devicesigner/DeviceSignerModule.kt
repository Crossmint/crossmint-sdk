package com.crossmint.expo.devicesigner

import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.runBlocking

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
        // biometricPolicy is baked into the KeyGenParameterSpec at generation time.
        AsyncFunction("generateKey") { address: String?, biometricPolicyStr: String ->
            val policy = BiometricPolicy.from(biometricPolicyStr)
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            DeviceSignerKeyStorage(context, policy).generateKey(address).getOrThrow()
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
        // If the key was generated with biometricPolicy="always", shows a BiometricPrompt.
        AsyncFunction("signMessage") { address: String, message: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            val storage = DeviceSignerKeyStorage(context)

            val needsBiometrics = storage.isUserAuthenticationRequired(address).getOrThrow()

            if (!needsBiometrics) {
                val (r, s) = storage.signMessage(address, message).getOrThrow()
                return@AsyncFunction mapOf("r" to r, "s" to s)
            }

            // Biometric path: prepare the signature (initSign + update), then authenticate.
            val signature = storage.prepareSignature(address, message).getOrThrow()

            val activity = appContext.currentActivity as? FragmentActivity
                ?: throw IllegalStateException("FragmentActivity required for biometric prompt")

            val deferred = CompletableDeferred<Pair<String, String>>()

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Authorize signing")
                .setSubtitle("Confirm your identity to sign")
                .setNegativeButtonText("Cancel")
                .build()

            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    try {
                        val authenticatedSig = result.cryptoObject?.signature
                            ?: run {
                                deferred.completeExceptionally(
                                    IllegalStateException("No Signature in CryptoObject")
                                )
                                return
                            }
                        deferred.complete(storage.parseDerToRs(authenticatedSig.sign()))
                    } catch (e: Exception) {
                        deferred.completeExceptionally(e)
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    deferred.completeExceptionally(Exception("Biometric error $errorCode: $errString"))
                }

                override fun onAuthenticationFailed() {
                    // User's biometric didn't match — they can retry; don't cancel the deferred.
                }
            }

            activity.runOnUiThread {
                BiometricPrompt(activity, activity.mainExecutor, callback)
                    .authenticate(promptInfo, BiometricPrompt.CryptoObject(signature))
            }

            val (r, s) = runBlocking { deferred.await() }

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
