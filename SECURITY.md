# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Email
**security@grainhero.app** with:

- a description of the issue and its impact,
- steps to reproduce (proof of concept if possible),
- affected routes, endpoints or tables.

You will get an acknowledgement within 72 hours and a status update at least
every 7 days until the issue is resolved.

## Scope

In scope: this repository's web application, server functions, public API
routes under `/api/public/*`, Supabase policies and migrations, and the ML
service in `ml-deploy/`.

Out of scope: third-party services (Supabase, Stripe, Firebase, Cloudflare)
themselves, and findings that require physical access to a customer's hardware.

## Handling credentials

- Never commit service-account JSON, private keys or API secrets. Files
  matching `*service-account*.json`, `*firebase-adminsdk*.json`, `*.pem` and
  `*.key` are gitignored.
- Secrets are provided to the runtime as environment variables and read only
  inside server-function handlers.
- If a credential is ever committed, rotate it at the provider first, then
  purge it from history.