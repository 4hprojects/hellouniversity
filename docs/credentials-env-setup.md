# Credentials and Secrets Policy

Updated: 2026-02-27

## Policy

- Do not store plaintext credential files in the repository.
- Do not commit service account JSON files such as:
  - `credentials/service-account.json`
- Store secrets only in environment variables.

## Google Service Account (Required Env Vars)

- `GOOGLE_TYPE`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_PRIVATE_KEY_ID`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_AUTH_URI`
- `GOOGLE_TOKEN_URI`
- `GOOGLE_AUTH_PROVIDER_X509_CERT_URL`
- `GOOGLE_CLIENT_X509_CERT_URL`
- `GOOGLE_UNIVERSE_DOMAIN`

## Notes for `GOOGLE_PRIVATE_KEY`

- Keep newline characters escaped in `.env` as `\\n`.
- Runtime code converts `\\n` to real line breaks before auth.

## Rotation Guidance

1. Revoke old service account key in Google Cloud Console.
2. Create a new key.
3. Update environment variables in deployment and local `.env`.
4. Restart application and verify Google Sheets integrations.
