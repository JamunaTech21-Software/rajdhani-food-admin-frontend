import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../components/ui/Button.jsx";
import { Field } from "../components/ui/Field.jsx";
import { PasswordChecklist } from "../components/ui/PasswordChecklist.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { api } from "../lib/api.js";
import { isPolicyCompliant } from "../lib/passwordPolicy.js";
import { useAuthStore } from "../stores/authStore.js";

const ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  EDITOR: "Editor",
  SALES: "Sales",
};

// The server is the authority on the policy; this only stops a request that is
// certain to fail. The message is deliberately generic — the checklist beneath
// the field is what actually tells someone what is missing.
const schema = z
  .object({
    password: z.string().min(1, "Choose a password"),
    confirm: z.string().min(1, "Type the password again"),
  })
  .refine((values) => isPolicyCompliant(values.password), {
    path: ["password"],
    message: "This password does not meet all the rules below",
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "The two passwords do not match",
  });

function Shell({ children }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-surface p-8 shadow-card">{children}</div>
      </div>
    </main>
  );
}

/**
 * Where an invited admin sets their first password.
 *
 * Until this succeeds the account has **no password at all** and cannot be
 * logged into — that is the API's design (§7.2), and it is what makes RTPP-53's
 * first acceptance criterion true rather than something the UI has to enforce.
 *
 * The token is validated before the form is shown, so nobody types a password
 * into a form that is going to throw it away.
 */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  const [formError, setFormError] = useState(null);

  const invite = useQuery({
    queryKey: ["invite", token],
    queryFn: () => api.get(`/auth/admin/invite/${encodeURIComponent(token)}`, { auth: false }),
    enabled: token.length > 0,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  // useWatch rather than watch(): the checklist re-reads this on every
  // keystroke, and watch() would opt this page out of compilation entirely.
  const password = useWatch({ control, name: "password" });

  const { mutate, isPending } = useMutation({
    mutationFn: (values) =>
      api.post(
        `/auth/admin/invite/${encodeURIComponent(token)}/accept`,
        { password: values.password },
        { auth: false },
      ),
    onSuccess: (session) => {
      // Accepting signs the invitee straight in — they have just proved
      // possession of the token and chosen a password, so a login step would
      // ask them to retype what they typed a second ago.
      queryClient.clear();
      setSession(session);
      navigate("/", { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        // The API returns every unmet policy rule at once, all against
        // `password`, so they are joined rather than overwriting one another.
        const messages = error.details.filter((d) => d.field === "password").map((d) => d.message);
        if (messages.length) {
          setError("password", { type: "server", message: messages.join(". ") });
          return;
        }
      }

      if (error instanceof ApiError && error.code === ErrorCode.NOT_FOUND) {
        // Claimed or expired between loading the page and submitting it.
        invite.refetch();
        return;
      }

      setFormError(error.message);
    },
  });

  if (!token) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ink">This link is incomplete</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Open the link from your invitation email exactly as it was sent. If you copied it by hand,
          part of it may be missing.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
          Go to sign in
        </Link>
      </Shell>
    );
  }

  if (invite.isPending) {
    return (
      <Shell>
        <div role="status" aria-label="Checking your invitation" aria-busy="true">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-6 h-11 w-full" />
        </div>
      </Shell>
    );
  }

  if (invite.isError) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ink">This invitation cannot be used</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Invitations expire after 48 hours, and each one can only be used once. Ask a Super Admin to
          send you a new invitation.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
          Go to sign in
        </Link>
      </Shell>
    );
  }

  const { name, email, role } = invite.data ?? {};

  return (
    <Shell>
      <p className="text-eyebrow uppercase text-brand">Rajdhani Food Products</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">Welcome, {name}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        You have been invited as {ROLE_LABEL[role] ?? role}. Choose a password to finish setting up
        your account.
      </p>
      <div className="mt-5 h-1 w-12 rounded-full bg-gold" />

      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutate(values);
        })}
        noValidate
        className="mt-6 flex flex-col gap-4"
      >
        {/* Present, hidden and read-only: password managers need the account
            this password belongs to, and it is not the invitee's to change. */}
        <input type="hidden" name="username" autoComplete="username" value={email ?? ""} readOnly />

        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          disabled={isPending}
          error={errors.password?.message}
          {...register("password")}
        />

        <PasswordChecklist password={password} />

        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
          error={errors.confirm?.message}
          {...register("confirm")}
        />

        {formError ? (
          <p role="alert" className="rounded-md bg-danger-tint p-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={isPending}>
          {isPending ? "Setting your password…" : "Set password and sign in"}
        </Button>
      </form>
    </Shell>
  );
}
