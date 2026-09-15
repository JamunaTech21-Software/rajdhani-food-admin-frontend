# Deploying the admin dashboard to Vercel

This repository is the deployable unit. Its root is the Vite project root, so
Vercel needs no monorepo settings.

## 1. Set two environment variables

In **Project → Settings → Environment Variables**, for every environment you
build (Production, Preview, and Development if you use it):

| Name | Value | Purpose |
|---|---|---|
| `VITE_BASE_URL` | the API origin **including `/api/v1`** | Every request goes here |
| `VITE_SITE_URL` | the public customer site origin | The "View on site" links |

Set these **in the Vercel dashboard**, not in a file. `.env.local` is gitignored
(`*.local`), so it is never pushed and Vercel never sees it — it configures your
machine only.

If the `VITE_` prefix is a problem, the name is negotiable. Vite only
auto-exposes `VITE_` variables to the browser, but the *build* can read any
variable Vercel sets, so `vite.config.js` accepts the first of these it finds and
maps it to one client-side value:

| Purpose | Accepted names, most specific first |
|---|---|
| API origin | `VITE_BASE_URL`, `VITE_API_BASE_URL`, `API_BASE_URL`, `BASE_URL` |
| Customer site | `VITE_SITE_URL`, `SITE_URL` |

The build log says which one it used — `[env] API base URL from BASE_URL=…` — or
warns that none were set and it is falling back to localhost. Check that line in
the Vercel build output after changing a variable.

Only `VITE_`-prefixed variables reach the browser, and **everything that reaches
the browser is public** — it is compiled into the JavaScript bundle. Neither of
these is a secret, which is why they are the only two. Nothing else belongs
here: in particular the Cloudinary API secret is a *backend* value and must
never appear in this project.

One name is reserved on the **client** side: never make `src/config.js` read
`import.meta.env.BASE_URL`. Vite defines that itself as the app's public base
path (`/`), so it would resolve to the built-in rather than anything you set —
and because `/` is a valid string, nothing errors. The app would build, deploy,
and send every request to its own origin. `tests/envNames.test.mjs` fails if that
name ever reappears in client code.

Setting `BASE_URL` in the Vercel dashboard is fine and unrelated: that is an
ordinary build-time variable, which `vite.config.js` reads and maps to
`VITE_BASE_URL` before the browser ever sees it.

Vite reads these **at build time**, not at runtime. Changing one in Vercel has
no effect until you redeploy.

## 2. Add the Vercel domain to the API's CORS allowlist — this one blocks everything

The API rejects any origin not on its allowlist. Checked on 2026-09-15:

```
https://admin.rajdhanifood.com                    allowed
http://localhost:5173                             allowed  (the customer site)
http://localhost:5174                             allowed  (this dashboard)
https://<anything>.vercel.app                     BLOCKED
```

The dev server runs on **5174**, matching the API's `ADMIN_URL`. That is the
origin it builds invite and password-reset links against, so a dashboard on 5173
would receive emailed links pointing at a port it is not serving.

A blocked origin gets **no `Access-Control-Allow-Origin` header at all**, which
means the deployed dashboard will load, render its shell, and then fail every
single request — with nothing in the API logs and only a CORS error in the
browser console. It looks like the front end is broken when it is not.

So before the first deploy is useful, the backend's `CORS_ORIGINS` needs the
Vercel domain added. Note that **preview deployments get a different hostname
per commit**, so either add the production domain only and accept that previews
cannot reach the API, or have the backend allow the `*.vercel.app` preview
pattern deliberately.

Once a custom domain (`admin.rajdhanifood.com`) is pointed at this project, that
origin is already allowed and the problem goes away for production.

## 3. What `vercel.json` already handles

* **SPA routing.** Every path falls back to `index.html`, so a deep link like
  `/products/01M2…` resolves instead of 404ing. Vercel serves real files first,
  so hashed assets are unaffected.
* **`X-Robots-Tag: noindex, nofollow, noarchive`.** A dashboard on a public
  `.vercel.app` hostname would otherwise be indexable. The `<meta>` tag in
  `index.html` says the same thing; the header also covers non-HTML responses.
* **`X-Frame-Options: DENY`** — stricter than the customer site's `SAMEORIGIN`,
  because nothing should ever frame an admin panel.
* **Immutable caching** for `/assets/*`, which Vite fingerprints.

### What it deliberately does not set

There is **no `Content-Security-Policy`** here yet, unlike
`deploy/frontend.htaccess` in the monorepo. A CSP must name the API origin in
`connect-src`, and that origin is currently a Cloudflare tunnel whose hostname
changes every restart. A CSP naming the wrong origin does not warn — it silently
blocks every request, which is the same failure as the CORS one above and just
as confusing to diagnose.

Add it once the API is on a stable hostname. The policy in
`deploy/frontend.htaccess` is the starting point; for the admin it needs
Cloudinary (`img-src`), Google Fonts (`style-src`, `font-src`) and the API
(`connect-src`), and does **not** need Google Identity — that is customer
sign-in, not admin.

## 4. Build settings

Vercel detects Vite from `vercel.json`. For reference:

* Build command `npm run build`
* Output directory `dist`
* Install command `npm install`
* Node 20 or 22 — the build uses no version-specific features

## 5. Worth knowing before the first deploy

The dashboard is **not usable without a working API**. Sign-in posts to
`/auth/admin/login`, and the session is restored from an `HttpOnly` refresh
cookie. That cookie is issued by the API with `SameSite=None; Secure`, so it
requires HTTPS on both ends — which Vercel provides — *and* the API's cookie
`Domain` must be compatible with the origin the dashboard is served from. On a
`.vercel.app` hostname it will not be. This is a second reason a custom
subdomain is the real target, and `.vercel.app` is only good for checking that
the build and the static shell render.
