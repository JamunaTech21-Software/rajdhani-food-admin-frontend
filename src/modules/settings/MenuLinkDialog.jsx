import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../../components/ui/Button.jsx";
import { Checkbox, Field, Select } from "../../components/ui/Field.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { useDialogGuard } from "../../hooks/useDialogGuard.js";
import { locationOf, MENU_LOCATIONS, MENU_LOCATION_VALUES, parentOptions } from "./menuLocations.js";

const schema = z.object({
  location: z.enum(MENU_LOCATION_VALUES),
  label: z.string().trim().min(1, "Give the link a label").max(128),
  url: z
    .string()
    .trim()
    .min(1, "A link needs a destination")
    .max(255)
    // Relative paths are what most of these are; a strict URL check would
    // reject "/products", the commonest value in the whole menu.
    .refine((v) => v.startsWith("/") || v.startsWith("#") || /^(https?:|mailto:|tel:)/.test(v), {
      message: "Use a path like /products, or a full https:// address",
    }),
  parent_id: z.string().nullish(),
  is_active: z.boolean(),
  open_in_new_tab: z.boolean(),
});

const EMPTY = {
  location: "header",
  label: "",
  url: "",
  parent_id: "",
  is_active: true,
  open_in_new_tab: false,
};

const toFormValues = (link, location) =>
  link
    ? {
        location: link.location ?? EMPTY.location,
        label: link.label ?? "",
        url: link.url ?? "",
        parent_id: link.parent_id ?? "",
        is_active: link.is_active !== false,
        open_in_new_tab: Boolean(link.open_in_new_tab),
      }
    : { ...EMPTY, location: location ?? EMPTY.location };

export function MenuLinkDialog({ open, onOpenChange, link, location, allLinks }) {
  return (
    <MenuLinkForm
      key={open ? (link?.id ?? `new-${location ?? "header"}`) : "closed"}
      open={open}
      onOpenChange={onOpenChange}
      link={link}
      location={location}
      allLinks={allLinks}
    />
  );
}

function MenuLinkForm({ open, onOpenChange, link, location, allLinks }) {
  const isEdit = Boolean(link);
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(link, location) });

  // useWatch, not watch(): watch() returns a function the React Compiler cannot
  // memoize, which opts the whole dialog out of compilation.
  const currentLocation = useWatch({ control, name: "location" });
  const nests = locationOf(currentLocation).nesting;
  const parents = parentOptions(allLinks, { location: currentLocation, id: link?.id });

  // A link that already has children cannot itself become a child: the data
  // model is one level deep, and the API has no concept of a grandchild.
  const hasChildren = (allLinks ?? []).some((candidate) => candidate.parent_id === link?.id);

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => {
      const body = {
        location: values.location,
        label: values.label,
        url: values.url,
        parent_id: nests && values.parent_id ? values.parent_id : null,
        is_active: values.is_active,
        open_in_new_tab: values.open_in_new_tab,
      };

      return isEdit
        ? api.patch(`/admin/menu-links/${link.id}`, body)
        : api.post("/admin/menu-links", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "menu-links"] });
      toast.success(isEdit ? "Link updated" : "Link added");
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
    what: "this menu link",
  });

  return (
    <Dialog.Root open={open} onOpenChange={requestClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(32rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-surface shadow-modal">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <Dialog.Title className="text-base font-semibold text-ink">
              {isEdit ? "Edit link" : "New link"}
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
              <Select label="Where it appears" error={errors.location?.message} {...register("location")}>
                {MENU_LOCATIONS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>

              <Field label="Label" required placeholder="Products" error={errors.label?.message} {...register("label")} />

              <Field
                label="Links to"
                required
                placeholder="/products"
                hint="A path on this site, or a full address for somewhere else."
                error={errors.url?.message}
                {...register("url")}
              />

              {nests ? (
                <Select
                  label="Nest under"
                  hint={
                    hasChildren
                      ? "This link already has links nested under it, so it must stay at the top level."
                      : "Optional. Nested links render as a dropdown."
                  }
                  disabled={hasChildren}
                  error={errors.parent_id?.message}
                  {...register("parent_id")}
                >
                  <option value="">Top level</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.label}
                    </option>
                  ))}
                </Select>
              ) : null}

              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Checkbox
                    label="Show on the site"
                    description="Turn this off to hide the link without deleting it."
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                )}
              />

              <Controller
                control={control}
                name="open_in_new_tab"
                render={({ field }) => (
                  <Checkbox
                    label="Open in a new tab"
                    description="Usually only for links to other websites."
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
