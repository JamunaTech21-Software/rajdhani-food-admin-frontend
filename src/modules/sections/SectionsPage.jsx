import * as Tabs from "@radix-ui/react-tabs";
import { useSearchParams } from "react-router";

import { Container } from "../../components/ui/Container.jsx";
import { cn } from "../../lib/cn.js";
import { RESOURCES, resourceById } from "./resources.jsx";
import { SectionManager } from "./SectionManager.jsx";

export function SectionsPage() {
  const [params, setParams] = useSearchParams();
  const active = resourceById(params.get("tab"));

  return (
    <Container as="main" className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Sections</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The repeating pieces that make up the page sections — cards, timelines, counters, marks
          and quotes.
        </p>
      </header>

      <Tabs.Root
        value={active.id}
        onValueChange={(id) => setParams({ tab: id }, { replace: true })}
      >
        <Tabs.List
          aria-label="Section types"
          className="mb-6 flex gap-1 overflow-x-auto border-b border-line"
        >
          {RESOURCES.map((resource) => (
            <Tabs.Trigger
              key={resource.id}
              value={resource.id}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors duration-(--duration-fast)",
                "border-transparent text-ink-muted hover:text-ink",
                "data-[state=active]:border-brand data-[state=active]:text-brand",
              )}
            >
              {resource.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {RESOURCES.map((resource) => (
          <Tabs.Content key={resource.id} value={resource.id}>
            {/* Keyed so switching tabs resets the scope selector and any open
                row state, rather than carrying one resource's scope into another. */}
            <SectionManager key={resource.id} resource={resource} />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Container>
  );
}
