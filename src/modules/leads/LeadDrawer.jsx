import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserMinus, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Select, Textarea } from "../../components/ui/Field.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import { statusMeta } from "./leadResources.jsx";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-1.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{value}</dd>
    </div>
  );
}

/**
 * The detail drawer: everything submitted, plus the three fields an admin may
 * actually change — status, assignee and internal notes (§9.10).
 */
export function LeadDrawer({ resource, row, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const me = useAuthStore((s) => s.admin);

  const [notes, setNotes] = useState("");
  const [notesFor, setNotesFor] = useState(null);

  // Refill the notes box when a different lead is opened, without an effect.
  if (row && row.id !== notesFor) {
    setNotesFor(row.id);
    setNotes(row.internal_notes ?? "");
  }

  const update = useMutation({
    mutationFn: (body) => api.patch(`${resource.endpoint}/${row.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resource.queryKey });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (error) => toast.error("Could not save", error.message),
  });

  if (!row) return null;

  const meta = statusMeta(resource, row.status);
  const assignedToMe = row.assigned_to?.id && row.assigned_to.id === me?.id;
  const notesChanged = notes.trim() !== (row.internal_notes ?? "").trim();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-[min(34rem,100vw)] flex-col bg-surface shadow-modal"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-semibold text-ink">
                {resource.title(row)}
              </Dialog.Title>
              <p className="mt-0.5 font-mono text-sm text-ink-muted">{resource.reference(row)}</p>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim p-5">
            <div className="mb-4 flex items-center gap-2">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {row.assigned_to?.name ? (
                <span className="text-sm text-ink-muted">
                  Assigned to {assignedToMe ? "you" : row.assigned_to.name}
                </span>
              ) : (
                <span className="text-sm text-ink-subtle">Unassigned</span>
              )}
            </div>

            <dl className="divide-y divide-line border-y border-line">
              {resource.detail(row).map(([label, value]) => (
                <Row key={label} label={label} value={value} />
              ))}
            </dl>

            {resource.message(row) ? (
              <div className="mt-5">
                <p className="text-sm font-medium text-ink">Message</p>
                <p className="mt-1.5 whitespace-pre-line rounded-md bg-ground p-3 text-sm text-ink">
                  {resource.message(row)}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5">
              <Select
                label="Status"
                value={row.status}
                onChange={(e) => update.mutate({ status: e.target.value })}
                disabled={update.isPending}
              >
                {resource.statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>

              <div>
                <p className="mb-1.5 text-sm font-medium text-ink">Assignment</p>
                {/* Only self-assignment: picking another admin needs
                    GET /admin/users, which is not implemented (RTPP-53). */}
                {assignedToMe ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ assigned_to_id: null })}
                  >
                    <UserMinus size={14} strokeWidth={1.75} aria-hidden="true" />
                    Unassign me
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={update.isPending || !me?.id}
                    onClick={() => update.mutate({ assigned_to_id: me.id })}
                  >
                    <UserCheck size={14} strokeWidth={1.75} aria-hidden="true" />
                    Assign to me
                  </Button>
                )}
                <p className="mt-1.5 text-sm text-ink-subtle">
                  Assigning to another admin needs the user list, which arrives with RTPP-53.
                </p>
              </div>

              <div>
                <Textarea
                  label="Internal notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  hint="Only visible to admins — never sent to the customer."
                />
                {notesChanged ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      loading={update.isPending}
                      onClick={() =>
                        update.mutate(
                          { internal_notes: notes.trim() || null },
                          { onSuccess: () => toast.success("Notes saved") },
                        )
                      }
                    >
                      Save notes
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setNotes(row.internal_notes ?? "")}>
                      Discard
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
