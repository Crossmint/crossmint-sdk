# Device Signer API — Manual Test Cases

Manual curl commands to stress-test the Crossmint Device Signer APIs.
Each case includes the expected HTTP status and what it validates.

## Setup

```bash
export API_KEY="your_staging_api_key_here"
export BASE="https://staging.crossmint.com/api/2025-06-09"
export FUND="https://staging.crossmint.com/api/v1-alpha2"
export CHAIN="base-sepolia"
export TOKEN="base-sepolia:usdxm"

# After creating a wallet:
export WALLET="0x<your_wallet_address>"
export SIG_ID="<signature-request-id>"
export TX_ID="<transaction-id>"
export SIGNER_LOCATOR="device:<base64-pubkey>"
```

---

## 1. Authentication

### 1.1 No API key → 401/403
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/wallets/0x000000000000000000000000000000000000dead"
```
Expected: `401` or `403`

### 1.2 Invalid API key → 401/403
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: sk_staging_COMPLETELY_INVALID" \
  "$BASE/wallets/0x000000000000000000000000000000000000dead"
```
Expected: `401` or `403`

### 1.3 Empty API key → 401/403
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: " \
  "$BASE/wallets/0x000000000000000000000000000000000000dead"
```
Expected: `401` or `403`

### 1.4 API key with spaces → 401/403
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: sk staging invalid key" \
  "$BASE/wallets/0x000000000000000000000000000000000000dead"
```
Expected: `401` or `403`

---

## 2. Wallet Creation (POST /wallets)

### 2.1 Missing chainType → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:test-missing-chaintype"
  }' \
  "$BASE/wallets"
```
Expected: `400` with an error message referencing `chainType`

### 2.2 Invalid chainType → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "blockchain",
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:test-invalid-chaintype"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.3 Missing wallet type → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:test-missing-type"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.4 Invalid wallet type → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "hardware",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:test-invalid-type"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.5 Invalid adminSigner type → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": { "adminSigner": { "type": "magic-link", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:test-invalid-admin-type"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.6 Admin address not 0x-prefixed → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "notanaddress" } },
    "owner": "userId:test-invalid-address"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.7 Admin address too short → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0xABCD" } },
    "owner": "userId:test-short-address"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.8 Admin address with non-hex characters → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0xGGGG000000000000000000000000000000000000" } },
    "owner": "userId:test-nonhex-address"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.9 Device signer with non-numeric publicKey.x → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": {
      "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" },
      "delegatedSigners": [{
        "signer": { "type": "device", "publicKey": { "x": "NOT_A_NUMBER", "y": "12345678901234567890" } },
        "chain": "base-sepolia"
      }]
    },
    "owner": "userId:test-bad-pubkey-x"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.10 Device signer with negative publicKey.y → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": {
      "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" },
      "delegatedSigners": [{
        "signer": { "type": "device", "publicKey": { "x": "12345678901234567890", "y": "-999" } },
        "chain": "base-sepolia"
      }]
    },
    "owner": "userId:test-negative-pubkey-y"
  }' \
  "$BASE/wallets"
```
Expected: `400`

### 2.11 Idempotency — same owner twice
```bash
# First call (should succeed)
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:idempotency-test-owner-1"
  }' \
  "$BASE/wallets"

# Second call with the same owner (should be idempotent or return 409)
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:idempotency-test-owner-1"
  }' \
  "$BASE/wallets"
```
Expected: First `200/201`. Second: either `200/201` with the same `address`, or `400/409`.

---

## 3. Wallet Retrieval (GET /wallets/{address})

### 3.1 Non-existent wallet (valid format) → 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$BASE/wallets/0x000000000000000000000000000000000000dead"
```
Expected: `404`

### 3.2 Address too short → 400 or 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$BASE/wallets/0xdeadbeef"
```
Expected: `400` or `404`

### 3.3 Address not 0x-prefixed → 400 or 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$BASE/wallets/plaintext-wallet-id"
```
Expected: `400` or `404`

### 3.4 Address with invalid character → 400 or 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$BASE/wallets/0x123456789012345678901234567890123456789Z"
```
Expected: `400` or `404` — **never** `500`

---

## 4. Signer Registration (POST /wallets/{address}/signers)

