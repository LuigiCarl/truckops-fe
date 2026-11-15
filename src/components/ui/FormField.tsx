"use client";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium flex items-center gap-1"
        style={{ color: "var(--color-foreground)" }}
      >
        <span>{label}</span>
        {required && (
          <span style={{ color: "var(--color-destructive)" }} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p
          className="text-xs font-medium"
          style={{ color: "var(--color-destructive)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
