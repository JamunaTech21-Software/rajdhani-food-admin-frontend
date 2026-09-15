# `src/shared`

Code written to be shared between the admin dashboard and the customer site.

## Why it is vendored here

It used to live at `frontend/shared/`, aliased in from outside the app. That
stopped working when the admin dashboard became **its own repository**
(`rajdhani-food-admin-frontend`) deployed from its own root: a build on Vercel
has no parent directory to reach into, so every `@shared` import would fail.

So it lives inside `src/` and the `@shared` alias points here. This app builds
standalone, which is the property that matters for deployment.

## The cost, stated plainly

When the customer site is built (Phase 4), it will need the same theme tokens,
colour maths and API client. With the two apps in separate repositories, it gets
a **copy**, and the two can drift.

The fix at that point is to publish this directory as a small private package
that both apps depend on, rather than letting two copies diverge quietly. It is
not worth doing for one consumer; it becomes worth doing for two.

Until then: **a change here must be mirrored into the customer app.**

## Contents

| Path | Purpose |
|---|---|
| `theme/tokens.css` | Tailwind v4 `@theme` block — the whole palette, type and form scale |
| `theme/color.js` | sRGB ↔ OKLab conversion, shade derivation, WCAG contrast |
| `theme/applyTheme.js` | `site_profile` colours → CSS custom properties (acceptance §18.2) |
| `api/client.js` | fetch wrapper: §9.1 envelope, list normalisation, 401 refresh replay |
| `api/errors.js` | `ApiError` and the §9.1 error-code vocabulary |

## Keep it dependency-free where you can

`theme/` and `api/` import nothing. That is worth preserving — it is what let
these files move between projects without dragging a dependency tree along, and
what would make packaging them straightforward.