### 4.1 Missing signer.type → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "publicKey": { "x": "12345678901234567890", "y": "12345678901234567890" } },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.2 Invalid signer type → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "hardware-key", "publicKey": { "x": "12345678901234567890", "y": "12345678901234567890" } },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.3 Missing publicKey entirely → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "device" },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.4 Missing publicKey.x → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "device", "publicKey": { "y": "12345678901234567890" } },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.5 publicKey.x as empty string → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "device", "publicKey": { "x": "", "y": "12345678901234567890" } },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.6 publicKey.x as non-numeric string → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "device", "publicKey": { "x": "not-a-number", "y": "12345678901234567890" } },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.7 publicKey.x as negative number → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "device", "publicKey": { "x": "-1", "y": "12345678901234567890" } },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.8 publicKey.x larger than P-256 prime → 400
```bash
# P-256 prime p is a 77-digit number. This 79-digit value is out of range.
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "device", "publicKey": { "x": "100000000000000000000000000000000000000000000000000000000000000000000000000000", "y": "12345678901234567890" } },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.9 Invalid chain → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "device", "publicKey": { "x": "12345678901234567890", "y": "12345678901234567890" } },
    "chain": "mainnet"
  }' \
  "$BASE/wallets/$WALLET/signers"
```
Expected: `400`

### 4.10 Signer on non-existent wallet → 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "device", "publicKey": { "x": "12345678901234567890", "y": "12345678901234567890" } },
    "chain": "base-sepolia"
  }' \
  "$BASE/wallets/0x000000000000000000000000000000000000dead/signers"
```
Expected: `404`

---

## 5. Signature Approvals (POST /wallets/{addr}/signatures/{id}/approvals)

### 5.1 GET non-existent signature → 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$BASE/wallets/$WALLET/signatures/00000000-0000-0000-0000-000000000001"
```
Expected: `404`

### 5.2 POST approvals to non-existent signature → 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "external-wallet:0x000000000000000000000000000000000000dead",
      "signature": "0xabababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababab"
    }]
  }' \
  "$BASE/wallets/$WALLET/signatures/00000000-0000-0000-0000-000000000001/approvals"
```
Expected: `404`

### 5.3 POST approvals with empty array → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "approvals": [] }' \
  "$BASE/wallets/$WALLET/signatures/$SIG_ID/approvals"
```
Expected: `400` or `404`

### 5.4 POST approvals missing 'signer' field → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signature": "0xabababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababab"
    }]
  }' \
  "$BASE/wallets/$WALLET/signatures/$SIG_ID/approvals"
```
Expected: `400` or `404`

### 5.5 POST approvals missing 'signature' field → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "external-wallet:0x000000000000000000000000000000000000dead"
    }]
  }' \
  "$BASE/wallets/$WALLET/signatures/$SIG_ID/approvals"
```
Expected: `400` or `404`

### 5.6 POST approvals with unknown signer type prefix → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "faketype:somevalue",
      "signature": "0xabababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababab"
    }]
  }' \
  "$BASE/wallets/$WALLET/signatures/$SIG_ID/approvals"
```
Expected: `400` or `404`

---

## 6. Token Transfers (POST /wallets/{addr}/tokens/{token}/transfers)

### 6.1 Zero amount → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "'"$SIGNER_LOCATOR"'",
    "amount": "0"
  }' \
  "$BASE/wallets/$WALLET/tokens/$TOKEN/transfers"
```
Expected: `400`

### 6.2 Negative amount → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "'"$SIGNER_LOCATOR"'",
    "amount": "-1"
  }' \
  "$BASE/wallets/$WALLET/tokens/$TOKEN/transfers"
```
Expected: `400`

### 6.3 Non-numeric amount → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "'"$SIGNER_LOCATOR"'",
    "amount": "lots"
  }' \
  "$BASE/wallets/$WALLET/tokens/$TOKEN/transfers"
```
Expected: `400`

### 6.4 Missing recipient → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": "'"$SIGNER_LOCATOR"'",
    "amount": "0.0001"
  }' \
  "$BASE/wallets/$WALLET/tokens/$TOKEN/transfers"
```
Expected: `400`

### 6.5 Invalid recipient (not 0x address) → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "not-an-address",
    "signer": "'"$SIGNER_LOCATOR"'",
    "amount": "0.0001"
  }' \
  "$BASE/wallets/$WALLET/tokens/$TOKEN/transfers"
```
Expected: `400`

### 6.6 Missing amount → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "'"$SIGNER_LOCATOR"'"
  }' \
  "$BASE/wallets/$WALLET/tokens/$TOKEN/transfers"
