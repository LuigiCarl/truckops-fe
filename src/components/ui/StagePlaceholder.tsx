"use client";

import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export function StagePlaceholder({
  title,
  subtitle,
  endpoints,
}: {
  title: string;
  subtitle: string;
  endpoints: string[];
}) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <div
        className="rounded-lg border p-6 sm:p-8 max-w-2xl"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="h-11 w-11 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: "var(--color-info-subtle)",
              color: "var(--color-primary)",
            }}
          >
            <Layers className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Scheduled for Stage B</h2>
            <p
              className="text-sm"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Backend API routes are ready and tested; UI module builds next.
            </p>
          </div>
        </div>

        <div
          className="mt-4 p-4 rounded-md border text-xs font-mono space-y-1"
          style={{
            backgroundColor: "var(--color-background)",
            borderColor: "var(--color-border)",
            color: "var(--color-muted-foreground)",
          }}
        >
          {endpoints.map((ep) => (
            <div key={ep}>{ep}</div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/trips"
            className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-medium border"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-foreground)",
            }}
          >
            Go to Trips & Verification
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
