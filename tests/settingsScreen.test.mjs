import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { NAV_ITEMS, PLACEHOLDER_ITEMS } from "../src/components/layout/nav-config.js";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((path) => ({
  path: relative(SRC, path).replaceAll("\\", "/"),
  source: readFileSync(path, "utf8"),
}));

const find = (name) => files.find((f) => f.path.endsWith(name));

const profileHook = find("modules/settings/useSiteProfile.js");
const page = find("modules/settings/SettingsPage.jsx");
const menus = find("modules/settings/tabs/MenusTab.jsx");
const router = find("routes/router.jsx");

test("the Settings screen is wired, not a placeholder", () => {
  const item = NAV_ITEMS.find((i) => i.to === "/settings");

  assert.ok(item, "the nav still lists Settings");
  assert.equal(item.issue, undefined, "an `issue` routes the link to a placeholder instead");
  assert.match(router.source, /path: "\/settings", element: <SettingsPage \/>/);
});

test("Settings is gated on the capability only a Super Admin holds", () => {
  // §7.3 grants `settings` to Super Admin alone. The API enforces it too; this
  // only spares an Editor a screen that would 403 on every request.
  assert.match(router.source, /capability="settings" minimum="write"/);
});

test("a colour change repaints without a reload", () => {
  // RTPP-52's first acceptance criterion. The dashboard re-themes itself the
  // moment the save succeeds; the customer site reads the same row on its next
  // /public/layout. Neither involves a deploy.
  assert.match(profileHook.source, /import \{ applyTheme \}/);
  assert.match(profileHook.source, /themeChanged/);
  assert.match(profileHook.source, /if \(themeChanged\) \{\s*applyTheme\(/);
});

test("the theme fields that trigger a repaint are the ones the API stores", () => {
  assert.match(
    profileHook.source,
    /THEME_FIELDS = \["primary_color", "secondary_color", "accent_color"\]/,
  );
});

test("nothing can create a second site profile", () => {
  // The third acceptance criterion. The API exposes only GET and PATCH on the
  // singleton; the UI must not offer a POST the API would refuse anyway.
  const posts = files
    .filter((f) => /api\.post\(\s*["'`]\/admin\/site-profile/.test(f.source))
    .map((f) => f.path);

  assert.deepEqual(posts, [], "site-profile is a singleton — PATCH only");
  assert.match(profileHook.source, /api\.patch\("\/admin\/site-profile"/);
});

test("only changed fields are sent, so one editor does not clobber another", () => {
  // PATCH takes minProperties: 1 and "only the fields you are changing".
  assert.match(profileHook.source, /changedFields\(initial, values\)/);
  assert.match(profileHook.source, /const body = changedFields/);
});

test("menu edits invalidate the cache they came from", () => {
  // The second criterion is that menu edits are live on the next fetch. On the
  // customer side that is the backend's business; here it means this screen
  // must not keep showing a stale list after an edit.
  assert.match(menus.source, /invalidateQueries\(\{ queryKey: QUERY_KEY \}\)/);
  assert.match(menus.source, /QUERY_KEY = \["admin", "menu-links"\]/);
});

test("the three tabs that share the profile row share one save", () => {
  // A Save per tab would be four requests to change four related things, each
  // sending values its own tab loaded and overwriting the others.
  assert.match(page.source, /PROFILE_TABS = new Set\(\["brand", "contact", "seo"\]\)/);
  assert.match(page.source, /showSaveBar = PROFILE_TABS\.has\(tab\)/);
});

test("settings are saved through the endpoint that takes key/value pairs", () => {
  const system = find("modules/settings/tabs/SystemTab.jsx");

  assert.match(system.source, /api\.put\("\/admin\/settings", \{ settings: changed \}\)/);
  assert.match(system.source, /changedSettings\(initial, values\)/, "only what changed");
});

test("no screen still tells the user Settings is unbuilt", () => {
  // Scoped to notices, not mentions: a comment citing RTPP-52 to explain *why*
  // the code does something is documentation. A user-facing "coming in RTPP-52"
  // would be a lie now that the screen exists.
  const offenders = files
    .filter((f) => /(coming|blocked|not yet|unavailable)[^\n]*RTPP-52|RTPP-52[^\n]*(coming|blocked|not yet)/i.test(f.source))
    .map((f) => f.path);

  assert.deepEqual(offenders, []);
});

test("Settings no longer routes to the placeholder", () => {


  assert.ok(
    !PLACEHOLDER_ITEMS.some((item) => item.to === "/settings"),
    "a placeholder entry would shadow the real screen",
  );
});
