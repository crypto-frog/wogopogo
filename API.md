# HTTP API

The API is served below `/api` and returns JSON. Production requests are same-origin. Local development origins on `localhost` or `127.0.0.1` are permitted.

## Conventions

- Successful responses use an appropriate 2xx status.
- Validation and application errors use `{"error":"..."}`; field-level errors may include `fields`.
- Responses are marked `private, no-store`.
- Request bodies for write operations must be JSON.
- The configured request-size limit is enforced before parsing.
- Moderator authentication uses the `X-Admin-Key` header.
- Times are represented as UTC `YYYY-MM-DD HH:MM:SS` values internally.

## Public endpoints

### `GET /api/health`

Checks configuration and database connectivity. It reports the active driver and whether a non-default moderator key is configured, but never returns the key or database credentials.

### `GET /api/meta`

Returns categories with live listing counts, configured locations and employment types, the moderation flag, and the featured-listing flag.

### `GET /api/jobs`

Returns approved, unexpired listings.

Supported query parameters:

| Parameter | Purpose |
| --- | --- |
| `search` | Title, company, and description search |
| `category` | Category slug |
| `location` | Exact configured location |
| `type` | Exact configured employment type |
| `page` | Result page |
| `per_page` | Page size, capped at 50 |

Featured listings sort before free listings; each group sorts newest first.

### `GET /api/jobs/{id}`

Returns one approved, unexpired listing. A valid management token may be supplied by the first-party interface to preview a poster-owned pending listing.

### `POST /api/jobs`

Submits a listing. The API validates required fields, lengths, configured values, application contact details, request rate, and the honeypot field.

The success response includes a one-time management token. Clients must explain that the token cannot be recovered.

### `POST /api/jobs/{id}/manage`

Performs a poster-authorized action using the management token in the JSON body.

Supported actions:

- `close`
- `delete`

## Moderator endpoints

### `GET /api/admin/jobs?status={state}`

Returns a moderation list for the requested state. Requires `X-Admin-Key`.

### `POST /api/admin/jobs/{id}`

Performs a moderator action. Requires `X-Admin-Key`.

Supported actions:

- `approve`
- `reject`
- `feature`
- `unfeature`
- `close`
- `renew`
- `delete`

## Security notes

Do not put moderator keys in URLs, logs, issue reports, screenshots, or client-side source. Do not expose management tokens beyond the poster's browser flow. Public integrations should be proposed and reviewed before relying on undocumented response fields.

The implementation in [backend/api/index.php](backend/api/index.php) is authoritative. Report discrepancies or vulnerabilities privately according to [SECURITY.md](SECURITY.md).