```
Expected: `400`

### 6.7 Missing signer → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "amount": "0.0001"
  }' \
  "$BASE/wallets/$WALLET/tokens/$TOKEN/transfers"
```
Expected: `400`

### 6.8 Signer with invalid locator format → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "completely-invalid",
    "amount": "0.0001"
  }' \
  "$BASE/wallets/$WALLET/tokens/$TOKEN/transfers"
```
Expected: `400`

### 6.9 Transfer on non-existent wallet → 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "'"$SIGNER_LOCATOR"'",
    "amount": "0.0001"
  }' \
  "$BASE/wallets/0x000000000000000000000000000000000000dead/tokens/$TOKEN/transfers"
```
Expected: `404`

### 6.10 Invalid token in path → 400 or 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "'"$SIGNER_LOCATOR"'",
    "amount": "0.0001"
  }' \
  "$BASE/wallets/$WALLET/tokens/base-sepolia:NOTATOKEN/transfers"
```
Expected: `400` or `404` — **never** `500`

---

## 7. Transaction Approvals (POST /wallets/{addr}/transactions/{id}/approvals)

### 7.1 GET non-existent transaction → 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$BASE/wallets/$WALLET/transactions/00000000-0000-0000-0000-000000000001"
```
Expected: `404`

### 7.2 POST approval to non-existent transaction → 404
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "'"$SIGNER_LOCATOR"'",
      "signature": {
        "r": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "s": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      }
    }]
  }' \
  "$BASE/wallets/$WALLET/transactions/00000000-0000-0000-0000-000000000001/approvals"
```
Expected: `404`

### 7.3 POST approval with empty approvals array → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "approvals": [] }' \
  "$BASE/wallets/$WALLET/transactions/$TX_ID/approvals"
```
Expected: `400` or `404` — **never** `500`

### 7.4 POST device approval with r/s hex too short → 400
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "'"$SIGNER_LOCATOR"'",
      "signature": { "r": "0x01", "s": "0x01" }
    }]
  }' \
  "$BASE/wallets/$WALLET/transactions/$TX_ID/approvals"
```
Expected: `400` or `404`

### 7.5 POST device approval using string signature instead of {r,s} → 400
```bash
# Device signers require { r, s } format — not a full Ethereum string signature
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "'"$SIGNER_LOCATOR"'",
      "signature": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }]
  }' \
  "$BASE/wallets/$WALLET/transactions/$TX_ID/approvals"
```
Expected: `400` or `404`

### 7.6 POST approval with all-zero r,s values (cryptographically invalid) → should fail
```bash
# Submit a valid-format but cryptographically invalid signature
# The API may accept it initially (202) then the transaction will fail on-chain,
# or it may reject it immediately if it validates the signature math.
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "'"$SIGNER_LOCATOR"'",
      "signature": {
        "r": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "s": "0x0000000000000000000000000000000000000000000000000000000000000000"
      }
    }]
  }' \
  "$BASE/wallets/$WALLET/transactions/$TX_ID/approvals"
```
Expected: `400` (if validated immediately) or `202` then transaction status → `failed`

---

## 8. Funding (POST /wallets/{addr}/balances — v1-alpha2)

### 8.1 Fund non-existent wallet → 4xx
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 1, "token": "usdxm", "chain": "base-sepolia" }' \
  "$FUND/wallets/0x000000000000000000000000000000000000dead/balances"
```
Expected: `404` or `400` — **never** `500`

### 8.2 Fund with zero amount → 4xx
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 0, "token": "usdxm", "chain": "base-sepolia" }' \
  "$FUND/wallets/$WALLET/balances"
```
Expected: `400` — **never** `500`

### 8.3 Fund with invalid token → 4xx
```bash
curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 1, "token": "fakecoin", "chain": "base-sepolia" }' \
  "$FUND/wallets/$WALLET/balances"
```
Expected: `400` or `404` — **never** `500`

---

## Tips

- **Check for 5xx**: Always pipe output through `| python3 -m json.tool` to pretty-print and look for 5xx responses or stack traces in the body — those indicate server bugs.
- **Check error message quality**: A good API returns `{"message": "chainType is required"}` not just `{"error": true}`. Verify messages are descriptive.
- **Rate limits**: If you get `429`, back off and retry. All tests above should work without rate limiting.
- **Idempotency keys**: If the API supports `Idempotency-Key` headers, add `-H "Idempotency-Key: $(uuidgen)"` to test idempotency guarantees.
