import { Link } from "react-router";

export function ForbiddenPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4">
      <div className="max-w-md text-center">
        <p className="text-eyebrow uppercase text-brand">Error 403</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">You do not have access</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your role does not include this area. If you think that is wrong, ask a Super Admin to
          review your permissions.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-dark"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
