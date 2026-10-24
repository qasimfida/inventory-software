# Invitation and recovery links

Web captures `/auth/link`, `/auth/reset`, or `/auth/invitation` on its HTTPS origin. Put `email` and `token` in the fragment, not the query string, to keep secrets out of HTTP access logs. The entry captures valid link credentials in memory and replaces the address with `/#/auth/link` before rendering. The landing offers Open in app and Continue in browser. Refresh after capture requires reopening the original invitation. Never include invitation URLs in analytics, screenshots or diagnostic reports.

The fallback is `inventory://auth/reset#email=...&token=...` (or `/invitation`). Links are inputs, not authentication: the existing API validates tokens and controls account access. Reset preflight is `POST /api/v1/auth/password/status`; final reset still atomically revalidates the code and revokes sessions and offline grants. Codes expire after the existing 30-minute policy. A reset form requires confirmation and shows length guidance, not an invented cryptographic strength score.

Only trusted operators issue recovery codes. No email, SMS or automatic administrator notification is configured, and Forgot password explicitly says no request was sent. Do not describe a successful delivery without a provider and verified delivery.

## Deployment configuration

Inspection found no usable production hostname: the production examples contain `.invalid` placeholders. No hostname has been invented. Set `VITE_APP_ORIGIN` and `EXPO_PUBLIC_APP_ORIGIN` to the **existing real production web HTTPS origin** when supplied by the deployment owner. This is the link host, not the API origin. Expo rejects placeholders, credentials and non-origin paths.

- Expo `app.config.ts` adds iOS associated domains and Android verified VIEW filters for `/auth/` only when that origin is configured. `app.json` always declares the `inventory` scheme. Rebuild the native app when changing link configuration; Expo Go cannot register the application's scheme.
- Publish `/.well-known/apple-app-site-association` with the signing team and `com.inventoryfoundation.app`, restricting paths to `/auth/*`. Publish `/.well-known/assetlinks.json` with that Android package and the actual release certificate SHA-256 fingerprints. Serve both over the configured HTTPS domain with appropriate content type and no redirect. Signing identifiers/certificates are deployment inputs, not fabricated fixtures.
- Tauri installs the deep-link and single-instance plugins. The single-instance plugin is registered first, with its deep-link feature. A second launch focuses the existing main window. The web frontend subscribes to open events and reads initial URLs; only validated invitation/recovery destinations are accepted. Arguments and tokens are never logged.
- Desktop scheme association is installed with the packaged application. Windows installer and macOS installed-bundle link handling require separate qualification; `tauri dev` alone does not prove installation registration.
- Configure the web host to serve its SPA entry for `/auth/*`; hash routes continue to work without rewrites. Set a restrictive referrer policy and avoid analytics on credential landing pages.

References: [Expo links into your app](https://docs.expo.dev/linking/into-your-app/), [Tauri deep linking](https://v2.tauri.app/plugin/deep-linking/), [Tauri single instance](https://v2.tauri.app/plugin/single-instance/).

Prepared-register access remains separate from authentication: web `/#/offline` and installed native `inventory://offline` open only an existing encrypted register. Setup remains in Settings → Device & Offline. Scheme registration is an installation prerequisite on desktop; Expo Go does not register the application scheme.
