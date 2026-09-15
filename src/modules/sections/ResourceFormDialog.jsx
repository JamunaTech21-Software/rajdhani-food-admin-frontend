import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Star, X } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../../components/ui/Button.jsx";
import { Checkbox, Field, Select, Textarea } from "../../components/ui/Field.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { IconPicker } from "../categories/IconPicker.jsx";

function RatingField({ value, onChange, label }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            aria-pressed={value === n}
            className="rounded-sm p-0.5 text-line-strong hover:text-gold"
          >
            <Star
              size={20}
              strokeWidth={1.5}
              aria-hidden="true"
              className={cn(value >= n && "fill-gold text-gold")}
            />
          </button>
        ))}
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-2 text-sm text-ink-muted hover:text-ink"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** One form for all five resources, rendered from the descriptor's field list. */
export function ResourceFormDialog({ open, onOpenChange, resource, row, scope }) {
  const isNew = !row;
  const queryClient = useQueryClient();
  const toast = useToast();

  const toFormValues = (source) =>
    source
      ? Object.fromEntries(
          Object.keys(resource.defaults).map((key) => [key, source[key] ?? resource.defaults[key]]),
        )
      : resource.defaults;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(resource.schema), defaultValues: toFormValues(row) });

  useEffect(() => {
    if (open) reset(toFormValues(row));
    // toFormValues is derived from resource.defaults, which is stable per resource.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row, resource, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => {
      // Empty optional strings mean "unset", not "the empty string".
      const body = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === "" ? null : value]),
      );

      if (isNew && resource.scopeKey) body[resource.scopeKey] = scope;

      return isNew
        ? api.post(resource.endpoint, body)
        : api.patch(`${resource.endpoint}/${row.id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resource.queryKey });
      toast.success(isNew ? "Created" : "Saved");
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
      if (!window.confirm("Discard your unsaved changes?")) return;
    }
    onOpenChange(next);
  }

  function renderField(field) {
    const error = errors[field.name]?.message;

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            key={field.name}
            label={field.label}
            required={field.required}
            rows={field.rows ?? 3}
            hint={field.hint}
            placeholder={field.placeholder}
            error={error}
            {...register(field.name)}
          />
        );

      case "number":
        return (
          <Field
            key={field.name}
            label={field.label}
            required={field.required}
            type="number"
            min={field.min}
            hint={field.hint}
            className="sm:max-w-48"
            error={error}
            {...register(field.name)}
          />
        );

      case "select":
        return (
          <Select
            key={field.name}
            label={field.label}
            className="sm:max-w-56"
            error={error}
            {...register(field.name)}
          >
            {field.options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        );

      case "checkbox":
        return (
          <Checkbox key={field.name} label={field.label} {...register(field.name)} />
        );

      case "icon":
        return (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <IconPicker value={f.value} onChange={f.onChange} label={field.label} error={error} />
            )}
          />
        );

      case "rating":
        return (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <RatingField value={f.value ?? 0} onChange={f.onChange} label={field.label} />
            )}
          />
        );

      case "image-note":
        return (
          <p
            key={field.name}
            className="flex items-start gap-2.5 rounded-md bg-info-tint p-3 text-sm text-info"
          >
            <ImagePlus size={17} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>
              <strong className="font-medium">{field.label}</strong> needs the media library, which
              arrives with RTPP-50. Anything already set is left as it is.
            </span>
          </p>
        );

      default:
        return (
          <Field
            key={field.name}
            label={field.label}
            required={field.required}
            hint={field.hint}
            placeholder={field.placeholder}
            error={error}
            {...register(field.name)}
          />
        );
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={requestClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(34rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-surface shadow-modal scrollbar-slim">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div>
              <Dialog.Title className="text-base font-semibold text-ink">
                {isNew ? `New ${resource.singular ?? "item"}` : `Edit ${resource.singular ?? "item"}`}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-muted">
                {resource.blurb}
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
            <div className="flex flex-col gap-4 p-5">{resource.fields.map(renderField)}</div>

            <div className="flex justify-end gap-2 border-t border-line p-5">
              <Button variant="secondary" onClick={() => requestClose(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {isPending ? "Saving…" : isNew ? "Create" : "Save changes"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
