import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../../components/ui/Button.jsx";
import { Checkbox, Field, Textarea } from "../../components/ui/Field.jsx";
import { MediaPicker } from "../../components/ui/MediaPicker.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { useDialogGuard } from "../../hooks/useDialogGuard.js";
import { KEY_PATTERN, keyChangeWarning, publicDownloadPath, toKey } from "./downloadKey.js";

const schema = z.object({
  title: z.string().trim().min(1, "Give this a title").max(255),
  key: z
    .string()
    .trim()
    .min(1, "A key is required — it is what the public link is built from")
    .max(64, "Keys are limited to 64 characters")
    .regex(KEY_PATTERN, "Lowercase letters, digits and underscores only"),
  description: z.string().trim().max(512).optional(),
  // A download with no file has nothing to serve: /public/downloads/{key} would
  // resolve to a row and then have no URL to hand back.
  file_id: z.string().min(1, "Choose a PDF"),
  requires_email: z.boolean(),
  is_active: z.boolean(),
});

const EMPTY = {
  title: "",
  key: "",
  description: "",
  file_id: "",
  requires_email: false,
  is_active: true,
};

const toFormValues = (download) =>
  download
    ? {
        title: download.title ?? "",
        key: download.key ?? "",
        description: download.description ?? "",
        file_id: download.file?.id ?? "",
        requires_email: Boolean(download.requires_email),
        is_active: download.is_active !== false,
      }
    : { ...EMPTY };

/**
 * Remounts the form for each thing being edited.
 *
 * The alternative is an effect that resets the form and the key lock whenever
 * `open` flips, which is a cascading render and leaves the previous row's state
 * around for one frame. A `key` does the same job declaratively: opening on a
 * different download is a different form.
 */
export function DownloadFormDialog({ open, onOpenChange, download }) {
  return (
    <DownloadForm
      key={open ? (download?.id ?? "new") : "closed"}
      open={open}
      onOpenChange={onOpenChange}
      download={download}
    />
  );
}

function DownloadForm({ open, onOpenChange, download }) {
  const isEdit = Boolean(download);
  const queryClient = useQueryClient();
  const toast = useToast();

  // On an existing download the key is locked behind a deliberate action: it is
  // the public URL, and the whole point of this screen is that replacing a file
  // does not change it. Editing the key is possible, just never accidental.
  const [keyUnlocked, setKeyUnlocked] = useState(false);
  // Until someone types a key themselves, it follows the title. An existing
  // download starts touched: its key is already chosen and must not drift when
  // the title is corrected.
  const [keyTouched, setKeyTouched] = useState(isEdit);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(download) });

  // useWatch rather than watch(): watch() returns a function the React Compiler
  // cannot memoize, which opts the whole dialog out of compilation.
  const currentKey = useWatch({ control, name: "key" });
  const keyWarning = keyUnlocked ? keyChangeWarning(download?.key, currentKey) : null;

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => {
      const body = {
        title: values.title,
        key: values.key,
        description: values.description || null,
        file_id: values.file_id,
        requires_email: values.requires_email,
        is_active: values.is_active,
      };

      return isEdit
        ? api.patch(`/admin/downloads/${download.id}`, body)
        : api.post("/admin/downloads", body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "downloads"] });
      toast.success(
        isEdit ? "Download updated" : "Download created",
        isEdit && download.file?.id !== saved?.file?.id
          ? `The file behind ${publicDownloadPath(saved?.key ?? download.key)} was replaced. The link is unchanged.`
          : undefined,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.CONFLICT) {
        setKeyUnlocked(true);
        setError("key", { type: "server", message: "Another download already uses this key" });
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        return;
      }
      toast.error("Could not save", error.message);
    },
  });

  // §18.3 unsaved-changes guard — see hooks/useDialogGuard.js.
  const requestClose = useDialogGuard({
    isDirty,
    isSaving: isPending,
    onOpenChange,
    what: "this download",
  });

  return (
    <Dialog.Root open={open} onOpenChange={requestClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(38rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-surface shadow-modal">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div>
              <Dialog.Title className="text-base font-semibold text-ink">
                {isEdit ? "Edit download" : "New download"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-muted">
                {isEdit
                  ? "Swap the PDF here — the public link stays the same."
                  : "The key becomes the public link, so pick one the site can be built against."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit((values) => mutate(values))} noValidate>
            <div className="flex flex-col gap-4 p-5">
              <Field
                label="Title"
                required
                placeholder="Dealer Brochure"
                error={errors.title?.message}
                {...register("title", {
                  onChange: (event) => {
                    if (!keyTouched) setValue("key", toKey(event.target.value));
                  },
                })}
              />

              {isEdit && !keyUnlocked ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Public link</span>
                  <div className="flex items-center gap-3 rounded-md border border-line bg-ground px-3 py-2.5">
                    <Lock size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-subtle" />
                    <code className="min-w-0 flex-1 truncate text-sm text-ink">
                      {publicDownloadPath(download.key)}
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => setKeyUnlocked(true)}>
                      Change key
                    </Button>
                  </div>
                  <p className="text-sm text-ink-muted">
                    Replacing the PDF below keeps this link working everywhere it is already used.
                  </p>
                </div>
              ) : (
                <Field
                  label="Key"
                  required
                  hint={
                    currentKey && KEY_PATTERN.test(currentKey)
                      ? `The public link will be ${publicDownloadPath(currentKey)}`
                      : "Lowercase letters, digits and underscores — e.g. dealer_brochure"
                  }
                  placeholder="dealer_brochure"
                  error={errors.key?.message}
                  {...register("key", { onChange: () => setKeyTouched(true) })}
                />
              )}

              {keyWarning ? (
                <p role="alert" className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2.5 text-sm text-warning">
                  <TriangleAlert size={15} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                  <span>{keyWarning}</span>
                </p>
              ) : null}

              <Controller
                control={control}
                name="file_id"
                render={({ field }) => (
                  <MediaPicker
                    label="PDF"
                    resource="documents"
                    kind="raw"
                    hint="PDF only, up to 20 MB. Choosing a different file here replaces what visitors download."
                    value={field.value || null}
                    onChange={(id) => field.onChange(id ?? "")}
                  />
                )}
              />
              {errors.file_id?.message ? (
                <p role="alert" className="-mt-2 text-sm text-danger">
                  {errors.file_id.message}
                </p>
              ) : null}

              <Textarea
                label="Description"
                rows={2}
                hint="Shown next to the download link on the site."
                error={errors.description?.message}
                {...register("description")}
              />

              <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
                <legend className="sr-only">Availability</legend>

                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Checkbox
                      label="Available on the site"
                      description="Turn this off to retire a download without deleting it — the link stops resolving but the counter is kept."
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="requires_email"
                  render={({ field }) => (
                    <Checkbox
                      label="Ask for an email address first"
                      // The API stores this but does not act on it: the public
                      // route serves the file either way. Saying so here stops
                      // someone ticking it and assuming leads are being captured.
                      description="Recorded for a future release — downloads are not gated yet, so ticking this changes nothing on the site today."
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  )}
                />
              </fieldset>
            </div>

            <div className="flex justify-end gap-2 border-t border-line p-5">
              <Button variant="secondary" onClick={() => requestClose(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save changes" : "Create download"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
