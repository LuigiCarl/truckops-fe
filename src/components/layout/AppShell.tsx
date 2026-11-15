"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Route,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "Trips & Verification", icon: Route },
  { href: "/trucks", label: "Trucks", icon: Truck },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/collections", label: "AB Collections", icon: Banknote },
  { href: "/payroll", label: "Payroll & Advances", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports & Exports", icon: FileBarChart2 },
];

export function AppShell({
  title,
  subtitle,
  actions,
  hidePrintHeader = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  hidePrintHeader?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div
          className="px-6 py-4 rounded-lg border text-sm font-medium"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            color: "var(--color-muted-foreground)",
          }}
        >
          Verifying TruckOps operator session...
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div
        className="h-16 px-5 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span
            className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Truck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <span className="text-lg font-bold tracking-tight block leading-none">
              TruckOps
            </span>
            <span
              className="text-[11px] font-medium block mt-0.5"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              AB Hauling Console
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden inline-flex items-center justify-center h-11 w-11 rounded-md hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="min-h-[44px] px-3.5 rounded-md flex items-center gap-3 text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive
                  ? "var(--sidebar-active-bg)"
                  : "transparent",
                color: isActive
                  ? "var(--sidebar-active-fg)"
                  : "var(--sidebar-fg)",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="p-4 border-t shrink-0 space-y-3"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div className="px-2">
          <p className="text-sm font-semibold truncate">{user.name}</p>
          <p
            className="text-xs truncate"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {user.email}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full min-h-[44px] px-3.5 rounded-md border flex items-center justify-center gap-2 text-sm font-medium transition-colors hover:bg-slate-50"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-foreground)",
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex overflow-x-hidden print:min-h-0 print:overflow-visible"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col border-r print:hidden"
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative w-72 max-w-[85vw] h-full border-r shadow-xl z-10"
            style={{
              backgroundColor: "var(--sidebar-bg)",
              borderColor: "var(--sidebar-border)",
            }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0 print:w-full print:pl-0">
        <header
          className="app-shell-header sticky top-0 z-30 border-b px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 print:hidden"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-md border hover:bg-slate-50 shrink-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p
                  className="text-xs sm:text-sm line-clamp-1 sm:truncate"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="w-full sm:w-auto flex items-center gap-2 [&>*]:w-full sm:[&>*]:w-auto">
              {actions}
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 print:p-0 print:max-w-none print:m-0 print:space-y-0">
          {!hidePrintHeader && (
            <div className="hidden print:block pb-2 mb-3 border-b-2 border-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    TruckOps Logistics Operations • Asia Brewery Logistics
                  </p>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <span className="inline-block px-2 py-0.5 border border-slate-400 rounded font-bold uppercase tracking-wider text-[9px] text-slate-700">
                    Official Document
                  </span>
                  <p className="text-[11px] mt-1 tabular-nums">
                    Printed:{" "}
                    {new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
