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
export function ModulePlaceholder({ label, issue, blockedOn }) {
  // "Waiting on the backend" and "not started" are different things, and an
  // admin chasing a missing feature deserves to know which one this is.
  const description = blockedOn
    ? `This screen is waiting on ${blockedOn}. It will work as soon as that lands — nothing is missing on this side.`
    : issue
      ? `This screen is delivered by ${issue}. Your role has access to it.`
      : "This screen is not available yet.";

  return (
    <Container as="main" className="py-8">
      <h1 className="text-2xl font-semibold text-ink">{label}</h1>
      <Card className="mt-6">
        <EmptyState icon="boxes" title={blockedOn ? "Waiting on the API" : "Not built yet"} description={description} />
      </Card>
    </Container>
  );
}
