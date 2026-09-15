import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { NAV_ITEMS } from "../src/components/layout/nav-config.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const page = read("src/pages/AcceptInvitePage.jsx");
const router = read("src/routes/router.jsx");
const backendRoutes = readFileSync(
  fileURLToPath(new URL("../../../backend/api/routes/auth.php", import.meta.url)),
  "utf8",
);

test("the invite endpoints this screen calls are actually registered", () => {
  // Unlike /admin/users, these exist: routes/auth.php registers both, and a
  // request to the first returns "This invitation is not valid or has already
  // been used" — the controller running, not a missing route.
  assert.match(backendRoutes, /\$r->get\('\/admin\/invite\/:token'/);
  assert.match(backendRoutes, /\$r->post\('\/admin\/invite\/:token\/accept'/);

  assert.match(page, /\/auth\/admin\/invite\/\$\{encodeURIComponent\(token\)\}`/);
  assert.match(page, /\/auth\/admin\/invite\/\$\{encodeURIComponent\(token\)\}\/accept`/);
});

test("the screen is reachable without a session", () => {
  // An invitee has no account yet, so this cannot sit behind the session guard.
  const publicRoutes = router.slice(
    router.indexOf("createBrowserRouter(["),
    router.indexOf("element: <ProtectedRoute />"),
  );

  assert.match(publicRoutes, /path: "\/accept-invite", element: <AcceptInvitePage \/>/);
});

test("both invite calls are made unauthenticated", () => {
  // Sending a stale access token here would trigger the client's refresh-and-
  // replay path on a 401 and rotate a token family that has nothing to do with
  // this request.
  const calls = [...page.matchAll(/api\.(get|post)\([^;]*?\{ auth: false \}/gs)];
  assert.equal(calls.length, 2, "both the validate and the accept call pass auth: false");
});

test("the token is checked before a password is asked for", () => {
  // Otherwise someone types a password into a form that is going to throw it
  // away, and only then learns the link expired.
  const validateAt = page.indexOf("const invite = useQuery");
  const formAt = page.indexOf('<Field\n          label="New password"');

  assert.ok(validateAt > -1 && formAt > -1);
  assert.ok(validateAt < formAt, "the query runs before the form renders");
  assert.match(page, /if \(invite\.isError\)/, "an unusable invite replaces the form entirely");
  assert.match(page, /if \(invite\.isPending\)/);
});

test("a missing token is handled separately from an invalid one", () => {
  // "You pasted half a link" and "this invite expired" need different advice.
  assert.match(page, /if \(!token\)/);
  assert.match(page, /This link is incomplete/);
  assert.match(page, /This invitation cannot be used/);
});

test("the policy is previewed against the shared rules, not re-implemented", () => {
  assert.match(page, /import \{ isPolicyCompliant \} from "\.\.\/lib\/passwordPolicy\.js"/);
  assert.doesNotMatch(page, /\\p\{Lu\}/, "no second copy of the rules");
  assert.doesNotMatch(page, /minLength\(10\)/, "the length lives in passwordPolicy.js");
});

test("every policy failure the API returns is shown, not just the last", () => {
  // The API answers with all unmet rules at once, each against `password`.
  // Calling setError per message would leave only the final one visible.
  assert.match(page, /\.filter\(\(d\) => d\.field === "password"\)/);
  assert.match(page, /messages\.join\("\. "\)/);
});

test("accepting signs the invitee in and clears anything cached", () => {
  // The API returns a session; a previous admin's cached queries must not
  // survive into it.
  assert.match(page, /queryClient\.clear\(\)/);
  assert.match(page, /setSession\(session\)/);
  assert.match(page, /navigate\("\/", \{ replace: true \}\)/);
});

test("the admin-user management screen still says it is blocked, and why", () => {
  // The other half of RTPP-53. /admin/users answers "No route matches this
  // path", so the placeholder must stay — but say what is missing rather than
  // claiming the screen was never started.
  const users = NAV_ITEMS.find((i) => i.to === "/users");

  assert.ok(users, "Admin users is still listed");
  assert.equal(users.issue, "RTPP-53");
  assert.match(users.blockedOn, /\/admin\/users/, "names the endpoint it waits on");
  assert.match(router, /blockedOn=\{blockedOn\}/, "and the placeholder receives it");
});
