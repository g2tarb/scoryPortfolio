# SCORY Portfolio -- Security Architecture

> This document outlines the security measures implemented on the SCORY portfolio,
> a static frontend site deployed on Vercel (HTML/CSS/JS, no backend server).

---

## Implemented Security Measures (Frontend)

### 1. Content Security Policy (CSP) -- `vercel.json`

A strict CSP is enforced via Vercel response headers:

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Blocks all origins by default |
| `script-src` | `'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com` | Restricts scripts to self + pinned CDN origins |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Limits stylesheets to self + Google Fonts |
| `font-src` | `'self' https://fonts.gstatic.com` | Font loading from Google only |
| `img-src` | `'self' data: blob:` | Images from self + inline/blob |
| `connect-src` | `'self' https://formspree.io https://api.web3forms.com ...` | XHR/fetch restricted to known form endpoints |
| `worker-src` | `'self' blob:` | Service workers from self + blob |
| `frame-ancestors` | `'none'` | Prevents clickjacking via iframe embedding |
| `base-uri` | `'self'` | Prevents `<base>` tag hijacking |
| `form-action` | `'self' https://formspree.io https://api.web3forms.com` | Restricts form submissions |
| `upgrade-insecure-requests` | (present) | Forces HTTPS for all sub-resources |

### 2. HTTP Security Headers -- `vercel.json`

- **X-Frame-Options: DENY** -- Prevents the site from being embedded in iframes (clickjacking protection).
- **X-Content-Type-Options: nosniff** -- Prevents MIME-type sniffing attacks.
- **Referrer-Policy: strict-origin-when-cross-origin** -- Limits referrer information leakage.
- **Permissions-Policy** -- Disables camera, microphone, geolocation, and FLoC tracking.

### 3. Subresource Integrity (SRI) -- `index.html`

CDN dependencies are loaded via import maps, which do not yet support the `integrity` attribute
natively in any browser (as of 2026). Mitigation:

- All CDN URLs are **pinned to exact versions** (e.g., `three@0.160.0`, `gsap@3.12.5`, `lenis@1.1.18`).
- The **Service Worker** caches CDN responses and serves from cache after first load, reducing
  exposure to CDN tampering on subsequent visits.
- CSP restricts script loading to specific CDN origins.
- TODO comments document how to add SRI once Import Map Integrity ships in browsers.

### 4. Input Sanitization -- `chatbot.js`

All user-provided text in the chatbot (name, free-text fields) is sanitized via `sanitizeInput()`:

- **Strips HTML tags** (`<script>`, `<img onerror=...>`, etc.)
- **Trims whitespace**
- **Limits length** to 200 characters (prevents oversized payloads)
- **Escapes special characters** (`&`, `<`, `>`, `"`, `'`)
- Email addresses are validated with a regex pattern before acceptance.

### 5. Error Sanitization -- `app.js`

All `catch` blocks log sanitized messages (`err.message` only), never full stack traces.
This prevents leaking:

- Internal file paths and directory structure
- Library versions and dependency information
- Internal logic and function names

### 6. WebGL Context Loss Protection -- `three-water.js`, `universe.js`, `nebula-flaynn.js`

All Three.js renderers implement:

- `webglcontextlost` event handler: prevents default, stops rendering loop, attempts
  `forceContextRestore()` after a 2-second delay.
- `webglcontextrestored` event handler: reinitializes the scene and resumes rendering.
- Proper cleanup in `dispose()`: removes context loss event listeners.

### 7. Graceful Degradation -- `app.js`, `index.html`

- **WebGL detection**: `checkWebGLSupport()` tests for WebGL availability before initialization.
  If unavailable, adds `no-webgl` class for CSS-based fallback styling.
- **`<noscript>` fallback**: Displays a bilingual (FR/EN) static page with contact info
  when JavaScript is disabled.
- **Error boundary**: The main `try/catch` around `main()` applies a static gradient
  background and ensures the page remains usable if initialization fails.

### 8. Service Worker Security -- `sw.js`

- **Cache versioning**: `CACHE_NAME = "scory-v10"` with automatic eviction of old caches
  on activation.
- **Network-first for HTML**: Navigation requests go to network first, cache fallback only
  if offline. Prevents serving stale HTML indefinitely.
- **Stale-while-revalidate for CDN**: Serves cached CDN content instantly while updating
  in the background. Ensures latest version is fetched when possible.
- **`skipWaiting()` + `clients.claim()`**: New service worker versions activate immediately.

### 9. Additional Frontend Hardening

- **`<meta http-equiv="X-Content-Type-Options" content="nosniff">`** in HTML head.
- **`<meta name="format-detection" content="telephone=no">`** prevents mobile auto-linking.
- **`rel="noopener noreferrer"`** on all external links.
- **Version-pinned CDN URLs** (no `@latest` or semver ranges).

---

## NOT Applicable (Requires Backend Server)

The following security measures are standard best practices but **cannot be implemented
on a static frontend-only site**. They are documented here for completeness and for
future reference if a backend is added.

