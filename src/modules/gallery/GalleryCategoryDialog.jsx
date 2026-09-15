import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../../components/ui/Button.jsx";
import { Field, Textarea } from "../../components/ui/Field.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { IconPicker } from "../categories/IconPicker.jsx";
import { useDialogGuard } from "../../hooks/useDialogGuard.js";

const schema = z.object({
  name: z.string().min(1, "Enter a name").max(255),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(191)
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
  icon_name: z.string().nullable().optional(),
});

const EMPTY = { name: "", slug: "", description: "", icon_name: null };

const toFormValues = (category) =>
  category
    ? {
        name: category.name ?? "",
        slug: category.slug ?? "",
        description: category.description ?? "",
        icon_name: category.icon_name ?? null,
      }
    : EMPTY;

export function GalleryCategoryDialog({ open, onOpenChange, category }) {
  const isEdit = Boolean(category);
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(category) });

  useEffect(() => {
    if (open) reset(toFormValues(category));
  }, [open, category, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => {
      const body = { ...values, slug: values.slug?.trim() || undefined };
      return isEdit
        ? api.patch(`/admin/gallery/categories/${category.id}`, body)
        : api.post("/admin/gallery/categories", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "categories"] });
      toast.success(isEdit ? "Category updated" : "Category created");
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
        setError("slug", { type: "server", message: "That slug is already in use." });
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
    what: "this category",
  });

  return (
    <Dialog.Root open={open} onOpenChange={requestClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface shadow-modal">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div>
              <Dialog.Title className="text-base font-semibold text-ink">
                {isEdit ? "Edit gallery category" : "New gallery category"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-muted">
                Categories become the filter tabs on the public gallery.
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
              <Field label="Name" required autoFocus error={errors.name?.message} {...register("name")} />
              <Field
                label="Slug"
                hint={isEdit ? undefined : "Derived from the name if left blank."}
                placeholder="tea-gardens"
                error={errors.slug?.message}
                {...register("slug")}
              />
              <Textarea label="Description" rows={2} error={errors.description?.message} {...register("description")} />
              <Controller
                control={control}
                name="icon_name"
                render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-line p-5">
              <Button variant="secondary" onClick={() => requestClose(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
