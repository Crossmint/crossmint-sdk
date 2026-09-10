
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
- **Sudden auth failures, or `Transaction did not start` on a wallet that worked before**: auth requests may be rate limited, or the wallet may be at its signer limit, because each run in a new browser adds a device signer to it. Set `TESTS_WALLET_EMAIL_SUFFIX` to an unused value to move to a new wallet, then fund it.

## 📋 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILOSAUR_API_KEY` | ✅ | Your Mailosaur API key |
| `MAILOSAUR_SERVER_ID` | ✅ | Your Mailosaur server ID |
| `MAILOSAUR_PHONE_NUMBER` | ✅ | Your Mailosaur phone number |
| `TESTS_CROSSMINT_API_KEY` | ✅ | Your Crossmint API key for e2e testing |
| `PLAYWRIGHT_BASE_URL` | ❌ | App URL (defaults to http://localhost:3000) |
| `TESTS_WALLET_EMAIL_SUFFIX` | ❌ | Selects the wallet identity (defaults to `e2e`). A fixed value reuses one funded wallet; a unique value per run gives a new wallet. |

---

Need help? Check the [Playwright documentation](https://playwright.dev/) or [Mailosaur docs](https://mailosaur.com/docs/).