### Rate Limiting
- **What**: Throttle API requests per IP/user to prevent abuse and DDoS.
- **Why not applicable**: No server to enforce limits. CDN-level rate limiting (Vercel/Cloudflare)
  is the closest alternative for static sites.
- **If adding a backend**: Use `express-rate-limit` (Node.js), `slowapi` (Python/FastAPI),
  or infrastructure-level rate limiting (Cloudflare, AWS WAF).

### Authentication & Session Management
- **What**: JWT tokens, session cookies, OAuth flows, password hashing.
- **Why not applicable**: No user accounts, no login, no protected routes.
- **If adding a backend**: Use `bcrypt` or `argon2` for password hashing, short-lived JWTs
  (15min) with refresh tokens, `httpOnly` + `secure` + `sameSite` cookies, server-side
  session invalidation/blacklisting.

### CSRF Protection
- **What**: Cross-Site Request Forgery tokens on forms.
- **Why not applicable**: Forms submit to third-party services (Formspree, Web3Forms)
  which handle their own CSRF protection. No server-side form processing.
- **If adding a backend**: Use `csurf` middleware or double-submit cookie pattern.

### SQL Injection / Prepared Statements
- **What**: Parameterized database queries.
- **Why not applicable**: No database. Data is static JSON in `data.js`.
- **If adding a backend**: Always use parameterized queries (never string concatenation).
  Use an ORM (Prisma, Drizzle, SQLAlchemy) or query builder (Knex).

### Server-Side Input Validation
- **What**: Validate and sanitize all input on the server before processing.
- **Why not applicable**: No server receives user input. Chatbot data is sent to
  third-party form services or generates a `mailto:` link.
- **If adding a backend**: Use `zod`, `joi`, or `express-validator` for schema validation.
  Never trust client-side validation alone.

### Intrusion Detection System (IDS)
- **What**: Monitor for suspicious activity patterns, brute force attempts, etc.
- **Why not applicable**: No server to monitor.
- **If adding a backend**: Use `fail2ban`, OSSEC, or cloud-native solutions (AWS GuardDuty,
  Cloudflare Bot Management).

### Logging & Audit Trail
- **What**: Server-side logging of security events (failed logins, suspicious requests).
- **Why not applicable**: No server to log events. Browser console logs are client-side only.
- **If adding a backend**: Use structured logging (Winston, Pino) with log aggregation
  (Datadog, Sentry, ELK stack).

### HTTPS Certificate Management
- **What**: TLS certificate provisioning and renewal.
- **Status**: Handled automatically by Vercel. No manual intervention needed.
  `upgrade-insecure-requests` CSP directive ensures all sub-resources use HTTPS.

---

## Security Architecture Overview

```
                    +------------------+
                    |   Vercel CDN     |
                    |  (HTTPS + TLS)   |
                    |  Auto-managed    |
                    +--------+---------+
                             |
                    Response Headers:
                    CSP, X-Frame-Options,
                    X-Content-Type-Options,
                    Referrer-Policy,
                    Permissions-Policy
                             |
                    +--------v---------+
                    |   Static Files   |
                    |  index.html      |
                    |  app.js (module) |
                    |  chatbot.js      |
                    |  sw.js           |
                    +--------+---------+
                             |
              +--------------+---------------+
              |              |               |
     +--------v---+  +------v------+  +------v------+
     | Import Map |  | Service     |  | Input       |
     | (Pinned    |  | Worker      |  | Sanitization|
     |  versions) |  | (Cache +    |  | (XSS        |
     |            |  |  offline)   |  |  prevention)|
     +------------+  +-------------+  +-------------+
              |              |               |
     +--------v--------------v---------------v------+
     |                 Browser                       |
     |  - WebGL context loss recovery                |
     |  - Graceful degradation (no JS / no WebGL)    |
     |  - Error sanitization (no stack traces)       |
     |  - CSP enforcement (script/style origins)     |
     +-----------------------------------------------+
              |
     +--------v---------+     +---------------------+
     | Third-Party Forms |     | CDN (unpkg.com)     |
     | Formspree /       |     | Pinned versions     |
     | Web3Forms         |     | Three.js, GSAP,     |
     | (HTTPS only)      |     | Lenis               |
     +-------------------+     +---------------------+
```

---

## Recommendations for Future Enhancements

1. **Import Map Integrity**: When browsers ship native SRI for import maps, add
   `integrity` hashes to all CDN entries.
2. **Trusted Types**: Consider adopting the Trusted Types API to eliminate DOM XSS.
   Add `require-trusted-types-for 'script'` to CSP when browser support is sufficient.
3. **Report-URI / report-to**: Add CSP reporting endpoints to monitor violations.
   Requires a backend or third-party service (e.g., report-uri.com).
4. **Nonce-based CSP**: Replace `'unsafe-inline'` with nonce-based script-src.
   Requires server-side nonce generation per request (not possible with pure static hosting
   unless using Vercel Edge Functions).
5. **Subresource Integrity**: If migrating CDN scripts from import maps to regular
   `<script>` tags, add SRI hashes immediately.

---

*Last updated: 2026-04-12*
*Contact: contact@scory.fr*
