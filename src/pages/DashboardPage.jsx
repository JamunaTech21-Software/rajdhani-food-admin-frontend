import { useQuery } from "@tanstack/react-query";

import { api, logout } from "../lib/api.js";
import { useAuthStore } from "../stores/authStore.js";
import { Button } from "../components/ui/Button.jsx";
import { useConfirm } from "../components/ui/confirm-context.js";
import { useToast } from "../components/ui/toast-context.js";

// Placeholder. The summary cards, submissions chart, recent leads and review
// queue are RTPP-40; the sidebar and role-based navigation are RTPP-39.
export function DashboardPage() {
  const admin = useAuthStore((s) => s.admin);
  const confirm = useConfirm();
  const toast = useToast();

  const { data, isPending, isError } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => api.get("/auth/admin/me"),
  });

  const profile = data ?? admin;

  async function handleSignOut() {
    const ok = await confirm({
      title: "Sign out?",
      description: "You will need your password to sign back in.",
      confirmLabel: "Sign out",
      tone: "danger",
    });
    if (!ok) return;
    await logout();
    toast.success("Signed out");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow uppercase text-brand">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {isPending ? "Loading…" : (profile?.name ?? "Signed in")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {profile?.email} · {profile?.role}
          </p>
        </div>
        <Button variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      {isError ? (
        <p className="mt-8 rounded-md bg-danger-tint p-4 text-sm text-danger">
          Could not load your profile.
        </p>
      ) : null}

      <section className="mt-8 rounded-lg bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">Your permissions</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The §7.3 matrix row returned by the API. RTPP-39 uses it to build the navigation.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(profile?.permissions ?? {}).map(([capability, level]) => (
            <li
              key={capability}
              className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm"
            >
              <span className="text-ink-muted">{capability.replaceAll("_", " ")}</span>
              <span className="font-medium text-brand">{level}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
