# FINORA verification backend (email and mobile OTP)

Zero dependencies, Node 18+. Run: `node backend/server.js` · Test: `node backend/test.js`

## API (JSON)
| Endpoint | Body | Result |
|---|---|---|
| `POST /api/otp/send` | `{channel:"email"\|"phone", target}` | Sends a 6 digit code. Returns masked target, `resendIn`. |
| `POST /api/otp/verify` | `{channel, target, code}` | On success returns a signed `token` (valid 30 min). |
| `POST /api/verify/check` | `{token, channel, target}` | `{valid:true/false}` for server-side trust checks. |
| `GET /health` | | Provider status. |

## Security built in
Codes are 6 digits from a CSPRNG, stored only as HMAC hashes, expire in 10 minutes, are single use, and lock after 5 wrong tries.
30 second resend cooldown, 5 codes per target per hour, 20 per IP per hour. Constant-time comparison, 2 KB body limit, CORS allowlist,
Indian mobile numbers normalised to +91. The code is never returned by the API (only when `DEV_ECHO=1` outside production).

## Configuration (environment variables)
| Variable | Purpose |
|---|---|
| `OTP_SECRET` | Required in production, 24+ random characters. |
| `ALLOWED_ORIGINS` | Comma separated site origins, e.g. `https://finora.pages.dev`. Default `*`. |
| `EMAIL_PROVIDER` | `resend` or `console` (logs only). Needs `RESEND_API_KEY`, `EMAIL_FROM` (a domain verified in Resend). |
| `SMS_PROVIDER` | `twilio` (`TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`), `msg91` (`MSG91_AUTHKEY`, `MSG91_TEMPLATE_ID`) or `console`. |
| `TRUST_PROXY=1` | Use `X-Forwarded-For` for rate limits when behind a proxy (Render, Railway, Fly). |
| `PORT`, `NODE_ENV=production` | |

India SMS note: Indian operators require DLT registration of your sender ID and message template. Twilio and MSG91 both guide you through it.
Without it, SMS to Indian numbers is blocked by carriers. Email needs no such step.

## Connect the site
Deploy this folder to any Node host (Render, Railway, Fly.io, a VPS), then set the address in `public/config.js`
(`api: 'https://your-api.example.com'`) or in the app under Settings, Data source. When it is set, signup asks for the email code
(and the mobile code if a number was entered) before creating the account. When it is not set, signup still works and the account is marked unverified.

## Limits of this version
Codes live in memory, so run a single instance (or swap the Map for Redis). Phase 1 accounts are still stored in the browser,
so the verified flag is a local record; the signed token lets a future server-side account service trust the result.
