import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../../components/ui/Button.jsx";
import { Checkbox, Field } from "../../components/ui/Field.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { useDialogGuard } from "../../hooks/useDialogGuard.js";
import { SOCIAL_PLATFORMS } from "./menuLocations.js";

const schema = z.object({
  platform: z.string().trim().min(1, "Name the platform").max(64),
  url: z
    .string()
    .trim()
    .min(1, "A link needs an address")
    .max(255)
    .refine((v) => /^https?:\/\//.test(v), { message: "Use a full https:// address" }),
  icon_name: z.string().trim().max(64).optional(),
  is_active: z.boolean(),
});

const EMPTY = { platform: "", url: "", icon_name: "", is_active: true };

const toFormValues = (link) =>
  link
    ? {
        platform: link.platform ?? "",
        url: link.url ?? "",
        icon_name: link.icon_name ?? "",
        is_active: link.is_active !== false,
      }
    : { ...EMPTY };

export function SocialLinkDialog({ open, onOpenChange, link }) {
  return (
    <SocialLinkForm
      key={open ? (link?.id ?? "new") : "closed"}
      open={open}
      onOpenChange={onOpenChange}
      link={link}
    />
  );
}

function SocialLinkForm({ open, onOpenChange, link }) {
  const isEdit = Boolean(link);
  const listId = useId();
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(link) });

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => {
      const body = {
        platform: values.platform,
        url: values.url,
        icon_name: values.icon_name || null,
        is_active: values.is_active,
      };

      return isEdit
        ? api.patch(`/admin/social-links/${link.id}`, body)
        : api.post("/admin/social-links", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "social-links"] });
      toast.success(isEdit ? "Social link updated" : "Social link added");
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

  // §18.3 unsaved-changes guard — see hooks/useDialogGuard.js.
  const requestClose = useDialogGuard({
    isDirty,
    isSaving: isPending,
    onOpenChange,
    what: "this social link",
  });

  return (
    <Dialog.Root open={open} onOpenChange={requestClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(30rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-surface shadow-modal">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <Dialog.Title className="text-base font-semibold text-ink">
              {isEdit ? "Edit social link" : "New social link"}
            </Dialog.Title>
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
                label="Platform"
                required
                list={listId}
                placeholder="facebook"
                hint="Pick one of the suggestions or type your own."
                error={errors.platform?.message}
                {...register("platform")}
              />
              {/* Free text, not an enum: the column is VARCHAR(64), so a
                  platform nobody anticipated must still be addable. */}
              <datalist id={listId}>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform} />
                ))}
              </datalist>

              <Field
                label="Profile URL"
                required
                placeholder="https://facebook.com/rajdhanitea"
                error={errors.url?.message}
                {...register("url")}
              />

              <Field
                label="Icon name"
                hint="Optional. Leave blank to use the platform name."
                error={errors.icon_name?.message}
                {...register("icon_name")}
              />

              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Checkbox
                    label="Show on the site"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                )}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-line p-5">
              <Button variant="secondary" onClick={() => requestClose(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save changes" : "Add link"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
