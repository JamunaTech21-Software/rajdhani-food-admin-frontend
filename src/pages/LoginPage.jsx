import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Button } from "../components/ui/Button.jsx";
import { Field } from "../components/ui/Field.jsx";
import { formatWait, useCountdown } from "../hooks/useCountdown.js";
import { api } from "../lib/api.js";
import { useAuthStore } from "../stores/authStore.js";

// Login deliberately does not enforce the §7.2 password policy: that governs
// choosing a password, and applying it here would both annoy existing admins
// and advertise the rule to anyone probing the form.
const schema = z.object({
  email: z.string().min(1, "Enter your email address").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export function LoginPage() {
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formError, setFormError] = useState(null);
  const [lockedFor, setLockedFor] = useState(0);
  const remaining = useCountdown(lockedFor);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const destination = location.state?.from?.pathname ?? "/";

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => api.post("/auth/admin/login", values, { auth: false }),
    onSuccess: (session) => {
      queryClient.clear(); // nothing from a previous admin should survive
      setSession(session);
      navigate(destination, { replace: true });
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      // While locked out the API returns 429 even for the correct password —
      // that is the only way a client can tell "wait" from "wrong" (§7.2).
      if (error.code === ErrorCode.RATE_LIMITED) {
        setLockedFor(error.retryAfter ?? 30 * 60);
        setFormError(null);
        return;
      }

      if (error.code === ErrorCode.VALIDATION_ERROR && error.details.length) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        return;
      }

      // The API answers every failed credential the same way so the form cannot
      // be used to discover which addresses are registered. Mirror that here.
      setFormError("Email or password is incorrect.");
    },
  });

  if (status === "authenticated") return <Navigate to={destination} replace />;

  const lockedOut = remaining > 0;

  function onSubmit(values) {
    setFormError(null);
    mutate(values);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="rounded-xl bg-surface p-8 shadow-card">
          <p className="text-eyebrow uppercase text-brand">Rajdhani Food Products</p>
          <h1 className="mt-2 text-xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Use the credentials issued to you by a Super Admin.
          </p>
          <div className="mt-5 h-1 w-12 rounded-full bg-gold" />

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
            <Field
              label="Email address"
              type="email"
              autoComplete="username"
              placeholder="you@rajdhanifood.com"
              required
              autoFocus
              disabled={isPending || lockedOut}
              error={errors.email?.message}
              {...register("email")}
            />

            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••"
              required
              disabled={isPending || lockedOut}
              error={errors.password?.message}
              {...register("password")}
            />

            {lockedOut ? (
              <p role="alert" className="rounded-md bg-warning-tint p-3 text-sm text-warning">
                Too many failed attempts. Try again in {formatWait(remaining)}.
              </p>
            ) : formError ? (
              <p role="alert" className="rounded-md bg-danger-tint p-3 text-sm text-danger">
                {formError}
              </p>
            ) : null}

            <Button type="submit" size="lg" loading={isPending} disabled={lockedOut}>
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-ink-muted">
          Lost your password? Ask a Super Admin to send you a reset link.
        </p>
      </div>
    </main>
  );
}
