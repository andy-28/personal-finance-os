# Security

Sprint 5.4 does not introduce production deployment, but it establishes the security baseline required before cloud use.

## Authentication

PersonalFinanceOS uses JWT access tokens and refresh tokens. Access tokens should be short-lived. Refresh tokens must remain protected and should not be logged.

## Passwords

Passwords are handled by the authentication flow and must never be logged, stored in plaintext, or exposed through seed output.

## Secrets

Production secrets must be stored in the platform secret manager, not committed to git.

Important secrets:

- Database password or connection string
- JWT signing key
- Redis password if configured
- Provider-specific deployment tokens

## Environment Variables

Development `.env` files are local only. `.env.example` documents required variables without real secrets.

## CORS

Development can allow local frontend origins. Production should restrict CORS to the deployed frontend origin only.

## HTTPS

Production must use HTTPS for every browser-facing route and API call.

## Logging

Logs must not contain:

- Passwords
- Refresh tokens
- JWTs
- PDF statement passwords
- Full statement raw text if it can expose sensitive financial data

## Future Hardening

- Login rate limiting.
- Audit log for sensitive actions.
- Token rotation and revocation review.
- Security headers.
- Backup encryption.
- Production monitoring and alerting.
