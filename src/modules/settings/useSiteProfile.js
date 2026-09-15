import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError, ErrorCode } from "@shared/api/errors.js";
import { applyTheme } from "@shared/theme/applyTheme.js";

import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { changedFields, logoAssets, toFormValues } from "./profileShape.js";

export const SITE_PROFILE_KEY = ["admin", "site-profile"];

const THEME_FIELDS = ["primary_color", "secondary_color", "accent_color"];

/**
 * The whole site profile as one form.
 *
 * It is one row and one PATCH, so it is one form even though the UI splits it
 * across tabs — otherwise a Save button per tab would mean four requests to
 * change four related things, each racing the others.
 */
export function useSiteProfile() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: SITE_PROFILE_KEY,
    queryFn: () => api.get("/admin/site-profile"),
  });

  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  // Seeding during render rather than in an effect: an effect would paint one
  // frame of empty inputs first, and calling setState from an effect body is
  // the cascading-render pattern the React Compiler rejects.
  const [seededFrom, setSeededFrom] = useState(null);

  if (data && data !== seededFrom) {
    setSeededFrom(data);
    setValues(toFormValues(data));
    setFieldErrors({});
  }

  const initial = toFormValues(data);
  const body = changedFields(initial, values);
  const changedCount = Object.keys(body).length;

  const setValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const reset = () => {
    setValues(toFormValues(data));
    setFieldErrors({});
  };

  const { mutate, isPending: isSaving } = useMutation({
    // minProperties: 1 — an unchanged form must not be submitted at all.
    mutationFn: () => api.patch("/admin/site-profile", body),
    onSuccess: (saved) => {
      queryClient.setQueryData(SITE_PROFILE_KEY, (current) =>
        current ? { ...current, site: { ...current.site, ...saved } } : current,
      );
      queryClient.invalidateQueries({ queryKey: SITE_PROFILE_KEY });

      // RTPP-52's first acceptance criterion, made visible: a colour change
      // repaints this dashboard immediately, with no reload and no deploy.
      // The customer site picks the same values up on its next /public/layout.
      const themeChanged = THEME_FIELDS.some((field) => field in body);
      if (themeChanged) {
        applyTheme({
          primary: values.primary_color,
          secondary: values.secondary_color,
          accent: values.accent_color,
        });
      }

      toast.success(
        "Settings saved",
        themeChanged ? "The new colours are live — the customer site picks them up on its next load." : undefined,
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        setFieldErrors(error.fieldErrors);
        toast.error("Some fields need attention", "See the highlighted fields.");
        return;
      }
      toast.error("Could not save", error.message);
    },
  });

  return {
    values,
    setValue,
    fieldErrors,
    assets: logoAssets(data),
    changedCount,
    isDirty: changedCount > 0,
    save: mutate,
    reset,
    isSaving,
    isPending,
    isError,
    refetch,
  };
}
