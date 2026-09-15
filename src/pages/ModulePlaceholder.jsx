import { Container } from "../components/ui/Container.jsx";
import { Card } from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";

/**
 * Stands in for a module the navigation lists but Phase 3 has not reached yet.
 *
 * The alternative — leaving these routes to fall through to the 404 page — makes
 * the navigation look broken and makes the role filtering impossible to check,
 * since every link would land on the same page whatever the capability.
 */
export function ModulePlaceholder({ label, issue }) {
  return (
    <Container as="main" className="py-8">
      <h1 className="text-2xl font-semibold text-ink">{label}</h1>
      <Card className="mt-6">
        <EmptyState
          icon="boxes"
          title="Not built yet"
          description={
            issue
              ? `This screen is delivered by ${issue}. Your role has access to it.`
              : "This screen is not available yet."
          }
        />
      </Card>
    </Container>
  );
}
