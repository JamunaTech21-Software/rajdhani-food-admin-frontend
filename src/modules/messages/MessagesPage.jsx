import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MailOpen, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { Pagination } from "../../components/data/Pagination.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { Select, Textarea } from "../../components/ui/Field.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { useNow } from "../../hooks/useNow.js";
import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { formatDateTime, formatRelative } from "../../lib/format.js";

const LIMIT = 20;

const STATUSES = [
  { value: "UNREAD", label: "Unread", tone: "info" },
  { value: "READ", label: "Read", tone: "neutral" },
  { value: "REPLIED", label: "Replied", tone: "success" },
  { value: "ARCHIVED", label: "Archived", tone: "neutral" },
];

const meta = (value) => STATUSES.find((s) => s.value === value) ?? { label: value, tone: "neutral" };

export function MessagesPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const page = Number(params.get("page")) || 1;

  const [openId, setOpenId] = useState(null);
  const [notes, setNotes] = useState("");
  const [notesFor, setNotesFor] = useState(null);

  const now = useNow();
  const queryClient = useQueryClient();
  const toast = useToast();

  function update(next) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!("page" in next)) merged.delete("page");
    setParams(merged, { replace: true });
  }

  const query = useQuery({
    queryKey: ["admin", "messages", { status, page }],
    queryFn: () => api.list("/admin/messages", { params: { status, page, limit: LIMIT } }),
    placeholderData: (previous) => previous,
  });

  const rows = query.data?.items ?? [];
  const open = rows.find((r) => r.id === openId) ?? null;

  if (open && open.id !== notesFor) {
    setNotesFor(open.id);
    setNotes(open.internal_notes ?? "");
  }

  const update_ = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/admin/messages/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      // The sidebar's unread badge reads `counts.unread_messages` from the
      // dashboard summary, so it has to be refreshed for the count to move.
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (error) => toast.error("Could not update", error.message),
  });

  /**
   * Opening an unread message marks it read — the acceptance criterion. Done on
   * open rather than behind a button, because having read it is exactly what
   * opening it means.
   */
  function openMessage(message) {
    setOpenId(message.id);
    if (message.status === "UNREAD") {
      update_.mutate({ id: message.id, body: { status: "READ" } });
    }
  }

  const notesChanged = open ? notes.trim() !== (open.internal_notes ?? "").trim() : false;

  return (
    <Container as="main" className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Messages</h1>
        <p className="mt-1 text-sm text-ink-muted">Everything sent through the contact form.</p>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <select
            value={status}
            onChange={(e) => update({ status: e.target.value })}
            aria-label="Filter by status"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm"
          >
            <option value="">All messages</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {status ? (
            <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear
            </Button>
          ) : null}
        </div>

        {query.isError ? (
          <ErrorState
            title="Could not load messages"
            action={
              <Button variant="secondary" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : query.isPending ? (
          <div role="status" aria-label="Loading messages" aria-busy="true" className="p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-16 w-full last:mb-0" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="mail"
            title={status ? "Nothing with that status" : "No messages yet"}
            description="Contact form submissions arrive here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((message) => {
              const unread = message.status === "UNREAD";
              const badge = meta(message.status);

              return (
                <li key={message.id}>
                  <button
                    type="button"
                    onClick={() => openMessage(message)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-(--duration-fast) hover:bg-ground"
                  >
                    <span className="mt-0.5 shrink-0 text-ink-subtle">
                      {unread ? (
                        <Mail size={17} strokeWidth={1.75} className="text-brand" aria-label="Unread" />
                      ) : (
                        <MailOpen size={17} strokeWidth={1.75} aria-hidden="true" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn("truncate text-sm text-ink", unread && "font-semibold")}>
                          {message.subject || "(no subject)"}
                        </span>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-ink-muted">
                        {message.name} · {message.email}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-ink-subtle">
                        {message.message}
                      </span>
                    </span>

                    <span className="shrink-0 text-xs text-ink-subtle">
                      {formatRelative(message.created_at, now)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <Pagination meta={query.data?.meta} onPageChange={(next) => update({ page: String(next) })} />
      </Card>

      <Dialog.Root open={open !== null} onOpenChange={(next) => !next && setOpenId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
          <Dialog.Content
            className="fixed inset-y-0 right-0 z-50 flex w-[min(34rem,100vw)] flex-col bg-surface shadow-modal"
            aria-describedby={undefined}
          >
            {open ? (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-line p-5">
                  <div className="min-w-0">
                    <Dialog.Title className="truncate text-base font-semibold text-ink">
                      {open.subject || "(no subject)"}
                    </Dialog.Title>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">
                      {open.name} · {open.email}
                      {open.phone ? ` · ${open.phone}` : ""}
                    </p>
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
                  >
                    <X size={16} strokeWidth={1.75} aria-hidden="true" />
                  </Dialog.Close>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim p-5">
                  <p className="text-sm text-ink-subtle">{formatDateTime(open.created_at)}</p>

                  <p className="mt-4 whitespace-pre-line rounded-md bg-ground p-4 text-sm text-ink">
                    {open.message}
                  </p>

                  <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5">
                    <Select
                      label="Status"
                      value={open.status}
                      onChange={(e) => update_.mutate({ id: open.id, body: { status: e.target.value } })}
                      disabled={update_.isPending}
                      hint={
                        open.replied_at
                          ? `Marked replied ${formatDateTime(open.replied_at)}`
                          : "Setting Replied stamps the time."
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>

                    <div>
                      <Textarea
                        label="Internal notes"
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        hint="Only visible to admins."
                      />
                      {notesChanged ? (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            loading={update_.isPending}
                            onClick={() =>
                              update_.mutate(
                                { id: open.id, body: { internal_notes: notes.trim() || null } },
                                { onSuccess: () => toast.success("Notes saved") },
                              )
                            }
                          >
                            Save notes
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setNotes(open.internal_notes ?? "")}>
                            Discard
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <a
                      href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject ?? "Your enquiry"}`)}`}
                      className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-dark"
                    >
                      <Mail size={15} strokeWidth={1.75} aria-hidden="true" />
                      Reply by email
                    </a>
                    <p className="-mt-2 text-sm text-ink-subtle">
                      Opens your mail client. Mark the message Replied once you have sent it.
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Container>
  );
}
