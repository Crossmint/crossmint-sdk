
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
| `PLAYWRIGHT_BASE_URL` | ❌ | App URL (defaults to http://localhost:3000) |

---

Need help? Check the [Playwright documentation](https://playwright.dev/) or [Mailosaur docs](https://mailosaur.com/docs/).