import { useQuery } from "@tanstack/react-query";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Pagination } from "../../components/data/Pagination.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { Field, Select } from "../../components/ui/Field.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { formatDateTime } from "../../lib/format.js";
import { hasDiff } from "./auditDiff.js";
import {
  ACTIONS,
  actionLabel,
  actionTone,
  RESOURCE_GROUPS,
  resourceLabel,
  toActionFilter,
} from "./auditVocabulary.js";
import { DiffPanel } from "./DiffPanel.jsx";

const LIMIT = 25;

const EMPTY_FILTERS = { resource: "", verb: "", actor: "", from: "", to: "" };

function Row({ entry, expanded, onToggle }) {
  const expandable = hasDiff(entry);

  return (
    <li className="border-b border-line last:border-0">
      <div className="flex flex-wrap items-start gap-3 px-5 py-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!expandable}
          aria-expanded={expandable ? expanded : undefined}
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md",
            expandable
              ? "text-ink-subtle hover:bg-ground hover:text-ink"
              : "cursor-default text-ink-subtle/40",
          )}
          aria-label={expandable ? (expanded ? "Hide changes" : "Show changes") : "No changes recorded"}
        >
          <ChevronDown
            size={15}
            strokeWidth={2}
            aria-hidden="true"
            className={cn("transition-transform duration-(--duration-fast)", expanded && "rotate-180")}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={actionTone(entry.action)}>{actionLabel(entry.action)}</Badge>
            <span className="text-sm font-medium text-ink">{resourceLabel(entry.entity_type)}</span>
            {entry.entity_id ? (
              <code className="truncate text-xs text-ink-subtle">{entry.entity_id}</code>
            ) : null}
          </div>

          <p className="mt-0.5 text-sm text-ink-muted">
            {/* admin_name is null once an account is deleted — the trail has to
                outlive the person, so it says so rather than showing nothing. */}
            {entry.admin_name ?? <span className="italic">A removed admin</span>}
            {entry.admin_email ? <span className="text-ink-subtle"> · {entry.admin_email}</span> : null}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm text-ink">{formatDateTime(entry.created_at)}</p>
          {entry.ip_address ? (
            <p className="text-xs text-ink-subtle">{entry.ip_address}</p>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-line bg-ground/50">
          <DiffPanel entry={entry} />
        </div>
      ) : null}
    </li>
  );
}

/**
 * The activity trail (§13).
 *
 * The question this screen exists to answer is RTPP-54's acceptance criterion:
 * "who changed this product description last Tuesday, and what did it say".
 * That shapes the filters — resource, actor and a date range — and the
 * expandable diff, which has to show the old text, not that a change happened.
 */
export function AuditLogPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  // `action` is matched exactly against `resource.verb`, so a verb only becomes
  // a filter once a resource is chosen. Filtering by "every delete everywhere"
  // is not something the endpoint can express.
  const action = toActionFilter(filters.resource, filters.verb);

  const params = {
    page,
    limit: LIMIT,
    resource: filters.resource || undefined,
    action: action || undefined,
    actor: filters.actor || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin", "audit-logs", params],
    queryFn: () => api.list("/admin/audit-logs", { params }),
    placeholderData: (previous) => previous,
  });

  const entries = data?.items ?? [];

  function setFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1); // a filtered page 3 of the old result set is meaningless
    setExpandedId(null);
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setExpandedId(null);
  }

  const isFiltered = Object.values(filters).some(Boolean);

  // Actors are offered from what is on screen: there is no endpoint listing
  // admins (/admin/users does not exist yet — RTPP-53), so this is the only
  // honest source. The selected one is kept even when filtered out of view.
  const actors = new Map();
  for (const entry of entries) {
    if (entry.admin_id) actors.set(entry.admin_id, entry.admin_name ?? entry.admin_email ?? entry.admin_id);
  }
  if (filters.actor && !actors.has(filters.actor)) actors.set(filters.actor, "Selected admin");

  if (isError) {
    return (
      <Container as="main" className="py-8">
        <Card>
          <ErrorState
            title="Could not load the audit log"
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  return (
    <Container as="main" className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Audit log</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Every change any admin has made, newest first. Expand a row to see exactly which fields
          moved and what they held before.
        </p>
      </header>

      <Card className="mb-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Resource"
            value={filters.resource}
            onChange={(event) => {
              const resource = event.target.value;
              setFilters((current) => ({
                ...current,
                resource,
                // The old verb belonged to the old resource's action string.
                verb: resource ? current.verb : "",
              }));
              setPage(1);
              setExpandedId(null);
            }}
          >
            <option value="">Everything</option>
            {RESOURCE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.resources.map((resource) => (
                  <option key={resource} value={resource}>
                    {resourceLabel(resource)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>

          <Select
            label="Action"
            disabled={!filters.resource}
            hint={filters.resource ? undefined : "Pick a resource first"}
            value={filters.verb}
            onChange={(event) => setFilter("verb", event.target.value)}
          >
            <option value="">Any action</option>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>

          <Select
            label="Admin"
            disabled={actors.size === 0}
            hint={actors.size === 0 ? "None on this page" : "Admins seen in these results"}
            value={filters.actor}
            onChange={(event) => setFilter("actor", event.target.value)}
          >
            <option value="">Anyone</option>
            {[...actors].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>

          <Field
            label="From"
            type="date"
            value={filters.from}
            onChange={(event) => setFilter("from", event.target.value)}
          />

          <Field
            label="To"
            type="date"
            hint="Covers the whole day"
            value={filters.to}
            onChange={(event) => setFilter("to", event.target.value)}
          />
        </div>

        {isFiltered ? (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        ) : null}
      </Card>

      <Card>
        {isPending ? (
          <div role="status" aria-label="Loading the audit log" aria-busy="true" className="p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="mb-3 h-14 w-full last:mb-0" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="file-text"
            title={isFiltered ? "Nothing matches those filters" : "Nothing recorded yet"}
            description={
              isFiltered
                ? "Try widening the date range, or clearing a filter."
                : "Every change an admin makes will appear here."
            }
            action={
              isFiltered ? (
                <Button variant="secondary" onClick={reset}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <ul className={cn(isFetching && "opacity-60 transition-opacity")}>
              {entries.map((entry) => (
                <Row
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                />
              ))}
            </ul>

            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>
    </Container>
  );
}
