import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * RTPP-55's audit, as tests rather than as a one-off sweep.
 *
 * The ticket says "audited across all screens before Phase 3 sign-off". An audit
 * done by reading is true for an afternoon; these run on every commit, so the
 * twentieth screen cannot quietly skip what the first nineteen do.
 */

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

// Comments are stripped everywhere below: a comment explaining why a rule
// exists must not read as a violation of it.
const strip = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const files = walk(SRC).map((path) => ({
  path: relative(SRC, path).replaceAll("\\", "/"),
  source: strip(readFileSync(path, "utf8")),
}));

const find = (name) => files.find((f) => f.path.endsWith(name));

// ── 1. Confirmation on every destructive action ────────────────────────────

test("every screen that deletes also confirms first", () => {
  // A hook may delete without confirming — its calling component does that.
  // Hooks are excluded by name, and their callers are checked separately.
  const offenders = files
    .filter((f) => /api\.delete\(/.test(f.source))
    .filter((f) => !/\/use[A-Z]/.test(`/${f.path.split("/").pop()}`))
    .filter((f) => !/useConfirm/.test(f.source))
    .map((f) => f.path);

  assert.deepEqual(offenders, [], "these delete without a confirmation dialog");
});

test("the hook that deletes is only used by a component that confirms", () => {
  const hook = find("modules/sections/useSortableResource.js");
  assert.match(hook.source, /api\.delete\(/, "the exclusion above still applies to this file");

  const caller = find("modules/sections/SectionManager.jsx");
  assert.match(caller.source, /useConfirm/);
  assert.match(caller.source, /if \(confirmed\) remove\.mutate/);
});

test("the permanent media delete is confirmed — it is the one with no undo", () => {
  // It removes the file from Cloudinary too. This fired straight from its
  // click handler until RTPP-55.
  const drawer = find("modules/media/MediaDetailDrawer.jsx");

  assert.match(drawer.source, /onClick=\{handleDelete\}/, "not remove.mutate() direct from the click");
  assert.match(drawer.source, /const confirmed = await confirm\(/);
  assert.match(drawer.source, /cannot be undone/i);
});

// ── 2. Unsaved-changes guard ───────────────────────────────────────────────

test("no form uses window.confirm as its guard", () => {
  // It is unstyled, it blocks the main thread, and a browser can suppress it
  // entirely once a user ticks "prevent this page from creating more dialogs"
  // — at which point the guard silently stops existing.
  const offenders = files
    .filter((f) => /window\.confirm\(/.test(f.source))
    .map((f) => f.path);

  assert.deepEqual(offenders, []);
});

test("every dialog holding a form guards it on close", () => {
  const dialogForms = files.filter(
    (f) => /Dialog\.Root/.test(f.source) && /useForm\(/.test(f.source),
  );

  assert.ok(dialogForms.length >= 8, `expected the known dialog forms, found ${dialogForms.length}`);

  for (const file of dialogForms) {
    assert.match(file.source, /useDialogGuard/, `${file.path} can be closed with unsaved work`);
  }
});

test("every form that owns a route guards navigation and page unload", () => {
  const pageForms = files.filter(
    (f) => /useForm\(/.test(f.source) && !/Dialog\.Root/.test(f.source) && f.path.includes("FormPage"),
  );

  assert.ok(pageForms.length >= 2, "expected the product and news form pages");

  for (const file of pageForms) {
    assert.match(file.source, /useUnsavedGuard/, `${file.path} loses work on navigation`);
  }
});

test("the route guard covers leaving the site, not only in-app navigation", () => {
  // useBlocker never sees a closed tab or a typed URL.
  const hook = find("hooks/useUnsavedGuard.js");

  assert.match(hook.source, /useBlocker/);
  assert.match(hook.source, /addEventListener\("beforeunload"/);
  assert.match(hook.source, /removeEventListener\("beforeunload"/, "and cleans up after itself");
});

// ── 3. Toasts on success and failure ───────────────────────────────────────

test("every mutation handles its own failure", () => {
  const offenders = files
    .filter((f) => /useMutation\(\{/.test(f.source))
    .filter((f) => {
      const mutations = (f.source.match(/useMutation\(\{/g) ?? []).length;
      const handlers = (f.source.match(/onError:/g) ?? []).length;
      return handlers < mutations;
    })
    .map((f) => f.path);

  assert.deepEqual(offenders, [], "a mutation here can fail silently");
});

test("a failure reaches the user, not only the console", () => {
  const offenders = files
    .filter((f) => /useMutation\(\{/.test(f.source))
    // Forms that map field errors onto inputs are showing the failure that way.
    .filter((f) => !/toast\.(error|warning)/.test(f.source) && !/setError\(/.test(f.source))
    .map((f) => f.path);

  assert.deepEqual(offenders, []);
});

// ── 4. Optimistic updates roll back ────────────────────────────────────────

test("every optimistic update restores the previous data on failure", () => {
  // Without this the screen keeps showing an order the server rejected, which
  // is worse than never having moved — the user believes it saved.
  const optimistic = files.filter((f) => /onMutate:/.test(f.source));

  assert.ok(optimistic.length >= 6, `expected the known reorder screens, found ${optimistic.length}`);

  for (const file of optimistic) {
    assert.match(file.source, /context\?\.previous/, `${file.path} does not roll back`);
    assert.match(file.source, /cancelQueries/, `${file.path} races an in-flight refetch`);
    assert.match(file.source, /onSettled:/, `${file.path} never reconciles with the server`);
  }
});

// ── 5. Server-side pagination ──────────────────────────────────────────────

test("no table sorts or paginates client-side", () => {
  // §11 requires server-side paging. A client row model over one page of 20
  // would sort that page and call the whole table sorted.
  const table = find("components/data/DataTable.jsx");

  assert.match(table.source, /getCoreRowModel/);
  for (const model of ["getPaginationRowModel", "getSortedRowModel", "getFilteredRowModel"]) {
    assert.doesNotMatch(table.source, new RegExp(model), `${model} would page or sort in the browser`);
  }
});

test("a capped list says when it is showing only part of the data", () => {
  // A few screens fetch a high fixed limit so drag-ordering has every row.
  // That is a trade, not a bug — but it must not fail silently.
  const capped = files.filter((f) => /limit: (100|200)\b/.test(f.source) && /SortableList/.test(f.source));

  assert.ok(capped.length >= 2, `expected the capped reorder screens, found ${capped.length}`);

  for (const file of capped) {
    assert.match(file.source, /TruncationNotice/, `${file.path} truncates without saying so`);
  }
});

test("the truncation notice only appears when something is actually hidden", () => {
  const notice = find("components/data/TruncationNotice.jsx");
  assert.match(notice.source, /if \(!total \|\| !shown \|\| total <= shown\) return null/);
});

// ── 6. "View on site" ──────────────────────────────────────────────────────

test("public URLs are built in one place, not inline per screen", () => {
  // They were written as template literals in five screens, so a customer-side
  // route change had to be found five times.
  const offenders = files
    .filter((f) => !f.path.endsWith("lib/publicUrl.js"))
    .filter((f) => /\$\{SITE_URL\}/.test(f.source))
    .map((f) => f.path);

  assert.deepEqual(offenders, []);
});

test("every screen with a public counterpart links to it", () => {
  for (const path of [
    "modules/products/ProductsPage.jsx",
    "modules/products/ProductFormPage.jsx",
    "modules/news/NewsPage.jsx",
    "modules/news/NewsFormPage.jsx",
    "modules/page-content/PageContentPage.jsx",
    "modules/downloads/DownloadsPage.jsx",
  ]) {
    assert.match(find(path).source, /ViewOnSiteLink/, `${path} has no "View on site"`);
  }
});

test("the link is withheld when there is nothing live to view", () => {
  // A link to an unpublished row 404s, and tells an editor it is live.
  const link = find("components/ui/ViewOnSiteLink.jsx");

  assert.match(link.source, /if \(!href\) return null/);
  assert.match(link.source, /rel="noopener noreferrer"/);
  assert.match(link.source, /target="_blank"/);
});

test("each resource decides for itself what counts as live", () => {
  // News is published *and* past its scheduled date; a product is simply
  // PUBLISHED; a download needs a file behind it. One shared guess would be
  // wrong for at least two of them.
  const news = find("modules/news/NewsPage.jsx");
  const products = find("modules/products/ProductsPage.jsx");
  const downloads = find("modules/downloads/DownloadsPage.jsx");

  assert.match(news.source, /visible=\{isPubliclyVisible\(row\.original, now\)\}/);
  assert.match(products.source, /visible=\{row\.original\.status === "PUBLISHED"\}/);
  assert.match(downloads.source, /Boolean\(row\.original\.file\)/);
});
