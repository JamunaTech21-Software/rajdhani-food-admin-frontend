import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4">
      <div className="text-center">
        <p className="text-eyebrow uppercase text-brand">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">This page does not exist</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The link may be out of date, or the item may have been removed.
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
