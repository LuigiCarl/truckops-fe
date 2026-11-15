"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  hideInPrint?: boolean;
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = "max-w-xl",
  hideInPrint = false,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-[2px] ${
        hideInPrint
          ? "print:hidden"
          : "print:static print:inset-auto print:p-0 print:bg-transparent print:backdrop-blur-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] flex flex-col border shadow-xl ${
          hideInPrint
            ? ""
            : "print:max-h-none print:w-full print:max-w-none print:border-none print:shadow-none print:rounded-none"
        }`}
        style={{
          backgroundColor: "var(--color-card)",
          color: "var(--color-card-foreground)",
          borderColor: "var(--color-border)",
          borderRadius: "var(--primitive-radius-xl)",
        }}
      >
        <div
          className="flex items-start justify-between gap-4 px-4 sm:px-6 py-3.5 sm:py-4 border-b print:px-0 print:py-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div>
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            {subtitle && (
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex items-center justify-center h-11 w-11 rounded-md transition-colors hover:bg-slate-100 shrink-0 print:hidden"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
}
