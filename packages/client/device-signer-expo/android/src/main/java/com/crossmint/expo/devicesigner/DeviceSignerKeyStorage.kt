package com.crossmint.expo.devicesigner

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.util.UUID

/**
 * Wraps Android Keystore for P-256 device signing keys.
 *
 * Key lifecycle:
 * 1. `generateKey(address?)` — generates a P-256 key in the Keystore.
 *    Returns the raw 64-byte (x‖y) public key as base64.
 * 2. `mapAddressToKey(address, pubKeyBase64)` — links a wallet address to the key.
 * 3. `signMessage(address, message)` — signs a base64 payload with the stored key.
 *
 * Metadata (address→pubkey, pubkey→alias) is stored in a private SharedPreferences file.
 */
internal class DeviceSignerKeyStorage(context: Context, private val biometricPolicy: BiometricPolicy = BiometricPolicy.NONE) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("crossmint_device_signer", Context.MODE_PRIVATE)

    // ---- key generation ---------------------------------------------------

    fun generateKey(address: String?): Result<String> = runCatching {
        val alias = "cm_${UUID.randomUUID()}"
        val spec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .apply {
                if (biometricPolicy == BiometricPolicy.ALWAYS) {
                    setUserAuthenticationRequired(true)
                    setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
                }
            }
            .build()

        val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
        kpg.initialize(spec)
        val keyPair = kpg.generateKeyPair()

        val pubKeyBase64 = encodePublicKey(keyPair.public as ECPublicKey)

        // Persist: alias → pubkey and pubkey → alias
        prefs.edit()
            .putString("pk_$pubKeyBase64", alias)
            .apply {
                if (address != null) putString("addr_$address", pubKeyBase64)
            }
            .apply()

        pubKeyBase64
    }

    // ---- address mapping --------------------------------------------------

    fun mapAddressToKey(address: String, publicKeyBase64: String): Result<Unit> = runCatching {
        prefs.edit().putString("addr_$address", publicKeyBase64).apply()
    }

    // ---- key retrieval ----------------------------------------------------

    fun getKey(address: String): Result<String?> = runCatching {
        prefs.getString("addr_$address", null)
    }

    fun hasKey(publicKeyBase64: String): Result<Boolean> = runCatching {
        prefs.contains("pk_$publicKeyBase64")
    }

    // ---- signing ----------------------------------------------------------

    fun signMessage(address: String, message: String): Result<Pair<String, String>> = runCatching {
        val pubKeyBase64 = prefs.getString("addr_$address", null)
            ?: error("No key found for address $address")
        val alias = prefs.getString("pk_$pubKeyBase64", null)
            ?: error("No alias found for public key")

        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val privateKey = keyStore.getKey(alias, null)
            ?: error("Key not in Keystore for alias $alias")

        val messageBytes = Base64.decode(message, Base64.NO_WRAP)

        val sig = Signature.getInstance("SHA256withECDSA").apply {
            initSign(privateKey as java.security.PrivateKey)
            update(messageBytes)
        }
        val derSignature = sig.sign()

        parseDerSignature(derSignature)
    }

    // ---- deletion ---------------------------------------------------------

    fun deleteKey(address: String): Result<Unit> = runCatching {
        val pubKeyBase64 = prefs.getString("addr_$address", null) ?: return@runCatching
        val alias = prefs.getString("pk_$pubKeyBase64", null)
        if (alias != null) deleteKeystoreEntry(alias)
        prefs.edit().remove("addr_$address").remove("pk_$pubKeyBase64").apply()
    }

    fun deletePendingKey(publicKeyBase64: String): Result<Unit> = runCatching {
        val alias = prefs.getString("pk_$publicKeyBase64", null) ?: return@runCatching
        deleteKeystoreEntry(alias)
        prefs.edit().remove("pk_$publicKeyBase64").apply()
    }

    // ---- helpers ----------------------------------------------------------

    private fun deleteKeystoreEntry(alias: String) {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (keyStore.containsAlias(alias)) keyStore.deleteEntry(alias)
    }

    /**
     * Encodes an EC public key as 64 raw bytes (x‖y, each 32 bytes big-endian) in base64.
     * This matches the format used by the iOS implementation and expected by the JS layer.
     */
    private fun encodePublicKey(pub: ECPublicKey): String {
        val x = pub.w.affineX.toByteArray().trimSignByte().padStart(32)
        val y = pub.w.affineY.toByteArray().trimSignByte().padStart(32)
        // Uncompressed P-256 point: 0x04 prefix + 32-byte x + 32-byte y (65 bytes total)
        val uncompressed = byteArrayOf(0x04) + x + y
        return Base64.encodeToString(uncompressed, Base64.NO_WRAP)
    }

    /** Removes the leading sign byte that BigInteger.toByteArray() may prepend. */
    private fun ByteArray.trimSignByte(): ByteArray =
        if (size == 33 && this[0] == 0.toByte()) copyOfRange(1, size) else this

    /** Pads a byte array to [length] bytes with leading zeros. */
    private fun ByteArray.padStart(length: Int): ByteArray {
        if (size >= length) return this
        return ByteArray(length - size) + this
    }

    /**
     * Parses a DER-encoded ECDSA signature (30 <len> 02 <rLen> <r> 02 <sLen> <s>)
     * into the (r, s) components as 0x-prefixed hex strings.
     */
    private fun parseDerSignature(der: ByteArray): Pair<String, String> {
        var idx = 2 // skip 0x30 <totalLen>
        check(der[idx] == 0x02.toByte()) { "Expected INTEGER tag for r" }
        val rLen = der[idx + 1].toInt() and 0xff
        val r = der.copyOfRange(idx + 2, idx + 2 + rLen).trimSignByte().padStart(32)
        idx += 2 + rLen
        check(der[idx] == 0x02.toByte()) { "Expected INTEGER tag for s" }
        val sLen = der[idx + 1].toInt() and 0xff
        val s = der.copyOfRange(idx + 2, idx + 2 + sLen).trimSignByte().padStart(32)
        return "0x${r.toHex()}" to "0x${s.toHex()}"
    }

    private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }
}

internal enum class BiometricPolicy {
    NONE, ALWAYS;

    companion object {
        fun from(value: String): BiometricPolicy =
            if (value.equals("always", ignoreCase = true)) ALWAYS else NONE
    }
}
