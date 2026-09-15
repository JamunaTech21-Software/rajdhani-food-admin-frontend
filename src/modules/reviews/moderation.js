/**
 * Moderation requests and selection maths, kept free of React so the behaviour
 * RTPP-47 is judged on can be tested directly.
 */

const ENDPOINT = {
  approve: "/admin/reviews/bulk-approve",
  reject: "/admin/reviews/bulk-reject",
};

/**
 * Moderate a selection in **one** request.
 *
 * This is the second acceptance criterion stated as code: bulk approving twenty
 * reviews must be one call, not twenty. Looping `PATCH /{id}/approve` would also
 * "work", and would fire twenty aggregate recalculations and twenty reviewer
 * emails in a burst — as well as running straight into the API's rate limit.
 *
 * `request` is injected so this is testable without a live client. Both bulk
 * endpoints are PATCH, not POST.
 */
export function bulkModerate({ ids, action, reason, request }) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) throw new Error("Select at least one review.");

  if (action === "reject") {
    // The API requires a reason on every rejection, single or bulk.
    const trimmed = (reason ?? "").trim();
    if (!trimmed) throw new Error("A rejection needs a reason.");
    return request(ENDPOINT.reject, { ids: unique, reason: trimmed });
  }

  if (action !== "approve") throw new Error(`Unknown moderation action: ${action}`);
  return request(ENDPOINT.approve, { ids: unique });
}

/** Add or remove one id. */
export function toggleSelected(selected, id) {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * "Select all" applies to the page in front of the editor, not to every review
 * the filter matches — approving rows nobody has read is not a thing to make easy.
 */
export function toggleAllOnPage(selected, rows) {
  const ids = rows.map((row) => row.id);
  const allChosen = ids.length > 0 && ids.every((id) => selected.has(id));

  const next = new Set(selected);
  for (const id of ids) {
    if (allChosen) next.delete(id);
    else next.add(id);
  }
  return next;
}

/**
 * Drop ids that are no longer on screen.
 *
 * Changing the filter or the page leaves selections behind. Acting on them would
 * moderate rows the editor can no longer see, so the selection is reconciled
 * against what is actually displayed.
 */
export function reconcile(selected, rows) {
  const visible = new Set(rows.map((row) => row.id));
  return new Set([...selected].filter((id) => visible.has(id)));
}

export const selectionState = (selected, rows) => {
  const ids = rows.map((row) => row.id);
  const chosen = ids.filter((id) => selected.has(id)).length;
  if (chosen === 0) return "none";
  return chosen === ids.length ? "all" : "some";
};
