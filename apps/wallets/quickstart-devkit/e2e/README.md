
## 🔧 Configuration

Tests are configured to:
- Run sequentially per signer type (prevents parallel OTP conflicts)
- Cache authenticated sessions for reuse
- Take screenshots on failures
- Use Mailosaur for reliable email and phone signer OTP testing

## 🐛 Troubleshooting

- **Mailosaur errors**: Verify your API key and server ID are correct
- **Timeout issues**: Check if the local dev server is running on port 3000
- **OTP failures**: Tests run sequentially to avoid multiple OTP codes
- **Sudden auth failures**: If you encounter repeated authentication failures, it may be due to rate limiting on auth requests. To work around this, try modifying the signer type by adding a number (e.g., change `email` to `email1`), then create a new wallet, fund it, and rerun the tests.

## 📋 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILOSAUR_API_KEY` | ✅ | Your Mailosaur API key |
| `MAILOSAUR_SERVER_ID` | ✅ | Your Mailosaur server ID |
| `MAILOSAUR_PHONE_NUMBER` | ✅ | Your Mailosaur phone number |
| `TESTS_CROSSMINT_API_KEY` | ✅ | Your Crossmint API key for e2e testing |
| `PLAYWRIGHT_BASE_URL` | ❌ | App URL (defaults to http://localhost:3000) |
| `SOLANA_DEVNET_RPC_URL` | ❌ | Devnet RPC (defaults to https://api.devnet.solana.com) |
| `SOLANA_DEVNET_FUNDER_SECRET_KEY` | ❌ | Devnet keypair that seeds Solana test wallets with SOL |

## ⛽ Funding Solana test wallets

Solana transfers need native SOL for fees, and the Crossmint faucet only dispenses
USDXM. `requestAirdrop` against the public devnet faucet now fails from every IP we
have tried, CI runners included, so `SOLANA_DEVNET_FUNDER_SECRET_KEY` holds a devnet
keypair that seeds the test wallets directly. Its value is the 64-byte secret key as
the JSON array `solana-keygen` writes — the contents of `~/.config/solana/id.json`.

Wallets are reused across runs and a transfer costs roughly 0.0002 SOL, so 1 SOL in
the funder covers thousands of runs. Top it up through the
[web faucet](https://faucet.solana.com), which is captcha-gated and still works when
the RPC airdrop does not. Without the variable the tests fall back to `requestAirdrop`
and fail on any wallet that holds no SOL.

---

Need help? Check the [Playwright documentation](https://playwright.dev/) or [Mailosaur docs](https://mailosaur.com/docs/).