import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { Badge, StatusBadge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { ErrorState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { SITE_URL } from "../../config.js";
import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { BlockEditorDialog } from "./BlockEditorDialog.jsx";
import { blocksForPage, PAGES, pageOf, SECTIONS_ELSEWHERE } from "./page-catalogue.js";

export function PageContentPage() {
  const [params, setParams] = useSearchParams();
  const pageKey = pageOf(params.get("page"))?.key ?? PAGES[0].key;
  const page = pageOf(pageKey);

  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "page-blocks", pageKey],
    queryFn: () => api.list("/admin/page-blocks", { params: { page_key: pageKey } }),
  });

  const blocks = blocksForPage(pageKey, data?.items ?? []);
  const missing = blocks.filter((b) => b.designed && !b.row).length;

  function openBlock(block) {
    setEditing(block);
    setDialogOpen(true);
  }

  return (
    <Container as="main" className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Page content</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The written blocks on the static pages. Pick a page, then edit its blocks.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Pages">
          <Card className="overflow-hidden">
            <ul>
              {PAGES.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setParams({ page: item.key }, { replace: true })}
                    aria-current={item.key === pageKey ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 border-l-2 px-4 py-2.5 text-left text-sm",
                      "transition-colors duration-(--duration-fast)",
                      item.key === pageKey
                        ? "border-brand bg-brand-tint font-medium text-brand"
                        : "border-transparent text-ink-muted hover:bg-ground hover:text-ink",
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="shrink-0 text-xs text-ink-subtle">{item.blocks.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </nav>

        <div>
          <Card>
            <CardHeader
              title={page.label}
              description={`${blocks.length} block${blocks.length === 1 ? "" : "s"}${
                missing ? ` · ${missing} not set up yet` : ""
              }`}
              action={
                <a
                  href={`${SITE_URL}${page.path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-dark"
                >
                  View page
                  <ExternalLink size={13} strokeWidth={1.75} aria-hidden="true" />
                </a>
              }
            />

            {isError ? (
              <ErrorState
                title="Could not load this page’s blocks"
                action={
                  <Button variant="secondary" onClick={() => refetch()}>
                    Try again
                  </Button>
                }
              />
            ) : isPending ? (
              <div role="status" aria-label="Loading blocks" aria-busy="true" className="p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="mb-2 h-16 w-full last:mb-0" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {blocks.map((block) => (
                  <li
                    key={block.key}
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">{block.label}</p>
                        {block.row ? (
                          <StatusBadge status={block.row.status} />
                        ) : (
                          <Badge tone="neutral">Not set up yet</Badge>
                        )}
                        {block.designed ? null : <Badge tone="info">Extra</Badge>}
                      </div>

                      <p className="mt-0.5 text-sm text-ink-muted">{block.where}</p>

                      {block.row?.heading ? (
                        <p className="mt-1 truncate text-sm text-ink-subtle">
                          “{block.row.heading}”
                        </p>
                      ) : null}
                    </div>

                    <Button variant="secondary" size="sm" onClick={() => openBlock(block)}>
                      {block.row ? (
                        <>
                          <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
                          Edit
                        </>
                      ) : (
                        <>
                          <Plus size={14} strokeWidth={2} aria-hidden="true" />
                          Set up
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {SECTIONS_ELSEWHERE[pageKey] ? (
            <p className="mt-3 rounded-md bg-ground px-4 py-3 text-sm text-ink-muted">
              {SECTIONS_ELSEWHERE[pageKey]}
            </p>
          ) : null}
        </div>
      </div>

      <BlockEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pageKey={pageKey}
        block={editing}
      />
    </Container>
  );
}
