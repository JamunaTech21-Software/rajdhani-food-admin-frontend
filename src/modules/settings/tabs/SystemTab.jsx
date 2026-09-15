import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../../../components/ui/Button.jsx";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card.jsx";
import { Checkbox, Field, Textarea } from "../../../components/ui/Field.jsx";
import { Skeleton } from "../../../components/ui/Skeleton.jsx";
import { useToast } from "../../../components/ui/toast-context.js";
import { api } from "../../../lib/api.js";
import { parseEmails } from "../emailList.js";
import {
  changedSettings,
  GROUPS,
  isOn,
  settingsErrors,
  settingsInGroup,
  toFormValues,
} from "../settingsCatalogue.js";

const QUERY_KEY = ["admin", "settings"];

function RecipientCount({ value }) {
  const count = parseEmails(value).length;

  // Empty is a real configuration, not an unfinished form — the API falls back
  // to the primary contact email — so it says so rather than showing "0".
  if (count === 0) {
    return <span className="text-ink-subtle">Falls back to the primary contact email</span>;
  }
  return <span className="text-ink-subtle">{count === 1 ? "1 recipient" : `${count} recipients`}</span>;
}

function SettingControl({ setting, value, error, onChange }) {
  if (setting.kind === "boolean") {
    return (
      <Checkbox
        label={setting.label}
        description={setting.hint}
        checked={isOn(value)}
        onChange={(event) => onChange(event.target.checked ? "1" : "0")}
      />
    );
  }

  if (setting.kind === "emails") {
    return (
      <Textarea
        label={setting.label}
        rows={2}
        hint={error ? undefined : <RecipientCount value={value} />}
        placeholder="sales@rajdhanitea.com, manager@rajdhanitea.com"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        error={error}
      />
    );
  }

  const numeric = setting.kind === "integer" || setting.kind === "decimal";

  return (
    <Field
      label={setting.label}
      hint={setting.hint}
      placeholder={setting.placeholder}
      type={numeric ? "number" : "text"}
      min={setting.min}
      max={setting.max}
      step={setting.step ?? (setting.kind === "integer" ? 1 : undefined)}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      error={error}
    />
  );
}

/**
 * The `settings` key/value rows — notification recipients, analytics ids and the
 * handful of behaviours that are configuration rather than content.
 *
 * Separate from the site profile because it is a separate endpoint with separate
 * semantics: `PUT /admin/settings` takes a list of key/value pairs and refuses
 * any key the seeder did not create.
 */
export function SystemTab() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.list("/admin/settings"),
  });

  const [values, setValues] = useState({});
  const [seededFrom, setSeededFrom] = useState(null);

  if (data && data !== seededFrom) {
    setSeededFrom(data);
    setValues(toFormValues(data.items));
  }

  const initial = toFormValues(data?.items);
  const changed = changedSettings(initial, values);
  const errors = settingsErrors(values);
  const hasErrors = Object.keys(errors).length > 0;

  const { mutate, isPending: isSaving } = useMutation({
    mutationFn: () => api.put("/admin/settings", { settings: changed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`${changed.length === 1 ? "Setting" : "Settings"} saved`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        toast.error("Some values were rejected", error.message);
        return;
      }
      toast.error("Could not save", error.message);
    },
  });

  if (isPending) {
    return (
      <div role="status" aria-label="Loading settings" aria-busy="true" className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map((group) => (
        <Card key={group.id}>
          <CardHeader title={group.label} description={group.description} />
          <CardBody className="flex flex-col gap-5">
            {settingsInGroup(group.id).map((setting) => (
              <SettingControl
                key={setting.key}
                setting={setting}
                value={values[setting.key]}
                error={errors[setting.key]}
                onChange={(next) => setValues((current) => ({ ...current, [setting.key]: next }))}
              />
            ))}
          </CardBody>
        </Card>
      ))}

      {isOn(values.maintenance_mode) && !isOn(initial.maintenance_mode) ? (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint px-3 py-2.5 text-sm text-danger">
          <TriangleAlert size={15} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            Saving this takes the customer site offline for every visitor. This dashboard stays
            reachable, so you can switch it back.
          </span>
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {changed.length > 0 ? (
          <span className="text-sm text-ink-muted">
            {changed.length === 1 ? "1 change" : `${changed.length} changes`} not saved
          </span>
        ) : null}
        <Button
          onClick={() => mutate()}
          disabled={changed.length === 0 || hasErrors}
          loading={isSaving}
        >
          {isSaving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
