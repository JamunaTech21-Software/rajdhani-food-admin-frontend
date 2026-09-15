import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Link } from "react-router";

import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { ErrorState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useNow } from "../../hooks/useNow.js";
import { api } from "../../lib/api.js";
import { useAuthStore, useCan } from "../../stores/authStore.js";
import { PendingReviews } from "./PendingReviews.jsx";
import { RecentLeads } from "./RecentLeads.jsx";
import { SummaryCards } from "./SummaryCards.jsx";

// Recharts is ~390 kB — nearly half the bundle for one panel on one page.
// Split out, it never reaches the login screen or any other route.
const SubmissionsChart = lazy(() =>
  import("./SubmissionsChart.jsx").then((m) => ({ default: m.SubmissionsChart })),
);

const ViewAll = ({ to }) => (
  <Link to={to} className="text-sm font-medium text-brand hover:text-brand-dark">
    View all
  </Link>
);

export function DashboardPage() {
  const admin = useAuthStore((s) => s.admin);
  const canModerateReviews = useCan("reviews");
  const now = useNow();

  const summary = useQuery({
    queryKey: ["admin", "dashboard", "summary"],
    queryFn: () => api.get("/admin/dashboard/summary"),
  });

  // Sales holds no REVIEWS capability, so this request would be a guaranteed
  // 403. Not firing it is the difference between an empty panel and an error.
  const reviews = useQuery({
    queryKey: ["admin", "reviews", { status: "PENDING", limit: 5 }],
    queryFn: () => api.list("/admin/reviews", { params: { status: "PENDING", limit: 5 } }),
    enabled: canModerateReviews,
  });

  const firstName = admin?.name?.split(" ")[0];

  return (
    <Container as="main" className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">
          {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Everything waiting on you across enquiries, applications and content.
        </p>
      </header>

      {summary.isError ? (
        <Card>
          <ErrorState
            title="Could not load the dashboard"
            description="The summary could not be fetched. This is usually temporary."
            action={
              <Button variant="secondary" onClick={() => summary.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <SummaryCards counts={summary.data?.counts} isPending={summary.isPending} />
      )}

      <Card className="mt-6">
        <CardHeader
          title="Submissions"
          description="Enquiries, dealer applications and contact messages over the last 30 days."
        />
        <div className="p-5">
          {summary.isPending ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <Suspense fallback={<Skeleton className="h-[260px] w-full" />}>
              <SubmissionsChart data={summary.data?.chart ?? []} />
            </Suspense>
          )}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent leads" action={<ViewAll to="/enquiries" />} />
          <RecentLeads
            leads={summary.data?.recent_leads}
            isPending={summary.isPending}
            now={now}
          />
        </Card>

        {canModerateReviews ? (
          <Card>
            <CardHeader title="Awaiting moderation" action={<ViewAll to="/reviews" />} />
            {reviews.isError ? (
              <ErrorState
                title="Could not load reviews"
                action={
                  <Button variant="secondary" onClick={() => reviews.refetch()}>
                    Try again
                  </Button>
                }
              />
            ) : (
              <PendingReviews
                reviews={reviews.data?.items}
                isPending={reviews.isPending}
                now={now}
              />
            )}
          </Card>
        ) : null}
      </div>
    </Container>
  );
}
