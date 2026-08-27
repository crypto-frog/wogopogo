# Security policy

## Supported version

Security fixes are applied to the current `main` branch and the latest tagged release. Older releases may not receive separate patches.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use the repository's **Security** tab and select **Report a vulnerability**. Include:

- The affected route, component, or version
- Reproduction steps or a minimal proof of concept
- The likely impact
- Any suggested mitigation
- Whether the issue appears to affect the hosted service

Please avoid accessing, modifying, or retaining real user data while investigating. Do not test denial-of-service techniques against the live service.

Maintainers will acknowledge a credible report as soon as reasonably possible, assess severity, coordinate a fix, and credit the reporter when requested and appropriate.

## Sensitive files

The repository must never contain:

- Production `api/config.php` values
- Database or moderator credentials
- Private keys, access tokens, or session material
- Database exports or local SQLite files
- Server logs, client IP records, or unpublished job submissions

The committed configuration files are inert templates. Production configuration is maintained only on the server.

## Security boundaries

Wogopogo provides application-level safeguards, but operators remain responsible for supported PHP/MySQL versions, HTTPS, server patching, backups, permissions, DNS, and hosting-account security.

