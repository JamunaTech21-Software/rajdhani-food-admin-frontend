import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../../components/ui/Button.jsx";
import { Field, Select, Textarea } from "../../components/ui/Field.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";

const RichTextEditor = lazy(() =>
  import("../../components/ui/RichTextEditor.jsx").then((m) => ({ default: m.RichTextEditor })),
);

const optionalUrl = z
  .string()
  .max(255)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), {
    message: "Use a path like /products or a full https:// address",
  });

const schema = z
  .object({
    eyebrow: z.string().max(255).optional(),
    heading: z.string().max(255).optional(),
    subheading: z.string().max(255).optional(),
    body: z.string().nullish(),
    bullet_points: z.array(z.string()),
    cta_label: z.string().max(128).optional(),
    cta_url: optionalUrl,
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  })
  .superRefine((value, ctx) => {
    if (value.cta_label && !value.cta_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cta_url"],
        message: "A button with a label needs a link",
      });
    }
  });

const EMPTY = {
  eyebrow: "",
  heading: "",
  subheading: "",
  body: null,
  bullet_points: [],
  cta_label: "",
  cta_url: "",
  status: "PUBLISHED",
};

const toFormValues = (row) =>
  row
    ? {
        eyebrow: row.eyebrow ?? "",
        heading: row.heading ?? "",
        subheading: row.subheading ?? "",
        body: row.body ?? null,
        bullet_points: row.bullet_points ?? [],
        cta_label: row.cta_label ?? "",
        cta_url: row.cta_url ?? "",
        status: row.status ?? "PUBLISHED",
      }
    : EMPTY;

export function BlockEditorDialog({ open, onOpenChange, pageKey, block }) {
  const row = block?.row ?? null;
  const isNew = !row;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(row) });

  useEffect(() => {
    if (open) reset(toFormValues(row));
  }, [open, row, reset]);

  // Collapse the extra fields whenever a different block is opened. Adjusted
  // during render rather than in an effect, which would cascade a second pass.
  const identity = open ? `${pageKey}:${block?.key}` : null;
  const [openedFor, setOpenedFor] = useState(identity);
  if (identity !== openedFor) {
    setOpenedFor(identity);
    setShowAll(false);
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => {
      const body = {
        eyebrow: values.eyebrow || null,
        heading: values.heading || null,
        subheading: values.subheading || null,
        body: values.body || null,
        bullet_points: values.bullet_points,
        cta_label: values.cta_label || null,
        cta_url: values.cta_url || null,
        status: values.status,
      };

      return isNew
        ? api.post("/admin/page-blocks", { ...body, page_key: pageKey, block_key: block.key })
        : api.patch(`/admin/page-blocks/${row.id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "page-blocks"] });
      toast.success(isNew ? "Block created" : "Block saved");
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.CONFLICT) {
        toast.error("Already exists", "A block with this key is already on this page.");
        return;
      }
      toast.error("Could not save", error.message);
    },
  });

  function requestClose(next) {
    if (!next && isDirty && !isPending) {
      if (!window.confirm("Discard your unsaved changes to this block?")) return;
    }
    onOpenChange(next);
  }

  const uses = block?.uses ?? [];
  const shows = (field) => showAll || uses.includes(field);

  return (
    <Dialog.Root open={open} onOpenChange={requestClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(42rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-surface shadow-modal scrollbar-slim">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-ink">
                {block?.label ?? "Block"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-muted">
                {block?.where}
              </Dialog.Description>
              <p className="mt-1 font-mono text-xs text-ink-subtle">
                {pageKey} · {block?.key}
              </p>
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
              {shows("eyebrow") ? (
                <Field
                  label="Eyebrow"
                  placeholder="OUR COMPANY"
                  hint="The small uppercase label above the heading."
                  error={errors.eyebrow?.message}
                  {...register("eyebrow")}
                />
              ) : null}

              {shows("heading") ? (
                <Field label="Heading" error={errors.heading?.message} {...register("heading")} />
              ) : null}

              {shows("subheading") ? (
                <Field
                  label="Subheading"
                  error={errors.subheading?.message}
                  {...register("subheading")}
                />
              ) : null}

              {shows("body") ? (
                <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                  <Controller
                    control={control}
                    name="body"
                    render={({ field }) => (
                      <RichTextEditor label="Body" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </Suspense>
              ) : null}

              {shows("bullet_points") ? (
                <Controller
                  control={control}
                  name="bullet_points"
                  render={({ field }) => (
                    <Textarea
                      label="List items"
                      hint="One per line. Rendered as the ticked list."
                      rows={5}
                      value={(field.value ?? []).join("\n")}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean),
                        )
                      }
                      onBlur={field.onBlur}
                    />
                  )}
                />
              ) : null}

              {shows("image") ? (
                <p className="flex items-start gap-2.5 rounded-md bg-info-tint p-3 text-sm text-info">
                  <ImagePlus size={17} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                  <span>
                    This block shows an image. Choosing one needs the media library, which arrives
                    with RTPP-50 — any image already set stays as it is.
                  </span>
                </p>
              ) : null}

              {shows("cta") ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Button label" error={errors.cta_label?.message} {...register("cta_label")} />
                  <Field
                    label="Button link"
                    placeholder="/about"
                    error={errors.cta_url?.message}
                    {...register("cta_url")}
                  />
                </div>
              ) : null}

              <Select label="Status" className="sm:max-w-48" error={errors.status?.message} {...register("status")}>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </Select>

              {/* The catalogue says which fields this block renders, but the
                  column exists either way — never hide capability, just fold it. */}
              {!showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="self-start text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Show the remaining fields
                </button>
              ) : (
                <p className="text-sm text-ink-muted">
                  All fields shown. The page may not render the ones outside this block’s design.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line p-5">
              <Button variant="secondary" onClick={() => requestClose(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {isPending ? "Saving…" : isNew ? "Create block" : "Save changes"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
