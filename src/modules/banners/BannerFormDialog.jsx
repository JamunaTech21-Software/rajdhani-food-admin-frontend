import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../../components/ui/Button.jsx";
import { Field, Select, Textarea } from "../../components/ui/Field.jsx";
import { MediaPicker } from "../../components/ui/MediaPicker.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { hasInvalidWindow } from "../../lib/bannerSchedule.js";
import { fromDateTimeLocalInput, toDateTimeLocalInput } from "../../lib/format.js";
import { PLACEMENT_GROUPS, PLACEMENTS } from "./placements.js";
import { BannerPreview } from "./BannerPreview.jsx";

const optionalUrl = z
  .string()
  .max(255)
  .optional()
  .or(z.literal(""))
  // Relative paths like "/products" are what the CTAs actually use, so a strict
  // z.string().url() would reject the common case.
  .refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), {
    message: "Use a path like /products or a full https:// address",
  });

const schema = z
  .object({
    placement: z.string().min(1, "Choose a placement"),
    eyebrow_text: z.string().max(255).optional(),
    title: z.string().max(255).optional(),
    title_highlight: z.string().max(255).optional(),
    subtitle: z.string().optional(),
    primary_cta_label: z.string().max(128).optional(),
    primary_cta_url: optionalUrl,
    secondary_cta_label: z.string().max(128).optional(),
    secondary_cta_url: optionalUrl,
    video_url: optionalUrl,
    overlay_opacity: z.coerce.number().min(0).max(100),
    desktop_image_id: z.string().nullish(),
    mobile_image_id: z.string().nullish(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (hasInvalidWindow(value.starts_at, value.ends_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ends_at"],
        message: "The end must be after the start",
      });
    }
    // A labelled button with nowhere to go is a dead control on the live site.
    for (const side of ["primary", "secondary"]) {
      if (value[`${side}_cta_label`] && !value[`${side}_cta_url`]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`${side}_cta_url`],
          message: "A button with a label needs a link",
        });
      }
    }
  });

const EMPTY = {
  placement: "HOME_HERO",
  eyebrow_text: "",
  title: "",
  title_highlight: "",
  subtitle: "",
  primary_cta_label: "",
  primary_cta_url: "",
  secondary_cta_label: "",
  secondary_cta_url: "",
  video_url: "",
  overlay_opacity: 40,
  desktop_image_id: null,
  mobile_image_id: null,
  status: "PUBLISHED",
  starts_at: "",
  ends_at: "",
};

const toFormValues = (banner, placement) =>
  banner
    ? {
        ...EMPTY,
        ...Object.fromEntries(
          Object.keys(EMPTY).map((key) => [key, banner[key] ?? EMPTY[key]]),
        ),
        overlay_opacity: banner.overlay_opacity ?? 0,
        starts_at: toDateTimeLocalInput(banner.starts_at),
        ends_at: toDateTimeLocalInput(banner.ends_at),
      }
    : { ...EMPTY, placement: placement ?? EMPTY.placement };

export function BannerFormDialog({ open, onOpenChange, banner, placement }) {
  const isEdit = Boolean(banner);
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(banner, placement) });

  useEffect(() => {
    if (open) reset(toFormValues(banner, placement));
  }, [open, banner, placement, reset]);

  const preview = useWatch({ control });

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => {
      const body = {
        ...values,
        eyebrow_text: values.eyebrow_text || null,
        title: values.title || null,
        title_highlight: values.title_highlight || null,
        subtitle: values.subtitle || null,
        primary_cta_label: values.primary_cta_label || null,
        primary_cta_url: values.primary_cta_url || null,
        secondary_cta_label: values.secondary_cta_label || null,
        secondary_cta_url: values.secondary_cta_url || null,
        video_url: values.video_url || null,
        starts_at: fromDateTimeLocalInput(values.starts_at),
        ends_at: fromDateTimeLocalInput(values.ends_at),
      };

      return isEdit
        ? api.patch(`/admin/banners/${banner.id}`, body)
        : api.post("/admin/banners", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      toast.success(isEdit ? "Banner updated" : "Banner created");
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        return;
      }
      toast.error("Could not save", error.message);
    },
  });

  function requestClose(next) {
    if (!next && isDirty && !isPending) {
      if (!window.confirm("Discard your unsaved changes to this banner?")) return;
    }
    onOpenChange(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={requestClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(60rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-surface shadow-modal">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div>
              <Dialog.Title className="text-base font-semibold text-ink">
                {isEdit ? "Edit banner" : "New banner"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-muted">
                The preview updates as you type.
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
            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_22rem]">
              <div className="flex flex-col gap-4">
                <Select label="Placement" required error={errors.placement?.message} {...register("placement")}>
                  {PLACEMENT_GROUPS.map((group) => (
                    <optgroup key={group} label={group}>
                      {PLACEMENTS.filter((p) => p.group === group).map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>

                <Field
                  label="Eyebrow"
                  placeholder="PREMIUM QUALITY TEA"
                  error={errors.eyebrow_text?.message}
                  {...register("eyebrow_text")}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Headline"
                    placeholder="Pure Nature"
                    error={errors.title?.message}
                    {...register("title")}
                  />
                  <Field
                    label="Highlighted line"
                    hint="Rendered in the accent colour, on its own line."
                    placeholder="Perfect Taste"
                    error={errors.title_highlight?.message}
                    {...register("title_highlight")}
                  />
                </div>

                <Textarea label="Subtext" rows={2} error={errors.subtitle?.message} {...register("subtitle")} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Primary button" placeholder="Explore Our Products" error={errors.primary_cta_label?.message} {...register("primary_cta_label")} />
                  <Field label="Primary link" placeholder="/products" error={errors.primary_cta_url?.message} {...register("primary_cta_url")} />
                  <Field label="Secondary button" placeholder="Download Catalogue" error={errors.secondary_cta_label?.message} {...register("secondary_cta_label")} />
                  <Field label="Secondary link" placeholder="/downloads/catalogue" error={errors.secondary_cta_url?.message} {...register("secondary_cta_url")} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="desktop_image_id"
                    render={({ field }) => (
                      <MediaPicker
                        label="Desktop artwork"
                        resource="banners"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="mobile_image_id"
                    render={({ field }) => (
                      <MediaPicker
                        label="Mobile artwork"
                        hint="Optional — the desktop image is used if this is empty."
                        resource="banners"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <Field
                  label="Video URL"
                  hint="Only used by the home video card."
                  error={errors.video_url?.message}
                  {...register("video_url")}
                />

                <Field
                  label="Overlay darkness (%)"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="[&_input]:h-auto [&_input]:border-0 [&_input]:px-0"
                  error={errors.overlay_opacity?.message}
                  {...register("overlay_opacity")}
                />

                <fieldset className="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
                  <legend className="sr-only">Scheduling</legend>

                  <Select label="Status" error={errors.status?.message} {...register("status")}>
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </Select>

                  <Field
                    label="Starts"
                    type="datetime-local"
                    hint="Blank = immediately"
                    error={errors.starts_at?.message}
                    {...register("starts_at")}
                  />
                  <Field
                    label="Ends"
                    type="datetime-local"
                    hint="Blank = no end"
                    error={errors.ends_at?.message}
                    {...register("ends_at")}
                  />
                </fieldset>
              </div>

              <div className="lg:sticky lg:top-0 lg:self-start">
                <p className="mb-2 text-sm font-medium text-ink">Preview</p>
                <BannerPreview values={preview} />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line p-5">
              <Button variant="secondary" onClick={() => requestClose(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save changes" : "Create banner"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
