"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Lock, Mail, Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { FormField } from "@/components/ui/FormField";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        setFieldErrors(err.errors);
      } else {
        setErrorMessage("Unexpected error signing in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail("admin@truckops.local");
    setPassword("password");
    setErrorMessage(null);
    setFieldErrors({});
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 sm:p-8 shadow-sm"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Truck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">TruckOps</h1>
            <p
              className="text-sm"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Single-Operator Hauling & Payroll Console
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            className="mb-5 p-3.5 rounded-lg border flex items-start gap-2.5 text-sm"
            style={{
              backgroundColor: "var(--color-destructive-subtle)",
              borderColor: "var(--color-destructive)",
              color: "var(--color-destructive)",
            }}
            role="alert"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Operator Email"
            htmlFor="login-email"
            required
            error={fieldErrors.email?.[0]}
          >
            <div className="relative">
              <Mail
                className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-muted-foreground)" }}
                aria-hidden="true"
              />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@truckops.local"
                className="w-full min-h-[44px] pl-10 pr-3.5 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-fg)",
                }}
              />
            </div>
          </FormField>

          <FormField
            label="Password"
            htmlFor="login-password"
            required
            error={fieldErrors.password?.[0]}
          >
            <div className="relative">
              <Lock
                className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-muted-foreground)" }}
                aria-hidden="true"
              />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full min-h-[44px] pl-10 pr-12 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-fg)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 inline-flex items-center justify-center rounded hover:bg-slate-100"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] px-4 rounded-md text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--button-bg)" }}
          >
            {submitting ? "Signing in..." : "Sign In to TruckOps"}
          </button>
        </form>

        <div
          className="mt-5 pt-4 border-t flex items-center justify-between gap-2 text-xs"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-muted-foreground)",
          }}
        >
          <span>Seeded local operator account</span>
          <button
            type="button"
            onClick={fillDemo}
            className="min-h-[36px] px-2.5 rounded border font-medium hover:bg-slate-50"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-primary)",
            }}
          >
            Fill Demo Login
          </button>
        </div>
      </div>
    </div>
  );
}
